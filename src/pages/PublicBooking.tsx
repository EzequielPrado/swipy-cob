"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wrench, Loader2, CheckCircle2, User, Phone, FileText, 
  Package, ArrowRight, ShieldCheck, AlertCircle, MapPin, Globe, Check, Users, Upload, X, File
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
    name: '', taxId: '', phone: '', email: '', title: '', equipment: '', description: '',
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
      
      // 1. Verificar/Criar Cliente
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
            tax_id: cleanTaxId,
            email: formData.email,
            phone: formData.phone,
            status: 'em dia'
          })
          .select().single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      // 2. Upload do Arquivo (se houver)
      let fileUrl = null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${merchant.id}/os_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos') // Usando bucket existente para garantir permissão
          .upload(fileName, selectedFile);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
          fileUrl = publicUrl;
        }
      }

      // 3. Criar a Ordem de Serviço
      const { data: os, error: osErr } = await supabase
        .from('service_orders')
        .insert({
          user_id: merchant.id,
          customer_id: customerId,
          title: formData.title,
          equipment_info: formData.equipment,
          description: formData.description + (fileUrl ? `\n\n[Anexo enviado pelo cliente: ${fileUrl}]` : ''),
          status: 'aberto',
          origin: 'web',
          is_intermediary: isIntermediary,
          final_customer_name: isIntermediary ? formData.finalCustomerName : null,
          final_customer_phone: isIntermediary ? formData.finalCustomerPhone : null
        })
        .select().single();

      if (osErr) throw osErr;

      // 4. Notificar o Lojista
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

  if (loading) return <div className="min-h-screen bg-apple-light flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  if (successData) return (
    <div className="min-h-screen bg-apple-light flex items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-apple-white border border-apple-border rounded-[3rem] p-10 shadow-xl animate-in zoom-in duration-500 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100"><CheckCircle2 className="text-emerald-500" size={40} /></div>
        <h2 className="text-2xl font-black text-apple-black mb-2">Recebemos seu pedido!</h2>
        <p className="text-apple-muted font-medium mb-10 leading-relaxed">Sua solicitação de **{successData.title}** foi registrada com sucesso.</p>
        <div className="bg-apple-offWhite p-6 rounded-2xl border border-apple-border mb-10 shadow-inner">
           <p className="text-[10px] font-black uppercase text-apple-muted mb-1 tracking-widest">Protocolo</p>
           <p className="text-3xl font-mono font-bold text-apple-black uppercase tracking-tighter">#{successData.id.split('-')[0]}</p>
        </div>
        <button onClick={() => window.location.reload()} className="w-full bg-apple-black text-white font-black py-5 rounded-2xl shadow-xl hover:bg-zinc-800">FECHAR</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-light text-apple-black flex flex-col items-center py-12 px-6 font-sans">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-3 mb-6">
            {merchant.logo_url ? <img src={merchant.logo_url} className="h-10 w-auto" /> : <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black">{merchant.company.charAt(0)}</div>}
            <span className="text-2xl font-black tracking-tight">{merchant.company}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-4">Solicitar Assistência</h1>
          <p className="text-apple-muted font-medium italic">Preencha os detalhes abaixo para abrirmos seu chamado técnico.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-apple-white border border-apple-border rounded-[3rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-8 duration-1000">
           <div className="h-2 w-full bg-orange-500"></div>
           <div className="p-8 md:p-12 space-y-10">
              <div className="space-y-8">
                 <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2"><User size={14} /> 1. Identificação</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">CPF ou CNPJ</label>
                       <input required value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">Nome Completo / Loja</label>
                       <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Como devemos lhe chamar?" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">WhatsApp</label>
                       <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">E-mail</label>
                       <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Para acompanhar a OS" />
                    </div>
                 </div>

                 <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3"><Users size={20} className="text-orange-500" /><div><p className="text-sm font-bold text-apple-black">Solicitar para cliente final?</p><p className="text-[10px] text-apple-muted font-medium">Ative se você for uma loja parceira.</p></div></div>
                       <Switch checked={isIntermediary} onCheckedChange={setIsIntermediary} className="data-[state=checked]:bg-orange-500" />
                    </div>
                    {isIntermediary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                         <div className="space-y-2"><label className="text-xs font-bold text-orange-600 ml-1">Nome do Cliente Final</label><input required={isIntermediary} value={formData.finalCustomerName} onChange={e => setFormData({...formData, finalCustomerName: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3.5 text-sm outline-none" /></div>
                         <div className="space-y-2"><label className="text-xs font-bold text-orange-600 ml-1">WhatsApp Final</label><input value={formData.finalCustomerPhone} onChange={e => setFormData({...formData, finalCustomerPhone: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3.5 text-sm outline-none" /></div>
                      </div>
                    )}
                 </div>
              </div>

              <div className="space-y-8 pt-6 border-t border-apple-border">
                 <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2"><Wrench size={14} /> 2. Detalhes do Serviço</h3>
                 <div className="space-y-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-apple-muted ml-1">O que precisa ser feito?</label><input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none font-bold" placeholder="Ex: Tela quebrada, não liga..." /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-apple-muted ml-1">Equipamento (Marca/Modelo)</label><input value={formData.equipment} onChange={e => setFormData({...formData, equipment: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none" placeholder="Ex: iPhone 13 Pro" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-apple-muted ml-1">Relato detalhado do problema</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none min-h-[120px]" placeholder="Conte-nos o que está acontecendo..." /></div>
                 </div>

                 {/* UPLOAD DE ANEXO */}
                 <div className="space-y-3">
                    <label className="text-xs font-bold text-apple-muted ml-1">Anexar Imagem ou PDF (Opcional)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed border-apple-border rounded-3xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-orange-500 group bg-apple-offWhite",
                        selectedFile && "border-emerald-500 bg-emerald-50/30"
                      )}
                    >
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
                       
                       {selectedFile ? (
                         <div className="flex items-center gap-3 w-full justify-center">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"><File size={20} /></div>
                            <div className="text-left overflow-hidden">
                               <p className="text-xs font-black text-emerald-600 truncate max-w-[200px]">{selectedFile.name}</p>
                               <p className="text-[9px] text-emerald-500 font-bold uppercase">Pronto para envio</p>
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><X size={18} /></button>
                         </div>
                       ) : (
                         <>
                            <Upload className="text-apple-muted group-hover:text-orange-500 transition-colors" size={32} />
                            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest group-hover:text-orange-600">Clique para enviar anexo</p>
                         </>
                       )}
                    </div>
                 </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-3xl transition-all shadow-xl active:scale-95 disabled:opacity-50 text-base">
                {submitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> ENVIAR SOLICITAÇÃO</>}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default PublicBooking;