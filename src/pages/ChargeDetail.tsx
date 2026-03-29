"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Copy, Calendar, Trash2, Loader2, QrCode, FileText, Send, Landmark, CheckCircle2, Smartphone, Monitor, Tablet, ReceiptText } from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';

const ChargeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charge, setCharge] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Modais
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('charges').select('*, customers(*)').eq('id', id).single();
      if (error) { navigate('/financeiro/cobrancas'); return; }
      setCharge(data);
      const { data: logData } = await supabase.from('notification_logs').select('*').eq('charge_id', id).order('created_at', { ascending: false });
      setLogs(logData || []);
      const { data: accData } = await supabase.from('bank_accounts').select('id, name').eq('user_id', data.user_id);
      if (accData) setAccounts(accData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetails(); }, [id]);

  const handleMarkAsPaid = async () => {
    if (!selectedAccountId) return showError("Selecione a conta.");
    setActionLoading('paid');
    try {
      // 1. Atualizar Saldo do Banco
      const { data: account } = await supabase.from('bank_accounts').select('balance').eq('id', selectedAccountId).single();
      if (account) {
        await supabase.from('bank_accounts').update({ balance: Number(account.balance || 0) + Number(charge.amount || 0) }).eq('id', selectedAccountId);
      }
      
      // 2. Atualizar Status da Cobrança
      await supabase.from('charges').update({ status: 'pago', bank_account_id: selectedAccountId }).eq('id', id);
      
      // 3. SE HOUVER PEDIDO VINCULADO: Marcar pedido como PAGO para seguir o fluxo
      if (charge.quote_id) {
        await supabase.from('quotes').update({ status: 'paid' }).eq('id', charge.quote_id);
        console.log(`[manual-pay] Pedido ${charge.quote_id} sincronizado como pago.`);
      }

      // 4. Registrar Log
      await supabase.from('notification_logs').insert({ 
        charge_id: id, 
        type: 'payment', 
        status: 'success', 
        message: 'Fatura marcada como PAGA manualmente. Pedido sincronizado no fluxo.' 
      });

      showSuccess("Baixa realizada e pedido liberado no fluxo!"); 
      setIsPayModalOpen(false); 
      fetchDetails();
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setActionLoading(null); 
    }
  };

  const handleResendWhatsApp = async () => {
    setActionLoading('resend');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/resend-charge-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          chargeId: id,
          origin: window.location.origin
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      showSuccess("Cobrança reenviada via WhatsApp!");
      fetchDetails(); 
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getLogIcon = (log: any) => {
    if (log.type === 'payment') return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (log.type === 'whatsapp') return <Send size={16} className="text-blue-500" />;
    
    const msg = log.message.toLowerCase();
    if (msg.includes('ios') || msg.includes('iphone')) return <Smartphone size={16} className="text-orange-500" />;
    if (msg.includes('android')) return <Smartphone size={16} className="text-emerald-500" />;
    if (msg.includes('desktop')) return <Monitor size={16} className="text-blue-400" />;
    
    return <FileText size={16} className="text-orange-500" />;
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><Link to="/financeiro/cobrancas" className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm"><ArrowLeft size={20} /></Link><h2 className="text-2xl font-black text-apple-black tracking-tight">Auditando Cobrança</h2></div>
          <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm", charge.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-orange-50 text-orange-600 border-orange-100")}>{charge.status}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><QrCode size={140} /></div>
               <div className="flex flex-col md:flex-row justify-between gap-10">
                 <div>
                    <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Valor Total</p>
                    <p className="text-5xl font-black text-apple-black tracking-tighter">{currency.format(charge.amount)}</p>
                    <div className="mt-8 space-y-3">
                       <p className="text-sm font-bold text-apple-dark flex items-center gap-2"><Calendar size={16} className="text-orange-500" /> Vence em {new Date(charge.due_date).toLocaleDateString('pt-BR')}</p>
                       <p className="text-xs text-apple-muted font-medium bg-apple-offWhite p-3 rounded-xl border border-apple-border italic">{charge.description || 'Sem descrição'}</p>
                    </div>
                 </div>
                 <div className="bg-apple-offWhite border border-apple-border p-6 rounded-3xl flex flex-col items-center justify-center text-center max-w-[220px]">
                    {charge.pix_qr_image_base64 ? <img src={charge.pix_qr_image_base64} className="w-32 h-32 mb-4 bg-white p-2 rounded-xl shadow-sm" /> : <QrCode size={48} className="text-apple-muted opacity-20 mb-4" />}
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/pagar/${charge.id}`); showSuccess("Link copiado!"); }} className="w-full bg-orange-500 text-white text-[9px] font-black py-2.5 rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95">Copiar Checkout</button>
                 </div>
               </div>
            </div>

            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm">
               <h3 className="text-xs font-black text-apple-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><Clock size={16} className="text-orange-500" /> Histórico de Eventos</h3>
               <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-4 p-5 bg-apple-offWhite border border-apple-border rounded-2xl group hover:border-orange-500/30 transition-all">
                       <div className="mt-1">
                         {getLogIcon(log)}
                       </div>
                       <div>
                         <p className={cn("text-sm font-bold", log.status === 'error' ? "text-red-500" : "text-apple-dark")}>{log.message}</p>
                         <p className="text-[10px] text-apple-muted font-medium mt-1 uppercase tracking-widest">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="space-y-8">
             <div className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm">
                <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Ficha do Cliente</p>
                <div className="space-y-4">
                   <div className="bg-apple-offWhite p-4 rounded-2xl border border-apple-border"><p className="text-[9px] font-bold text-apple-muted uppercase mb-1">Nome</p><p className="text-sm font-bold text-apple-black">{charge.customers.name}</p></div>
                   <div className="bg-apple-offWhite p-4 rounded-2xl border border-apple-border"><p className="text-[9px] font-bold text-apple-muted uppercase mb-1">E-mail</p><p className="text-sm font-bold text-apple-black truncate">{charge.customers.email}</p></div>
                </div>
                
                <div className="mt-8 pt-8 border-t border-apple-border space-y-3">
                   {charge.status === 'pago' ? (
                      <button 
                        onClick={() => setIsFiscalModalOpen(true)}
                        className="w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2 shadow-xl shadow-blue-600/10 active:scale-95"
                      >
                        <ReceiptText size={18} /> EMITIR NOTA FISCAL
                      </button>
                   ) : (
                     <>
                        {charge.method !== 'manual' && (
                          <button 
                            onClick={handleResendWhatsApp} 
                            disabled={!!actionLoading}
                            className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm bg-apple-offWhite text-apple-dark border border-apple-border hover:bg-apple-light flex items-center justify-center gap-2"
                          >
                            {actionLoading === 'resend' ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            REENVIAR WHATSAPP
                          </button>
                        )}

                        <button 
                          onClick={() => setIsPayModalOpen(true)} 
                          className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl bg-apple-black text-white hover:bg-zinc-800"
                        >
                          BAIXAR MANUALMENTE
                        </button>
                     </>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border"><DialogTitle className="text-xl font-black flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> Conciliação</DialogTitle></DialogHeader>
          <div className="p-8 space-y-6">
             <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center"><p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Lançar no caixa</p><p className="text-3xl font-black text-emerald-600">{currency.format(charge.amount)}</p></div>
             <div className="space-y-2"><Label className="text-xs font-bold text-apple-muted uppercase">Conta de Destino</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                   <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                   <SelectContent className="bg-apple-white border-apple-border">{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <DialogFooter><button onClick={handleMarkAsPaid} disabled={!selectedAccountId || !!actionLoading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl">{actionLoading === 'paid' ? <Loader2 className="animate-spin" /> : "CONFIRMAR RECEBIMENTO"}</button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <IssueInvoiceModal 
        isOpen={isFiscalModalOpen}
        onClose={() => setIsFiscalModalOpen(false)}
        onSuccess={fetchDetails}
        defaultData={charge ? {
          customerId: charge.customer_id,
          amount: charge.amount.toString(),
          description: charge.description || `Referente à cobrança #${charge.id.split('-')[0].toUpperCase()}`
        } : undefined}
      />
    </AppLayout>
  );
};

export default ChargeDetail;