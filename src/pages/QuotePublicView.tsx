"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, FileText, ArrowRight, Mail, Package, Factory, Truck } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";

const QuotePublicView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchPublicQuote = async () => {
      try {
        const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/public-quote?id=${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setQuote(data.quote);
        setItems(data.items || []);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPublicQuote();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      // 1. Aprovar Orçamento (Apenas marca status como approved)
      const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/public-quote?id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      if (!res.ok) throw new Error("Falha ao processar aprovação.");

      // 2. Criar Cobrança Pix VINCULADA ao orcamento
      const chargeRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: quote.customer_id, 
          amount: quote.total_amount, 
          description: `Orçamento Aprovado #${quote.id.split('-')[0].toUpperCase()}`, 
          method: 'pix', 
          dueDate: new Date().toISOString().split('T')[0], 
          userId: quote.user_id, 
          origin: window.location.origin,
          quoteId: quote.id // Passando o ID do Orçamento aqui!
        })
      });
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) throw new Error(chargeData.error);

      showSuccess("Proposta aceita! Agora realize o pagamento para iniciarmos o processamento.");
      navigate(`/pagar/${chargeData.id}`);
    } catch (err: any) {
      showError(err.message);
      setApproving(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <div className="min-h-screen bg-apple-light flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  const isApproved = quote.status !== 'draft';
  const merchant = quote.profiles;

  return (
    <div className="min-h-screen bg-apple-light text-apple-black py-12 px-4 flex justify-center items-start font-sans">
      <div className="w-full max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            {merchant?.logo_url ? <img src={merchant.logo_url} className="h-12 w-auto object-contain" /> : <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border-2 border-orange-500 text-orange-500">{merchant?.company?.charAt(0)}</div>}
            <span className="text-2xl font-black tracking-tight">{merchant?.company || "Nossa Empresa"}</span>
          </div>
          <p className="text-apple-muted font-bold text-sm uppercase tracking-widest">Proposta Comercial #{quote.id.split('-')[0].toUpperCase()}</p>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[3rem] shadow-sm overflow-hidden">
          <div className="h-2 w-full bg-orange-500"></div>
          <div className="p-8 md:p-14">
            <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
              <div>
                <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-4">Cliente</p>
                <h3 className="text-2xl font-black text-apple-black">{quote.customers?.name}</h3>
                <div className="text-sm text-apple-muted mt-4 space-y-2 font-bold">
                  <p className="flex items-center gap-3"><Mail size={16} className="text-orange-500"/> {quote.customers?.email}</p>
                  <p className="flex items-center gap-3"><FileText size={16} className="text-orange-500"/> {quote.customers?.tax_id}</p>
                </div>
              </div>
              <div className="md:text-right">
                 <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-4">Status</p>
                 <span className={cn(
                   "inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", 
                   isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-apple-light text-apple-muted border-apple-border"
                 )}>
                   {isApproved ? 'Aprovado' : 'Aguardando Aprovação'}
                 </span>
                 <p className="text-sm font-bold text-apple-dark mt-4">Expira em: <span className="text-orange-500">{new Date(quote.expires_at).toLocaleDateString('pt-BR')}</span></p>
              </div>
            </div>

            <div className="border border-apple-border rounded-3xl overflow-hidden mb-12 shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black border-b border-apple-border">
                  <tr><th className="px-8 py-5">Item</th><th className="px-8 py-5 text-center">Qtd</th><th className="px-8 py-5 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          {item.products?.is_produced ? <Factory size={14} className="text-orange-500" /> : <Package size={14} className="text-blue-500" />}
                          <div>
                            <p className="font-bold text-apple-black">{item.products?.name}</p>
                            <p className="text-[10px] text-apple-muted font-medium">{item.products?.description || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center font-black">{item.quantity}</td>
                      <td className="px-8 py-5 text-right font-black">{currencyFormatter.format(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-apple-offWhite p-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-apple-border">
                <div className="text-left"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Total da Proposta</p><p className="text-5xl font-black text-apple-black tracking-tighter">{currencyFormatter.format(quote.total_amount)}</p></div>
              </div>
            </div>

            {!isApproved ? (
              <button onClick={handleApprove} disabled={approving} className="w-full px-16 py-6 rounded-3xl font-black text-white bg-orange-500 flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl disabled:opacity-50">
                {approving ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> ACEITAR E PAGAR</>}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-sm tracking-widest"><Truck size={20} /> Pedido Aprovado</div>
                <p className="text-emerald-700 text-xs font-medium">Iniciaremos o processamento assim que o pagamento for confirmado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotePublicView;