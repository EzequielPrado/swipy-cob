"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Send, 
  AlertCircle, 
  RefreshCcw, 
  Landmark, 
  Loader2,
  QrCode,
  ExternalLink,
  FileText,
  Mail,
  Copy,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const ChargeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charge, setCharge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchChargeDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('charges')
      .select('*, customers(*)')
      .eq('id', id)
      .single();

    if (error) {
      showError("Cobrança não encontrada");
      navigate('/cobrancas');
      return;
    }
    
    setCharge(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchChargeDetails();
  }, [id]);

  const internalPaymentLink = `${window.location.origin}/pagar/${id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(internalPaymentLink);
    showSuccess("Link de pagamento copiado!");
  };

  const handleMarkAsPaid = async () => {
    setActionLoading('paid');
    try {
      const { error } = await supabase
        .from('charges')
        .update({ status: 'pago' })
        .eq('id', id);

      if (error) throw error;
      showSuccess("Cobrança marcada como paga!");
      fetchChargeDetails();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendEmail = async () => {
    setActionLoading('email');
    try {
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: charge.customers.email,
          subject: `Fatura disponível: ${charge.customers.name}`,
          html: `<h1>Olá, ${charge.customers.name}</h1><p>Sua fatura de R$ ${charge.amount.toFixed(2)} está disponível.</p><a href="${internalPaymentLink}">Pagar Agora</a>`
        })
      });

      if (!response.ok) throw new Error("Erro ao enviar e-mail");
      showSuccess("E-mail reenviado com sucesso!");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 print:p-0">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link to="/cobrancas" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Gestão da Cobrança</h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase font-mono">{charge.woovi_id || charge.id}</p>
            </div>
          </div>
          <div className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border",
            charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
          )}>
            {charge.status}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Resumo da Fatura */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <DollarSign size={120} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-6">
                  <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Valor da Cobrança</p>
                    <h3 className="text-4xl font-bold text-zinc-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Vencimento</p>
                      <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <Calendar size={14} className="text-orange-500" />
                        {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Método</p>
                      <p className="text-sm font-semibold text-zinc-300 uppercase">{charge.method}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  {charge.pix_qr_image_base64 ? (
                    <img src={charge.pix_qr_image_base64} alt="QR Code" className="w-32 h-32 mb-4 bg-white p-2 rounded-lg" />
                  ) : (
                    <QrCode size={48} className="text-zinc-800 mb-4" />
                  )}
                  <p className="text-xs font-bold text-zinc-400 mb-4">Link de Pagamento Ativo</p>
                  <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 bg-orange-500 text-zinc-950 text-[10px] font-bold py-2.5 rounded-lg hover:bg-orange-600 transition-all">
                    COPIAR LINK <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline / Histórico */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="font-bold text-zinc-200 mb-8 flex items-center gap-2 text-sm uppercase tracking-widest">
                <RefreshCcw size={16} className="text-orange-500" /> Histórico de Atualizações
              </h3>
              
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-zinc-800">
                {/* Evento: Criação */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Clock size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-800 bg-zinc-950/30">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-zinc-200 text-sm">Cobrança Criada</div>
                      <time className="font-mono text-[10px] text-zinc-500">{new Date(charge.created_at).toLocaleString('pt-BR')}</time>
                    </div>
                    <div className="text-zinc-500 text-xs text-left">Fatura gerada via sistema para {charge.customers.name}.</div>
                  </div>
                </div>

                {/* Evento: Pagamento (se houver) */}
                {charge.status === 'pago' && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-emerald-400 text-sm">Pagamento Confirmado</div>
                        <time className="font-mono text-[10px] text-emerald-500/50">Concluído</time>
                      </div>
                      <div className="text-emerald-500/60 text-xs text-left">O valor foi identificado e a fatura liquidada.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 print:hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-200 mb-6 text-xs uppercase tracking-widest">Painel Administrativo</h3>
              <div className="space-y-3">
                <button onClick={handleResendEmail} disabled={!!actionLoading} className="w-full flex items-center justify-between p-3.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl transition-all border border-zinc-700/50">
                  <div className="flex items-center gap-3">
                    {actionLoading === 'email' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} className="text-zinc-500" />}
                    <span className="text-sm font-semibold">Notificar Cliente</span>
                  </div>
                </button>
                <button onClick={() => window.print()} className="w-full flex items-center justify-between p-3.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl transition-all border border-zinc-700/50">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-zinc-500" />
                    <span className="text-sm font-semibold">Exportar PDF</span>
                  </div>
                </button>
                <div className="pt-4 mt-4 border-t border-zinc-800">
                  <button onClick={handleMarkAsPaid} disabled={charge.status === 'pago' || !!actionLoading} className={cn("w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2", charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-orange-500 text-zinc-950 hover:bg-orange-600 shadow-lg shadow-orange-500/10")}>
                    {actionLoading === 'paid' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {charge.status === 'pago' ? "Cobrança Paga" : "Confirmar Recebimento"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Dados do Cliente</h4>
              <div className="space-y-3">
                <div className="text-xs">
                  <span className="text-zinc-600 block mb-0.5">Nome/Razão</span>
                  <span className="text-zinc-200 font-medium">{charge.customers.name}</span>
                </div>
                <div className="text-xs">
                  <span className="text-zinc-600 block mb-0.5">E-mail</span>
                  <span className="text-zinc-200 font-medium">{charge.customers.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChargeDetail;