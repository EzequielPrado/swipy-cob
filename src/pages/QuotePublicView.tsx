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
        
        if (!res.ok) throw new Error(data.error || "Erro ao carregar orçamento.");
        
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
      // 1. Aprovar via Edge Function
      const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/public-quote?id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      if (!res.ok) throw new Error("Falha ao aprovar orçamento.");

      // 2. Gerar Cobrança (Pix) diretamente (usando o origin do sistema)
      const chargeRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: quote.customer_id,
          amount: quote.total_amount,
          description: `Orçamento Aprovado #${quote.id.split('-')[0].toUpperCase()}`,
          method: 'pix',
          dueDate: new Date().toISOString().split('T')[0], // Vencimento hoje
          userId: quote.user_id,
          origin: window.location.origin
        })
      });
      
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) throw new Error(chargeData.error || "Erro ao gerar link de pagamento.");

      showSuccess("Orçamento aprovado! Redirecionando para pagamento...");
      navigate(`/pagar/${chargeData.id}`);

    } catch (err: any) {
      showError(err.message);
      setApproving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!quote) return;
    const doc = new jsPDF();
    const merchant = quote.profiles;
    const customer = quote.customers;
    const primaryColor = merchant?.primary_color || '#f97316';
    
    // Converte hex para RGB para o jsPDF
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [249, 115, 22];
    };
    const rgbColor = hexToRgb(primaryColor);

    // Cabeçalho
    doc.setFontSize(24);
    doc.setTextColor(rgbColor[0], rgbColor[1], rgbColor[2]);
    doc.text("PROPOSTA COMERCIAL", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Cód: #${quote.id.split('-')[0].toUpperCase()}`, 14, 32);
    doc.text(`Data: ${new Date(quote.created_at).toLocaleDateString('pt-BR')} | Validade: ${new Date(quote.expires_at).toLocaleDateString('pt-BR')}`, 14, 38);

    // Emissor
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text("EMISSOR:", 14, 50);
    doc.setFontSize(10);
    doc.text(merchant?.company || merchant?.full_name || "Nossa Empresa", 14, 56);

    // Cliente
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text("CLIENTE:", 110, 50);
    doc.setFontSize(10);
    doc.text(customer?.name || "Cliente Excluído", 110, 56);
    doc.text(`CPF/CNPJ: ${customer?.tax_id || "-"}`, 110, 62);
    doc.text(`Email: ${customer?.email || "-"}`, 110, 68);

    // Tabela de Produtos
    const tableColumn = ["Item", "Descrição", "Qtd", "V. Unit", "Total"];
    const tableRows = items.map(item => [
      item.products?.name || 'Item Removido',
      item.products?.description || '-',
      item.quantity || 0,
      currencyFormatter.format(item.unit_price || 0),
      currencyFormatter.format(item.total_price || 0)
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      theme: 'striped',
      headStyles: { fillColor: rgbColor as any, textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 10 }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text(`VALOR TOTAL: ${currencyFormatter.format(quote.total_amount || 0)}`, 14, finalY + 15);

    doc.save(`Orcamento_${quote.id.split('-')[0]}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-500" size={40} />
      <p className="text-zinc-500 text-sm animate-pulse">Carregando proposta...</p>
    </div>
  );

  if (!quote) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <AlertTriangle size={32} className="text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-zinc-100">Orçamento não encontrado</h1>
      <p className="text-zinc-400 mt-2 max-w-xs">Verifique o link ou entre em contato com o emissor.</p>
    </div>
  );

  const merchant = quote.profiles;
  const merchantName = merchant?.company || merchant?.full_name || "Nossa Empresa";
  const primaryColor = merchant?.primary_color || '#f97316';
  const logoUrl = merchant?.logo_url;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 flex justify-center items-start">
      <div className="w-full max-w-3xl animate-in slide-in-from-bottom-8 duration-700">
        
        {/* Header Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={merchantName} className="h-12 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border-2" style={{ borderColor: primaryColor, color: primaryColor }}>
                {merchantName.charAt(0)}
              </div>
            )}
            <span className="text-2xl font-bold tracking-tight">{merchantName}</span>
          </div>
          <p className="text-zinc-400">Proposta Comercial #{quote.id.split('-')[0].toUpperCase()}</p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="h-2 w-full" style={{ backgroundColor: primaryColor }}></div>
          
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Para</p>
                <h3 className="text-xl font-bold text-zinc-100">{quote.customers?.name || "Cliente Excluído"}</h3>
                <div className="text-sm text-zinc-400 mt-2 space-y-1">
                  <p className="flex items-center gap-2"><Mail size={14}/> {quote.customers?.email || "-"}</p>
                  <p className="flex items-center gap-2"><Phone size={14}/> {quote.customers?.phone || 'N/A'}</p>
                  <p className="flex items-center gap-2"><FileText size={14}/> {quote.customers?.tax_id || "-"}</p>
                </div>
              </div>
              <div className="md:text-right">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Detalhes</p>
                 <p className="text-sm text-zinc-300">Data: {new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                 <p className="text-sm text-zinc-300">Validade: <span className="font-bold text-orange-400">{new Date(quote.expires_at).toLocaleDateString('pt-BR')}</span></p>
                 <span className={cn(
                    "inline-flex mt-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border",
                    quote.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                 )}>
                   {quote.status === 'approved' ? 'Orçamento Aprovado' : 'Aguardando Aprovação'}
                 </span>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-2xl overflow-hidden mb-10">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Produto / Serviço</th>
                    <th className="px-6 py-4 text-center">Qtd</th>
                    <th className="px-6 py-4 text-right">Unitário</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-sm">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-zinc-900/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-200">{item.products?.name || "Produto Removido"}</p>
                        <p className="text-xs text-zinc-500 mt-1">{item.products?.description || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-center text-zinc-400 font-mono">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-zinc-400">{currencyFormatter.format(item.unit_price)}</td>
                      <td className="px-6 py-4 text-right font-bold text-zinc-100">{currencyFormatter.format(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-zinc-950 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-zinc-800">
                <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors border border-zinc-800 text-sm font-bold"
                >
                  <Download size={16} /> Baixar PDF
                </button>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total a Pagar</p>
                  <p className="text-4xl font-black text-zinc-100">{currencyFormatter.format(quote.total_amount)}</p>
                </div>
              </div>
            </div>

            {quote.status !== 'approved' && (
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8 text-center space-y-6">
                <h4 className="text-xl font-bold text-zinc-100">Deseja prosseguir com a contratação?</h4>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  Ao aprovar, o estoque será reservado e você será direcionado para a tela de pagamento seguro via PIX.
                </p>
                <button 
                  onClick={handleApprove}
                  disabled={approving || !quote.customer_id}
                  className="w-full md:w-auto mx-auto px-12 py-5 rounded-2xl font-bold text-zinc-950 flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                  style={{ backgroundColor: primaryColor }}
                >
                  {approving ? <Loader2 className="animate-spin text-zinc-950" size={24} /> : (
                    <>
                      <CheckCircle2 size={24} /> APROVAR E PAGAR
                    </>
                  )}
                </button>
              </div>
            )}
            
            {quote.status === 'approved' && (
               <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 text-center text-emerald-400 font-bold flex flex-col items-center gap-2">
                 <CheckCircle2 size={32} />
                 <p>Este orçamento já foi aprovado e fechado.</p>
               </div>
            )}

          </div>
        </div>

        <div className="mt-8 text-center opacity-40">
           <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest">
             <ShieldCheck size={14} /> Transação Segura via Swipy ERP
           </p>
        </div>
      </div>
    </div>
  );
};

export default QuotePublicView;