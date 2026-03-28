"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Truck, Loader2, Search, PackageCheck, AlertTriangle, 
  ChevronRight, ArrowRight, Package, User, Clock, CheckCircle2,
  PackageSearch, FileText, Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const Shipping = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);

  const fetchQueue = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *, 
          customers(name, phone, address),
          quote_items(
            id, quantity, product_id,
            products(name, sku, stock_quantity)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['approved', 'production', 'picking', 'invoiced'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      showError("Erro ao carregar fila de expedição.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, [user]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const handleInvoice = async (order: any) => {
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
      if (!response.ok) throw new Error(result.error);

      // Atualizar status para invoiced no banco
      await supabase.from('quotes').update({ status: 'invoiced' }).eq('id', order.id);
      
      showSuccess("Fatura oficial emitida e enviada ao cliente!");
      fetchQueue();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setInvoicingId(null);
    }
  };

  const handleShip = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const items = selectedOrder.quote_items || [];
      
      for (const item of items) {
        if (!item.products) continue;
        if (item.products.stock_quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para o item: ${item.products.name}`);
        }
      }

      for (const item of items) {
        if (!item.product_id) continue;
        const newQty = item.products.stock_quantity - item.quantity;
        const { error: prodError } = await supabase
          .from('products')
          .update({ stock_quantity: newQty })
          .eq('id', item.product_id);
        
        if (prodError) throw prodError;

        await supabase.from('inventory_movements').insert({
          user_id: user?.id,
          product_id: item.product_id,
          type: 'out',
          quantity: item.quantity,
          notes: `Expedição do Pedido #${selectedOrder.id.split('-')[0].toUpperCase()}`
        });
      }

      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'shipped' })
        .eq('id', selectedOrder.id);

      if (quoteError) throw quoteError;

      showSuccess("Pedido despachado! O estoque foi atualizado.");
      setIsConfirmOpen(false);
      fetchQueue();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Truck className="text-orange-500" size={32} /> Expedição
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Controle de saídas, separação e baixa de mercadorias.</p>
          </div>
          <div className="bg-apple-white border border-apple-border px-5 py-2 rounded-2xl shadow-sm">
             <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-0.5">Fila de Saída</p>
             <p className="text-xl font-black text-apple-black">{orders.length} <span className="text-xs font-normal text-apple-muted">pedidos</span></p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou ref. do pedido..." 
            className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm text-apple-black"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="col-span-full bg-apple-white border border-apple-border border-dashed rounded-[2.5rem] p-20 text-center text-apple-muted opacity-60">
               <PackageSearch size={64} className="mx-auto mb-4" />
               <p className="font-bold">Nenhum pedido aguardando expedição.</p>
            </div>
          ) : filteredOrders.map((order) => {
            const hasStockIssue = order.quote_items?.some((i: any) => i.products && i.products.stock_quantity < i.quantity);
            const isInvoiced = order.status === 'invoiced';

            return (
              <div key={order.id} className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 flex flex-col shadow-sm hover:border-orange-200 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-apple-offWhite border border-apple-border flex items-center justify-center text-orange-500 font-mono text-sm font-black shadow-inner">
                    #{order.id.split('-')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      hasStockIssue ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {hasStockIssue ? 'Sem Estoque' : 'Pronto p/ Sair'}
                    </span>
                    {isInvoiced && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1">
                        <Receipt size={10} /> Faturado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                   <div>
                     <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1 flex items-center gap-1"><User size={10} /> Destinatário</p>
                     <p className="text-base font-black text-apple-black truncate">{order.customers?.name}</p>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-1"><Package size={10} /> Itens do Volume</p>
                      <div className="space-y-2">
                        {order.quote_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-xs font-bold text-apple-dark bg-apple-offWhite p-3 rounded-xl border border-apple-border">
                             <div className="flex-1 overflow-hidden pr-2">
                               <p className="truncate">{item.products?.name}</p>
                               <p className="text-[9px] text-apple-muted font-mono uppercase">Qtd: {item.quantity} un.</p>
                             </div>
                             {item.products && item.products.stock_quantity < item.quantity ? (
                               <AlertTriangle size={14} className="text-red-500 shrink-0" title="Saldo insuficiente no estoque" />
                             ) : <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-apple-border space-y-3">
                   {!isInvoiced && (
                     <button 
                       onClick={() => handleInvoice(order)}
                       disabled={!!invoicingId}
                       className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-blue-100"
                     >
                       {invoicingId === order.id ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />}
                       EMITIR FATURA OFICIAL
                     </button>
                   )}
                   
                   <button 
                    onClick={() => { setSelectedOrder(order); setIsConfirmOpen(true); }}
                    disabled={hasStockIssue}
                    className="w-full bg-apple-black hover:bg-zinc-800 disabled:opacity-30 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
                   >
                     CONFIRMAR DESPACHO <ArrowRight size={18} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 bg-apple-offWhite border-b border-apple-border">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <PackageCheck className="text-emerald-500" /> Confirmar Saída
            </DialogTitle>
            <p className="text-xs text-apple-muted font-bold mt-2 italic">Ao confirmar, o sistema realizará a baixa automática das quantidades informadas na ficha de estoque.</p>
          </DialogHeader>

          <div className="p-10 space-y-8">
             <div className="bg-apple-offWhite border border-apple-border p-6 rounded-3xl">
                <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4">Informações de Logística</p>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-sm"><span className="text-apple-muted font-medium">Pedido</span><span className="font-black text-apple-black uppercase">#{selectedOrder?.id.split('-')[0]}</span></div>
                   <div className="flex justify-between items-center text-sm"><span className="text-apple-muted font-medium">Modalidade</span><span className="font-black text-emerald-600 uppercase">Saída Física</span></div>
                </div>
             </div>

             <DialogFooter className="pt-2">
                <button 
                  onClick={handleShip}
                  disabled={processing}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
                >
                  {processing ? <Loader2 className="animate-spin" /> : <Truck size={24} />}
                  REGISTRAR SAÍDA AGORA
                </button>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Shipping;