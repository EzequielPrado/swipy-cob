"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Truck, Loader2, Search, PackageCheck, Receipt, ArrowRight, User, Package, CheckCircle2, MapPin, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

const Shipping = () => {
  const { effectiveUserId } = useAuth(); // Usando effectiveUserId para consistência
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);
  const [shipData, setShipData] = useState({ carrier: '', trackingCode: '' });

  // Frenet Logistics states
  const [isFrenetModalOpen, setIsFrenetModalOpen] = useState(false);
  const [cepOrigem, setCepOrigem] = useState('01311-200');
  const [cepDestino, setCepDestino] = useState('');
  const [frenetQuotes, setFrenetQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const handleQuoteShipping = async (order: any) => {
    setSelectedOrder(order);
    const cleanCep = order.customers?.postal_code || '01310-100';
    setCepDestino(cleanCep);
    setIsFrenetModalOpen(true);
    setFrenetQuotes([]);
  };

  const executeFrenetQuote = async () => {
    setLoadingQuotes(true);
    try {
      const { data: frenetConn } = await supabase.from('integrations')
        .select('access_token')
        .eq('user_id', effectiveUserId)
        .eq('provider', 'frenet')
        .maybeSingle();

      const sellerCep = cepOrigem.replace(/\D/g, '');
      const recipientCep = cepDestino.replace(/\D/g, '');

      if (frenetConn?.access_token) {
        try {
          const response = await fetch(`https://api.frenet.com.br/shipping/quote`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': frenetConn.access_token
            },
            body: JSON.stringify({
              "SellerCEP": sellerCep,
              "RecipientCEP": recipientCep,
              "ShipmentInvoiceValue": selectedOrder?.total_amount || 100,
              "ShippingItemArray": [{
                "Weight": 1,
                "Length": 15,
                "Height": 10,
                "Width": 15,
                "Quantity": 1
              }]
            })
          });

          const data = await response.json();
          if (response.ok && data.ShippingSevicesArray && data.ShippingSevicesArray.length > 0) {
            const realQuotes = data.ShippingSevicesArray
              .filter((s: any) => !s.Error)
              .map((s: any, idx: number) => ({
                id: idx,
                carrier: `${s.Carrier} - ${s.ServiceDescription}`,
                price: parseFloat(s.ShippingPrice),
                time: `${s.DeliveryTime} dias`
              }));

            if (realQuotes.length > 0) {
              setFrenetQuotes(realQuotes);
              showSuccess("Fretes reais calculados!");
              return;
            }
          }
        } catch (apiErr) {
          console.warn("Frenet API offline ou token inválido, usando fallback:", apiErr);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockedQuotes = [
        { id: 1, carrier: "Correios - PAC", price: 18.90, time: "5 a 8 dias" },
        { id: 2, carrier: "Correios - SEDEX", price: 29.50, time: "1 a 3 dias" },
        { id: 3, carrier: "Jadlog - Package", price: 24.30, time: "4 dias" },
        { id: 4, carrier: "Loggi Express", price: 32.10, time: "2 dias" }
      ];
      setFrenetQuotes(mockedQuotes);
      showSuccess("Cotações simuladas carregadas!");
    } catch (err: any) {
      showError("Erro ao cotar frete: " + err.message);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleGenerateLabel = (quote: any) => {
    if (!selectedOrder) return;
    try {
      const doc = new jsPDF({ format: [100, 150] });
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 0, 100, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SWIPY LOGÍSTICA", 10, 10);
      doc.setDrawColor(200, 200, 200);
      doc.line(0, 15, 100, 15);
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.text(`ROTA: ${quote.carrier.toUpperCase()}`, 10, 25);
      doc.setFontSize(8);
      doc.text(`PEDIDO: #${selectedOrder.id.split('-')[0].toUpperCase()}`, 10, 32);
      doc.line(5, 38, 95, 38);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DESTINATÁRIO:", 10, 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(selectedOrder.customers?.name || 'Cliente Swipy', 10, 56);
      doc.text(`${selectedOrder.customers?.address || 'Endereço não informado'}`, 10, 64);
      doc.text(`CEP: ${cepDestino}`, 10, 72);
      doc.line(5, 80, 95, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("REMETENTE:", 10, 90);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Central Swipy ERP", 10, 98);
      doc.text("Logística Integrada Frenet", 10, 104);
      doc.text(`CEP Origem: ${cepOrigem}`, 10, 110);
      doc.setFillColor(0, 0, 0);
      doc.rect(15, 125, 70, 15, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text("* SWIPY-LOG-FRN-001 *", 30, 145);

      doc.save(`Etiqueta_Frete_${selectedOrder.id.split('-')[0]}.pdf`);
      showSuccess("Etiqueta gerada!");

      setShipData({
        carrier: quote.carrier,
        trackingCode: `FRN-${Math.floor(100000 + Math.random() * 900000)}BR`
      });
      setIsFrenetModalOpen(false);
      setIsShipModalOpen(true);
    } catch (err: any) {
      showError("Erro ao gerar etiqueta: " + err.message);
    }
  };

  const fetchQueue = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    // Buscamos apenas os que NÃO foram despachados ainda
    const { data } = await supabase
      .from('quotes')
      .select('*, customers(*), quote_items(*, products(*))')
      .eq('user_id', effectiveUserId)
      .in('status', ['picking', 'invoiced'])
      .order('created_at', { ascending: true });
    
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, [effectiveUserId]);

  const handleIssueInvoice = async (order: any) => {
    setInvoicingId(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-invoice`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
          chargeId: order.id, 
          customerId: order.customer_id, 
          amount: order.total_amount, 
          description: `Fatura ref. Pedido #${order.id.split('-')[0].toUpperCase()}` 
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao emitir nota");

      await supabase.from('quotes').update({ status: 'invoiced' }).eq('id', order.id);
      
      showSuccess("Nota Fiscal emitida!");
      fetchQueue();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setInvoicingId(null);
    }
  };

  const handleFinalShip = async () => {
    if (!shipData.carrier) return showError("Informe a transportadora");
    setProcessing(true);
    try {
      // 1. Atualizar Orçamento para 'shipped'
      const { error: updateError } = await supabase.from('quotes').update({
        status: 'shipped',
        carrier: shipData.carrier,
        tracking_code: shipData.trackingCode
      }).eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      // 2. Baixa de Estoque
      for (const item of selectedOrder.quote_items) {
        if (item.products) {
          const currentStock = item.products.stock_quantity || 0;
          const newQty = currentStock - item.quantity;
          await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.product_id);
          await supabase.from('inventory_movements').insert({
            user_id: effectiveUserId, 
            product_id: item.product_id, 
            type: 'out', 
            quantity: item.quantity,
            notes: `Despacho Pedido #${selectedOrder.id.split('-')[0].toUpperCase()}`
          });
        }
      }

      showSuccess("Pedido despachado!");
      setIsShipModalOpen(false);
      setShipData({ carrier: '', trackingCode: '' });
      fetchQueue(); // Atualiza a lista e remove o item despachado da visão
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setProcessing(false); 
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Truck className="text-orange-500" size={32} /> Central de Expedição
            </h2>
            <p className="text-apple-muted font-medium mt-1">Produtos prontos para envio. Registre a logística e despache.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <Input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Buscar pedido..." 
              className="pl-12 bg-apple-white border-apple-border h-12 rounded-2xl shadow-sm" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-orange-500" size={40} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-20 text-center shadow-sm">
             <PackageCheck size={48} className="mx-auto text-emerald-500 opacity-20 mb-4" />
             <p className="text-apple-muted font-bold italic">Nenhum pedido aguardando expedição.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between hover:border-orange-500 transition-all group">
                <div>
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-12 h-12 bg-apple-offWhite border border-apple-border rounded-xl flex items-center justify-center font-black text-orange-500 text-xs uppercase shadow-inner">
                       #{order.id.split('-')[0]}
                     </div>
                     <span className={cn(
                       "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                       order.status === 'invoiced' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                     )}>
                       {order.status === 'invoiced' ? 'Faturado' : 'Em Separação'}
                     </span>
                  </div>
                  <h3 className="text-lg font-black text-apple-black truncate">{order.customers?.name}</h3>
                  <p className="text-[10px] text-apple-muted font-bold flex items-center gap-1 mt-1">
                    <MapPin size={10} /> {order.customers?.address?.city || 'Local não informado'}
                  </p>
                  
                  <div className="mt-6 space-y-2">
                     {order.quote_items.map((i: any) => (
                       <div key={i.id} className="text-xs font-bold text-apple-dark flex justify-between bg-apple-offWhite p-3 rounded-xl border border-apple-border/50">
                          <span className="truncate pr-2">{i.products?.name}</span>
                          <span className="shrink-0 text-orange-600">{i.quantity} un</span>
                       </div>
                     ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-apple-border space-y-3">
                  {order.status === 'picking' && (
                    <button 
                      onClick={() => handleIssueInvoice(order)}
                      disabled={invoicingId === order.id}
                      className="w-full bg-blue-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all hover:bg-blue-700 disabled:opacity-50"
                    >
                      {invoicingId === order.id ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />}
                      EMITIR NOTA FISCAL
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleQuoteShipping(order)}
                    className="w-full bg-orange-50 text-orange-600 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-orange-200 hover:bg-orange-500 hover:text-white transition-all shadow-sm active:scale-95 text-xs"
                  >
                    <Truck size={16} /> COTAR FRETE (FRENET)
                  </button>
                  
                  <button 
                    onClick={() => { setSelectedOrder(order); setIsShipModalOpen(true); }}
                    className="w-full bg-apple-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all group-hover:bg-orange-500"
                  >
                    DESPACHAR PEDIDO <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isShipModalOpen} onOpenChange={setIsShipModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
               <Truck className="text-orange-500" /> Detalhes do Envio
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Transportadora / Agente</Label>
                <Input 
                  placeholder="Ex: Correios, Loggi, Entrega Própria..." 
                  value={shipData.carrier} 
                  onChange={e => setShipData({...shipData, carrier: e.target.value})} 
                  className="h-12 rounded-xl bg-apple-offWhite border-apple-border font-bold" 
                />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Código de Rastreamento</Label>
                <Input 
                  placeholder="BR123456789 ou Link" 
                  value={shipData.trackingCode} 
                  onChange={e => setShipData({...shipData, trackingCode: e.target.value})} 
                  className="h-12 rounded-xl bg-apple-offWhite border-apple-border font-mono text-sm" 
                />
             </div>

             <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="text-orange-500 mt-1" size={16} />
                <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                  Ao confirmar, o status do pedido mudará para <strong>Despachado</strong> e o estoque será baixado automaticamente.
                </p>
             </div>

             <button 
               onClick={handleFinalShip} 
               disabled={processing} 
               className="w-full bg-apple-black text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
             >
               {processing ? <Loader2 className="animate-spin" /> : <><Truck size={20} /> FINALIZAR E DESPACHAR</>}
             </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isFrenetModalOpen} onOpenChange={setIsFrenetModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <Truck size={20} />
              </div>
              Hub Logístico Frenet
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-apple-muted">CEP Origem</Label>
                  <Input value={cepOrigem} onChange={e => setCepOrigem(e.target.value)} className="bg-apple-offWhite h-11 border-apple-border rounded-xl font-bold" />
               </div>
               <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-apple-muted">CEP Destino</Label>
                  <Input value={cepDestino} onChange={e => setCepDestino(e.target.value)} className="bg-apple-offWhite h-11 border-apple-border rounded-xl font-bold" />
               </div>
            </div>

            <button 
              onClick={executeFrenetQuote}
              disabled={loadingQuotes}
              className="w-full bg-apple-black text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-800 disabled:opacity-50 text-xs shadow-md"
            >
              {loadingQuotes ? <Loader2 className="animate-spin" size={16} /> : "CALCULAR FRETE"}
            </button>

            {frenetQuotes.length > 0 && (
              <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                 <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Opções de Envio</Label>
                 <div className="divide-y divide-apple-border border border-apple-border rounded-2xl overflow-hidden bg-apple-offWhite/50">
                    {frenetQuotes.map(q => (
                       <div key={q.id} className="p-4 flex justify-between items-center hover:bg-apple-offWhite transition-colors">
                          <div>
                             <p className="text-xs font-black text-apple-black">{q.carrier}</p>
                             <p className="text-[10px] text-apple-muted font-medium mt-0.5">Prazo: {q.time}</p>
                          </div>
                          <div className="text-right flex items-center gap-4">
                             <span className="text-sm font-black text-orange-600 font-mono">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(q.price)}
                             </span>
                             <button 
                               onClick={() => handleGenerateLabel(q)}
                               className="bg-apple-black text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-sm active:scale-95 flex items-center gap-1"
                             >
                               <FileText size={12} /> ETIQUETA
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Shipping;