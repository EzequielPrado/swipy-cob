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
  Send,
  Landmark
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ChargeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charge, setCharge] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

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

      const { data: accData } = await supabase.from('bank_accounts').select('id, name').eq('user_id', data.user_id);
      if (accData) setAccounts(accData);

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
    if (!selectedAccountId) return showError("Selecione a conta de destino.");
    
    setActionLoading('paid');
    try {
      // 1. Atualizar Saldo da Conta
      const { data: account } = await supabase.from('bank_accounts').select('balance').eq('id', selectedAccountId).single();
      if (account) {
        const newBalance = Number(account.balance || 0) + Number(charge.amount || 0);
        await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', selectedAccountId);
      }

      // 2. Marcar Cobrança como Paga
      const { error } = await supabase
        .from('charges')
        .update({ 
          status: 'pago', 
          bank_account_id: selectedAccountId 
        })
        .eq('id', id);

      if (error) throw error;
      
      await supabase.from('notification_logs').insert({
        charge_id: id,
        type: 'payment',
        status: 'success',
        message: 'A fatura foi recebida e marcada como PAGA pelo lojista.'
      });

      showSuccess("Recebimento registrado e saldo atualizado!");
      setIsPayModalOpen(false);
      await fetchChargeDetails(true);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
                    {currencyFormatter.format(charge.amount)}
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
                 <button 
                  onClick={() => setIsPayModalOpen(true)} 
                  disabled={charge.status === 'pago' || !!actionLoading} 
                  className={cn("w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
                 >
                    <CheckCircle2 size={16} />
                    {charge.status === 'pago' ? "Fatura Paga" : "Confirmar Recebimento"}
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px] rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3 font-bold tracking-tight">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={20} />
              </div>
              Baixar Recebimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center shadow-inner">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Valor Recebido</p>
              <p className="text-3xl font-black text-emerald-400">{currencyFormatter.format(charge?.amount)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Conta de Destino</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                  <SelectValue placeholder="Para qual conta o dinheiro foi?" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <button 
                onClick={handleMarkAsPaid}
                disabled={actionLoading === 'paid' || !selectedAccountId}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
              >
                {actionLoading === 'paid' ? <Loader2 className="animate-spin" size={20} /> : "CONFIRMAR BAIXA"}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ChargeDetail;