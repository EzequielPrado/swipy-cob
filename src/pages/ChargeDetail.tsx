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
  CreditCard as CardIcon, 
  Loader2,
  QrCode,
  ExternalLink,
  FileText,
  Mail
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
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #f97316;">Sua fatura está disponível</h2>
              <p>Olá, <strong>${charge.customers.name}</strong>,</p>
              <p>Uma nova cobrança no valor de <strong>R$ ${charge.amount.toFixed(2)}</strong> foi gerada.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #64748b;">Vencimento: ${new Date(charge.due_date).toLocaleDateString('pt-BR')}</p>
                <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">R$ ${charge.amount.toFixed(2)}</p>
              </div>
              <a href="${charge.payment_link}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Pagar Agora</a>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">ID da Cobrança: ${charge.woovi_id}</p>
            </div>
          `
        })
      });

      if (!response.ok) throw new Error("Erro ao reenviar e-mail");
      showSuccess("E-mail reenviado com sucesso!");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = () => {
    // Simulação de geração de PDF via impressão do navegador
    window.print();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 print:p-0">
        <div className="flex items-center gap-4 print:hidden">
          <Link to="/cobrancas" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Detalhes da Fatura</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-zinc-500 text-sm">ID: <span className="text-zinc-300 font-mono text-xs uppercase">{charge.woovi_id || charge.id.slice(0, 8)}</span></span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                charge.status === 'pago' ? "text-emerald-400" : 
                charge.status === 'atrasado' ? "text-red-400" : "text-orange-400"
              )}>
                {charge.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
              <div className="flex justify-between border-b border-zinc-800 pb-8 mb-8">
                <div>
                  <p className="text-zinc-500 text-sm mb-1 uppercase tracking-widest font-bold">Valor Total</p>
                  <h3 className="text-4xl font-bold text-orange-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-sm mb-1 uppercase tracking-widest font-bold">Vencimento</p>
                  <p className="text-xl font-semibold text-zinc-100">
                    {new Date(charge.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  {charge.status === 'atrasado' && (
                    <p className="text-red-400 text-xs mt-1 font-bold flex items-center justify-end gap-1">
                      <AlertCircle size={12} /> Pagamento em atraso
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6">Dados do Pagador</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-zinc-600 font-bold uppercase">Nome</p>
                      <p className="text-sm font-medium text-zinc-200">{charge.customers.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600 font-bold uppercase">E-mail</p>
                      <p className="text-sm font-medium text-zinc-200">{charge.customers.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600 font-bold uppercase">CPF/CNPJ</p>
                      <p className="text-sm font-medium text-zinc-200 font-mono">{charge.customers.tax_id}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-center text-center gap-4">
                  <QrCode size={48} className="text-zinc-700" />
                  <div>
                    <p className="text-sm font-bold text-zinc-300">Link de Pagamento Woovi</p>
                    <p className="text-xs text-zinc-500 mt-1">O QR Code e instruções ficam no link oficial.</p>
                  </div>
                  <a 
                    href={charge.payment_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-orange-500/10 text-orange-500 text-xs font-bold py-3 rounded-xl border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                  >
                    Abrir Página de Pagamento <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="font-bold text-zinc-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                <RefreshCcw size={16} className="text-orange-500" /> Histórico da Cobrança
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-zinc-300">Cobrança gerada via {charge.method.toUpperCase()}</p>
                      <p className="text-[10px] text-zinc-500">ID Woovi: {charge.woovi_id || 'N/A'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 font-mono">{new Date(charge.created_at).toLocaleString('pt-BR')}</span>
                </div>
                
                {charge.status === 'pago' && (
                  <div className="flex justify-between items-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-zinc-950" />
                      </div>
                      <p className="text-sm font-bold text-emerald-400">Pagamento confirmado</p>
                    </div>
                    <span className="text-xs text-emerald-500/50 font-mono">Realizado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lateral - Ações Adm */}
          <div className="space-y-6 print:hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-200 mb-6 text-xs uppercase tracking-widest">Ações Administrativas</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleResendEmail}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {actionLoading === 'email' ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} className="text-zinc-500 group-hover:text-orange-400" />}
                    <span className="text-sm font-semibold">Reenviar E-mail</span>
                  </div>
                </button>

                <button 
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-zinc-500 group-hover:text-orange-400" />
                    <span className="text-sm font-semibold">Gerar PDF / Recibo</span>
                  </div>
                </button>

                <div className="pt-3 mt-3 border-t border-zinc-800">
                  <button 
                    onClick={handleMarkAsPaid}
                    disabled={charge.status === 'pago' || !!actionLoading}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-lg",
                      charge.status === 'pago' 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed" 
                        : "bg-orange-500 text-zinc-950 hover:bg-orange-600 shadow-orange-500/10"
                    )}
                  >
                    {actionLoading === 'paid' ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {charge.status === 'pago' ? "Cobrança já paga" : "Marcar como Pago"}
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center mt-3 leading-relaxed">
                    A marcação manual deve ser feita apenas em casos de recebimento offline ou erro na conciliação automática.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Send size={14} className="text-orange-500" />
                <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Régua Automática</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Esta cobrança está configurada para receber notificações de lembrete via e-mail e WhatsApp <strong>D-2</strong> e <strong>D+1</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilo para impressão simplificada (PDF) */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .bg-zinc-900, .bg-zinc-950 { background: white !important; border: 1px solid #ddd !important; }
          .text-zinc-100, .text-zinc-200, .text-zinc-300 { color: black !important; }
          .text-zinc-400, .text-zinc-500, .text-zinc-600 { color: #666 !important; }
          .text-orange-400, .text-orange-500 { color: #f97316 !important; }
          aside, header, .print-hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .shadow-xl, .shadow-lg { shadow: none !important; }
        }
      `}</style>
    </AppLayout>
  );
};

export default ChargeDetail;