"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Mail,
  Copy,
  Calendar,
  DollarSign,
  Trash2,
  XCircle,
  MessageSquare,
  Eye,
  Loader2,
  QrCode,
  FileText,
  Send
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const ChargeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charge, setCharge] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchChargeDetails = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('charges')
        .select('*, customers(*)')
        .eq('id', id)
        .single();

      if (error) {
        showError("Cobrança não encontrada");
        navigate('/financeiro/cobrancas');
        return;
      }
      
      setCharge(data);

      const { data: logData } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('charge_id', id)
        .order('created_at', { ascending: false });
      
      setLogs(logData || []);
    } catch (err: any) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChargeDetails();
  }, [id]);

  const internalPaymentLink = `${window.location.origin}/pagar/${id}`;

  const handleEmitInvoice = async () => {
    if (!confirm("Deseja emitir a Fatura Oficial via Woovi? O cliente receberá o PDF no WhatsApp.")) return;
    
    setActionLoading('invoice');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          chargeId: charge.id,
          customerId: charge.customer_id,
          amount: charge.amount,
          description: charge.description
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao emitir fatura");

      showSuccess("Fatura emitida e enviada via WhatsApp!");
      fetchChargeDetails(true);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async () => {
    setActionLoading('paid');
    try {
      const { error } = await supabase
        .from('charges')
        .update({ status: 'pago' })
        .eq('id', id);

      if (error) throw error;
      
      await supabase.from('notification_logs').insert({
        charge_id: id,
        type: 'payment',
        status: 'success',
        message: 'A fatura foi marcada como PAGA manualmente pelo lojista.'
      });

      showSuccess("Cobrança marcada como paga!");
      await fetchChargeDetails(true);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/financeiro/cobrancas" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-2xl font-bold tracking-tight">Gestão da Cobrança</h2>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={handleEmitInvoice}
              disabled={!!actionLoading}
              className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {actionLoading === 'invoice' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              Emitir Fatura / NF
            </button>
            <div className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border flex items-center",
              charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
            )}>
              {charge.status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Valor da Cobrança</p>
                  <h3 className="text-4xl font-bold text-zinc-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                  </h3>
                  <div className="mt-6 space-y-2">
                    <p className="text-sm text-zinc-400 flex items-center gap-2">
                      <Calendar size={14} className="text-orange-500" />
                      Vencimento: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-sm text-zinc-400">Descrição: {charge.description || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  {charge.pix_qr_image_base64 ? (
                    <img src={charge.pix_qr_image_base64} alt="QR Code" className="w-32 h-32 mb-4 bg-white p-2 rounded-lg shadow-lg" />
                  ) : (
                    <QrCode size={48} className="text-zinc-800 mb-4" />
                  )}
                  <button onClick={() => { navigator.clipboard.writeText(internalPaymentLink); showSuccess("Link copiado!"); }} className="w-full flex items-center justify-center gap-2 bg-orange-500 text-zinc-950 text-[10px] font-bold py-2.5 rounded-lg hover:bg-orange-600 transition-all">
                    COPIAR LINK <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="font-bold text-zinc-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                <Clock size={16} className="text-orange-500" /> Linha do Tempo
              </h3>
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-4 bg-zinc-950/30 border border-zinc-800 rounded-xl">
                    <div className="mt-1">
                      {log.type === 'system' ? <FileText size={16} className="text-orange-400" /> : <MessageSquare size={16} className="text-emerald-400" />}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200">{log.message}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Dados do Pagador</h4>
              <div className="space-y-3">
                <div className="text-xs">
                  <span className="text-zinc-600 block mb-0.5">Nome</span>
                  <span className="text-zinc-200 font-medium">{charge.customers.name}</span>
                </div>
                <div className="text-xs">
                  <span className="text-zinc-600 block mb-0.5">E-mail</span>
                  <span className="text-zinc-200 font-medium">{charge.customers.email}</span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-zinc-800">
                 <button onClick={handleMarkAsPaid} disabled={charge.status === 'pago' || !!actionLoading} className={cn("w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}>
                    {actionLoading === 'paid' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {charge.status === 'pago' ? "Pago" : "Baixar Manual"}
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChargeDetail;