"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wrench, Loader2, CheckCircle2, User, Phone, FileText, 
  Package, ArrowRight, ShieldCheck, AlertCircle, MapPin, Globe
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";

const PublicBooking = () => {
  const { slug } = useParams();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    phone: '',
    email: '',
    title: '',
    equipment: '',
    description: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Identificar ou Criar Cliente para este Lojista
      const cleanTaxId = formData.taxId.replace(/\D/g, '');
      
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', merchant.id)
        .eq('tax_id', cleanTaxId)
        .single();

      if (!customer) {
        // Criar cliente lead automaticamente
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
        customer = newCust;
      }

      // 2. Criar a OS com origem 'web'
      const { data: os, error: osErr } = await supabase
        .from('service_orders')
        .insert({
          user_id: merchant.id,
          customer_id: customer.id,
          title: formData.title,
          equipment_info: formData.equipment,
          description: formData.description,
          status: 'aberto',
          origin: 'web'
        })
        .select().single();

      if (osErr) throw osErr;

      // 3. Log de Evento
      await supabase.from('notifications').insert({
        user_id: merchant.id,
        title: 'Nova OS via Portal!',
        message: `${formData.name} abriu um chamado para ${formData.title}.`,
        type: 'info'
      });

      setSuccessId(os.id);
      showSuccess("Ordem de serviço aberta com sucesso!");

    } catch (err: any) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-apple-light flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  if (successId) return (
    <div className="min-h-screen bg-apple-light flex items-center justify-center p-6 font-sans text-center">
      <div className="w-full max-w-md bg-apple-white border border-apple-border rounded-[3rem] p-10 shadow-xl animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
           <CheckCircle2 className="text-emerald-500" size={40} />
        </div>
        <h2 className="text-2xl font-black text-apple-black mb-2">Solicitação Enviada!</h2>
        <p className="text-apple-muted font-medium mb-8">Nossa equipe recebeu seu chamado e entrará em contato em breve.</p>
        
        <div className="bg-apple-offWhite p-6 rounded-2xl border border-apple-border mb-8">
           <p className="text-[10px] font-black uppercase text-apple-muted mb-1">Número do Protocolo</p>
           <p className="text-xl font-mono font-bold text-apple-black uppercase">#{successId.split('-')[0]}</p>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-apple-black text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-xl"
        >
          VOLTAR PARA O INÍCIO
        </button>
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
          <p className="text-apple-muted font-medium">Preencha os detalhes abaixo para abrirmos sua ordem de serviço junto à **{merchant.company}**.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-apple-white border border-apple-border rounded-[3rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-8 duration-1000">
           <div className="h-2 w-full bg-orange-500"></div>
           <div className="p-8 md:p-12 space-y-10">
              
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <User size={14} /> 1. Seus Dados de Contato
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">Nome Completo</label>
                       <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Como devemos te chamar?" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">CPF ou CNPJ</label>
                       <input required value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Apenas números" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">WhatsApp</label>
                       <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">E-mail</label>
                       <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Para notificações" />
                    </div>
                 </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-apple-border">
                 <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Wrench size={14} /> 2. Detalhes da Solicitação
                 </h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">O que precisa ser feito?</label>
                       <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" placeholder="Ex: Ajuste de armação, Troca de tela..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">Descrição do Equipamento (Modelo/Marca)</label>
                       <input value={formData.equipment} onChange={e => setFormData({...formData, equipment: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Ex: Rayban Aviador Preto" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-apple-muted ml-1">Relato do Problema / Observações</label>
                       <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[120px]" placeholder="Conte-nos mais detalhes para agilizarmos o orçamento..." />
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-orange-500/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 text-base"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> ENVIAR SOLICITAÇÃO</>}
              </button>
           </div>
        </form>

        <div className="mt-12 flex items-center justify-center gap-3 opacity-40">
           <ShieldCheck size={18} className="text-emerald-600" />
           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-apple-muted">Sistema Oficial de Ordens de Serviço da {merchant.company}</p>
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;