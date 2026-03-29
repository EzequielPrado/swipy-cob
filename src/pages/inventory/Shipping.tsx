"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Truck, Loader2, Search, PackageCheck, Receipt, ArrowRight, User, Package, CheckCircle2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Shipping = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shipData, setShipData] = useState({ carrier: '', trackingCode: '' });

  const fetchQueue = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('*, customers(*), quote_items(*, products(*))')
      .eq('user_id', user.id)
      .in('status', ['picking', 'invoiced'])
      .order('created_at', { ascending: true });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, [user]);

  const handleFinalShip = async () => {
    if (!shipData.carrier) return showError("Informe a transportadora");
    setProcessing(true);
    try {
      // 1. Atualizar Orçamento
      await supabase.from('quotes').update({
        status: 'shipped',
        carrier: shipData.carrier,
        tracking_code: shipData.trackingCode
      }).eq('id', selectedOrder.id);

      // 2. Baixa de Estoque
      for (const item of selectedOrder.quote_items) {
        if (item.products) {
          const currentStock = item.products.stock_quantity || 0;
          const newQty = currentStock - item.quantity;
          await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.product_id);
          await supabase.from('inventory_movements').insert({
            user_id: user?.id, 
            product_id: item.product_id, 
            type: 'out', 
            quantity: item.quantity,
            notes: `Despacho Pedido #${selectedOrder.id.split('-')[0].toUpperCase()}`
          });
        }
      }

      showSuccess("Pedido enviado com sucesso!");
      setIsShipModalOpen(false);
      fetchQueue();
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

                <div className="mt-8 pt-6 border-t border-apple-border">
                  <button 
                    onClick={() => { setSelectedOrder(order); setIsShipModalOpen(true); }}
                    className="w-full bg-apple-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all group-hover:bg-orange-500"
                  >
                    INFORMAR LOGÍSTICA <ArrowRight size={18} />
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
    </AppLayout>
  );
};

export default Shipping;