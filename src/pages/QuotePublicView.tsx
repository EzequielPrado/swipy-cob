"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, FileText, Download, ArrowRight, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/public-quote?id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      if (!res.ok) throw new Error("Falha ao aprovar.");
      const chargeRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: quote.customer_id, amount: quote.total_amount, description: `Orçamento Aprovado #${quote.id.split('-')[0].toUpperCase()}`, method: 'pix', dueDate: new Date().toISOString().split('T')[0], userId: quote.user_id, origin: window.location.origin })
      });
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) throw new Error(chargeData.error);
      showSuccess("Orçamento aprovado! Redirecionando...");
      navigate(`/pagar/${chargeData.id}`);
    } catch (err: any) {
      showError(err.message);
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-apple-light flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-500" size={40} />
      <p className="text-apple-muted text-sm font-bold animate-pulse">Carregando proposta...</p>
    </div>
  );

  if (!quote) return (
    <div className="min-h-screen bg-apple-light flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100"><AlertTriangle size={32} className="text-red-500" /></div>
      <h1 className="text-xl font-bold text-apple-black">Orçamento não encontrado</h1>
    </div>
  );

  const merchant = quote.profiles;
  const merchantName = merchant?.company || merchant?.full_name || "Nossa Empresa";
  const primaryColor = merchant?.primary_color || '#f97316';
  const logoUrl = merchant?.logo_url;

  return (
    <div className="min-h-screen bg-apple-light text-apple-black py-12 px-4 flex justify-center items-start font-sans">
      <div className="w-full max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            {logoUrl ? <img src={logoUrl} alt={merchantName} className="h-12 w-auto object-contain" /> : <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border-2 shadow-sm" style={{ borderColor: primaryColor, color: primaryColor }}>{merchantName.charAt(0)}</div>}
            <span className="text-2xl font-black tracking-tight">{merchantName}</span>
          </div>
          <p className="text-apple-muted font-bold text-sm uppercase tracking-widest">Proposta Comercial #{quote.id.split('-')[0].toUpperCase()}</p>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[3rem] shadow-sm overflow-hidden">
          <div className="h-2 w-full" style={{ backgroundColor: primaryColor }}></div>
          <div className="p-8 md:p-14">
            <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
              <div>
                <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-4">Para o Cliente</p>
                <h3 className="text-2xl font-black text-apple-black">{quote.customers?.name || "Cliente"}</h3>
                <div className="text-sm text-apple-muted mt-4 space-y-2 font-bold">
                  <p className="flex items-center gap-3"><Mail size={16} className="text-orange-500"/> {quote.customers?.email || "-"}</p>
                  <p className="flex items-center gap-3"><FileText size={16} className="text-orange-500"/> {quote.customers?.tax_id || "-"}</p>
                </div>
              </div>
              <div className="md:text-right">
                 <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-4">Validade & Status</p>
                 <p className="text-sm font-bold text-apple-dark">Emissão: {new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                 <p className="text-sm font-bold text-apple-black mt-1">Expira em: <span className="text-orange-500">{new Date(quote.expires_at).toLocaleDateString('pt-BR')}</span></p>
                 <span className={cn("inline-flex mt-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", quote.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-apple-light text-apple-muted border-apple-border")}>{quote.status === 'approved' ? 'Aprovado e Fechado' : 'Aguardando sua Aprovação'}</span>
              </div>
            </div>

            <div className="border border-apple-border rounded-3xl overflow-hidden mb-12 shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.15em] border-b border-apple-border">
                  <tr><th className="px-8 py-5">Item / Descrição</th><th className="px-8 py-5 text-center">Qtd</th><th className="px-8 py-5 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-apple-white"><td className="px-8 py-5"><p className="font-bold text-apple-black">{item.products?.name || "Item"}</p><p className="text-xs text-apple-muted font-medium mt-1">{item.products?.description || '-'}</p></td><td className="px-8 py-5 text-center text-apple-dark font-black">{item.quantity}</td><td className="px-8 py-5 text-right font-black text-apple-black">{currencyFormatter.format(item.total_price)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-apple-offWhite p-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-apple-border">
                <div className="text-left w-full md:w-auto"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Valor Total da Proposta</p><p className="text-5xl font-black text-apple-black tracking-tighter">{currencyFormatter.format(quote.total_amount)}</p></div>
              </div>
            </div>

            {quote.status !== 'approved' && (
              <div className="bg-apple-offWhite border border-apple-border rounded-[2.5rem] p-10 text-center space-y-8 shadow-inner">
                <h4 className="text-xl font-black text-apple-black">Tudo certo com a proposta?</h4>
                <p className="text-apple-muted font-medium text-sm max-w-sm mx-auto">Ao aprovar, o estoque será reservado e você será direcionado para o pagamento seguro via PIX.</p>
                <button onClick={handleApprove} disabled={approving} className="w-full md:w-auto px-16 py-6 rounded-3xl font-black text-white flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                  {approving ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> APROVAR E PAGAR</>}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-12 text-center opacity-40"><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-apple-muted">Swipy Fintech LTDA • Pagamentos Seguros</p></div>
      </div>
    </div>
  );
};

export default QuotePublicView;