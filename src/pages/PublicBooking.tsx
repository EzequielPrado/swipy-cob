"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wrench, Loader2, CheckCircle2, User, Phone, FileText, 
  Package, ArrowRight, ShieldCheck, AlertCircle, MapPin, Globe, Check, Users, Upload, X, File,
  Smartphone, Mail, ClipboardList, Info, Paperclip
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const PublicBooking = () => {
  const { slug } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const [isIntermediary, setIsIntermediary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', taxId: '', phone: '', email: '', title: '', description: '',
    finalCustomerName: '', finalCustomerPhone: ''
  });

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        const { data, error } = await supabase.rpc('get_merchant_by_slug', { p_slug: slug });
        if (error || !data || data.length === 0) throw new Error("Empresa não localizada.");
        setMerchant(data[0]);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchMerchant();
  }, [slug]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError("O arquivo deve ter no máximo 5MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const cleanTaxId = formData.taxId.replace(/\D/g, '');
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', merchant.id)
        .eq('tax_id', cleanTaxId)
        .maybeSingle();

      let customerId;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase.from('customers').update({ phone: formData.phone, email: formData.email }).eq('id', customerId);
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            user_id: merchant.id,
            name: formData.name,
            tax_id: cleanTaxID,
            email: formData.email,
            phone: formData.phone,
            status: 'em dia'
          })
          .select().single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      let fileUrl = null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${merchant.id}/os_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, selectedFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
          fileUrl = publicUrl;
        }
      }

      const { data: os, error: osErr } = await supabase
        .from('service_orders')
        .insert({
          user_id: merchant.id,
          customer_id: customerId,
          title: formData.title,
          description: formData.description + (fileUrl ? `\n\n[Anexo enviado pelo cliente: ${fileUrl}]` : ''),
          status: 'aberto',
          origin: 'web',
          is_intermediary: isIntermediary,
          final_customer_name: isIntermediary ? formData.finalCustomerName : null,
          final_customer_phone: isIntermediary ? formData.finalCustomerPhone : null
        })
        .select().single();

      if (osErr) throw osErr;

      await supabase.from('notifications').insert({
        user_id: merchant.id,
        title: 'Novo Chamado via Portal',
        message: `${formData.name} abriu uma OS para ${formData.title}.`,
        type: 'info'
      });

      setSuccessData({ id: os.id, name: formData.name, title: formData.title });
      showSuccess("Solicitação registrada com sucesso!");

    } catch (err: any) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-orange-500" size={40} />
        <p className="text-apple-muted text-sm font-bold uppercase tracking-widest">Iniciando Portal...</p>
      </div>
    </div>
  );

  if (successData) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-apple-border rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-500 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: merchant.primary_color || '#f97316' }} />
        
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100">
          <CheckCircle2 className="text-emerald-500" size={40} />
        </div>
        
        <h2 className="text-3xl font-black text-apple-black mb-2 tracking-tighter">Pedido Enviado!</h2>
        <p className="text-[#86868B] font-medium leading-relaxed mb-10">Tudo certo, **{successData.name.split(' ')[0]}**. Sua solicitação foi recebida.</p>
        
        <div className="bg-[#F5F5F7] p-8 rounded-3xl border border-apple-border mb-10 shadow-inner relative">
           <div className="absolute top-4 right-4 opacity-5"><ClipboardList size={40} /></div>
           <p className="text-[10px] font-black uppercase text-[#86868B] mb-2 tracking-[0.2em]">Protocolo de Atendimento</p>
           <p className="text-4xl font-mono font-black text-apple-black uppercase tracking-tighter">#{successData.id.split('-')[0]}</p>
        </div>

        <button 
          onClick={() => window.location.reload()} 
          className="w-full bg-apple-black text-white font-black py-5 rounded-2xl shadow-xl hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          FECHAR E VOLTAR
        </button>
        
        <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest mt-8">Nossa equipe entrará em contato em breve.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center py-12 px-6 font-sans antialiased">
      <div className="w-full max-w-2xl">
        
        {/* CABEÇALHO DO PORTAL */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-3 mb-8 bg-white p-3 rounded-2xl shadow-sm border border-apple-border">
            {merchant.logo_url ? (
              <img src={merchant.logo_url} className="h-8 w-auto object-contain" alt="Logo" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: merchant.primary_color || '#f97316' }}>
                {merchant.company.charAt(0)}
              </div>
            )}
            <span className="text-lg font-black tracking-tighter">{merchant.company}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-apple-black leading-tight">Solicitar Atendimento.</h1>
          <p className="text-[#86868B] text-lg font-medium">Conte-nos o que precisa e nós cuidaremos do resto.</p>
        </div>

        {/* FORMULÁRIO MAGNÉTICO */}
        <form onSubmit={handleSubmit} className="bg-white border border-apple-border rounded-[3rem] overflow-hidden shadow-xl shadow-black/5 animate-in slide-in-from-bottom-8 duration-700">
           <div className="h-2 w-full" style={{ backgroundColor: merchant.primary_color || '#f97316' }}></div>
           
           <div className="p-8 md:p-14 space-y-12">
              
              {/* SEÇÃO 1: QUEM É VOCÊ */}
              <div className="space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: merchant.primary_color || '#f97316' }}>
                       <User size={20} />
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-apple-black leading-none">Sua Identificação</h3>
                       <p className="text-[11px] text-[#86868B] font-bold uppercase tracking-widest mt-1">Dados básicos de contato</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#86868B] ml-2">CPF ou CNPJ</label>
                       <input required value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-[#F5F5F7] border border-apple-border rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#86868B] ml-2">Nome Completo</label>
                       <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F5F5F7] border border-apple-border rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold" placeholder="Seu nome ou Razão Social" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#86868B] ml-2">WhatsApp</label>
                       <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#F5F5F7] border border-apple-border rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#86868B] ml-2">E-mail</label>
                       <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#F5F5F7] border border-apple-border rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold" placeholder="exemplo@email.com" />
                    </div>
                 </div>

                 {/* SWITCH INTERMEDIÁRIO */}
                 <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-[2rem] space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-orange-200 flex items-center justify-center text-orange-500 shadow-sm">
                             <Users size={24} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-apple-black">Solicitar para cliente final?</p>
                             <p className="text-[10px] text-orange-600/70 font-bold uppercase tracking-widest">Ideal para lojistas parceiros</p>
                          </div>
                       </div>
                       <Switch checked={isIntermediary} onCheckedChange={setIsIntermediary} className="data-[state=checked]:bg-orange-500" />
                    </div>
                    {isIntermediary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-2">Nome do Cliente Final</label>
                            <input required={isIntermediary} value={formData.finalCustomerName} onChange={e => setFormData({...formData, finalCustomerName: e.target.value})} className="w-full bg-white border border-orange-200 rounded-2xl px-5 py-4 text-sm outline-none" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-2">WhatsApp do Cliente Final</label>
                            <input value={formData.finalCustomerPhone} onChange={e => setFormData({...formData, finalCustomerPhone: e.target.value})} className="w-full bg-white border border-orange-200 rounded-2xl px-5 py-4 text-sm outline-none" />
                         </div>
                      </div>
                    )}
                 </div>
              </div>

              {/* SEÇÃO 2: DETALHES DO SERVIÇO */}
              <div className="space-y-8 pt-12 border-t border-apple-border">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: merchant.primary_color || '#f97316' }}>
                       <Wrench size={20} />
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-apple-black leading-none">O que precisa ser feito?</h3>
                       <p className="text-[11px] text-[#86868B] font-bold uppercase tracking-widest mt-1">Detalhes do chamado</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#86868B] ml-2">Assunto / Título</label>
                       <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#F5F5F7] border border-apple-border rounded-2xl px-5 py-4 text-sm outline-none font-black text-apple-black focus:ring-4 focus:ring-orange-500/10" placeholder="Ex: Ajuste de contrato, Dúvida técnica..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#86868B] ml-2">Descrição detalhada</label>
                       <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#F5F5F7] border border-apple-border rounded-[2rem] px-6 py-5 text-sm outline-none min-h-[150px] font-medium leading-relaxed" placeholder="Descreva aqui sua solicitação com o máximo de detalhes possível..." />
                    </div>
                 </div>

                 {/* UPLOAD DE ARQUIVO PREMIUM */}
                 <div className="space-y-3">
                    <label className="text-xs font-bold text-apple-black ml-2 flex items-center gap-2">
                       <Paperclip size={14} className="text-orange-500" /> Anexar arquivos ou documentos (Opcional)
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-orange-50 group",
                        selectedFile ? "border-emerald-500 bg-emerald-50/30" : "border-apple-border bg-[#F5F5F7]"
                      )}
                    >
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
                       
                       {selectedFile ? (
                         <div className="flex items-center gap-4 animate-in zoom-in duration-300">
                            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                               <File size={24} />
                            </div>
                            <div className="text-left overflow-hidden">
                               <p className="text-sm font-black text-emerald-600 truncate max-w-[200px]">{selectedFile.name}</p>
                               <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Arquivo pronto para envio</p>
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="p-3 text-red-500 hover:bg-red-100 rounded-full transition-colors"><X size={20} /></button>
                         </div>
                       ) : (
                         <>
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                               <Upload className="text-apple-muted group-hover:text-orange-500" size={32} />
                            </div>
                            <div className="text-center">
                               <p className="text-sm font-bold text-apple-black">Clique ou arraste um arquivo</p>
                               <p className="text-[10px] text-[#86868B] font-medium uppercase tracking-[0.15em] mt-1">Imagens ou PDF (Máx 5MB)</p>
                            </div>
                         </>
                       )}
                    </div>
                 </div>
              </div>

              {/* BOTÃO FINAL */}
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-6 rounded-[2rem] transition-all shadow-xl shadow-orange-500/20 active:scale-95 text-lg flex items-center justify-center gap-3"
                  style={{ backgroundColor: merchant.primary_color }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> ENVIAR SOLICITAÇÃO AGORA</>}
                </button>
                <div className="mt-8 flex items-center justify-center gap-2 text-[#86868B] opacity-50">
                   <ShieldCheck size={16} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Conexão Segura Swipy Intelligence</span>
                </div>
              </div>
           </div>
        </form>

        {/* RODAPÉ DO PORTAL */}
        <div className="mt-16 pt-8 border-t border-apple-border flex flex-col items-center gap-6 opacity-60 pb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868B] text-center">
            {merchant.company} — Tecnologia & Soluções Financeiras
          </p>
          <div className="flex gap-8 text-[9px] font-bold text-apple-muted uppercase tracking-widest">
             <Link to="/login" className="hover:text-apple-black transition-colors">Acesso Restrito</Link>
             <span className="cursor-default">Ajuda</span>
             <span className="cursor-default">Termos de Uso</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;