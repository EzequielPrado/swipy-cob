"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingBag, Loader2, Calendar, TrendingUp,
  Store, Eye, Package, Receipt, ArrowUpRight, Globe,
  CheckCircle2, Wrench, PackageSearch, Truck, ChevronRight, FileText, Contact,
  CalendarDays, Banknote, PlayCircle, DollarSign, Factory
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FULFILLMENT_STAGES = [
  { id: 'approved', label: 'Aprovado', icon: CheckCircle2 },
  { id: 'paid', label: 'Pago', icon: Banknote },
  { id: 'production', label: 'Produção', icon: Wrench },
  { id: 'picking', label: 'Separação', icon: PackageSearch },
  { id: 'invoiced', label: 'Faturado', icon: Receipt },
  { id: 'shipped', label: 'Despachado', icon: Truck },
];

const SalesList = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() + 1);
    }
    return options.reverse();
  }, []);
  
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSales = async () => {
    if (!user) return;
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *, 
        customers(name, email, phone),
        employees(full_name),
        quote_items(
          id, product_id, quantity, unit_price, total_price,
          products(name, sku, is_produced)
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSales(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, [user, selectedMonth]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      s.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.employees?.full_name && s.employees.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sales, searchTerm]);

  const totalMonthRevenue = useMemo(() => {
    return sales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  }, [sales]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const openDetails = (sale: any) => {
    setSelectedSale(sale);
    setIsDetailsOpen(true);
  };

  const advanceStatus = async (manualNextStage?: string) => {
    if (!selectedSale) return;
    
    // IMPORTANTE: Se o argumento vier de um evento onClick, ele será um objeto.
    // Garantimos que nextStage seja apenas string ou null.
    let nextStage = typeof manualNextStage === 'string' ? manualNextStage : null;
    
    if (!nextStage) {
      const currentIndex = FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status);
      if (currentIndex === -1 || currentIndex >= FULFILLMENT_STAGES.length - 1) return;
      nextStage = FULFILLMENT_STAGES[currentIndex + 1].id;
    }

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.from('quotes').update({ status: nextStage }).eq('id', selectedSale.id);
      if (error) throw error;

      if (nextStage === 'production') {
        const prodEntries = selectedSale.quote_items
          .filter((i: any) => i.products?.is_produced)
          .map((i: any) => ({
            user_id: user?.id,
            product_id: i.product_id,
            quote_id: selectedSale.id,
            quantity: i.quantity,
            status: 'pending'
          }));
        
        if (prodEntries.length > 0) {
          await supabase.from('production_orders').insert(prodEntries);
        }
      }

      showSuccess(`Pedido avançado.`);
      const updatedSale = { ...selectedSale, status: nextStage };
      setSelectedSale(updatedSale);
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleInvoiceAndAdvance = async () => {
    if (!selectedSale) return;
    setUpdatingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          chargeId: selectedSale.id, 
          customerId: selectedSale.customer_id, 
          amount: selectedSale.total_amount, 
          description: `Fatura ref. Pedido #${selectedSale.id.split('-')[0].toUpperCase()}` 
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const nextStage = 'invoiced';
      await supabase.from('quotes').update({ status: nextStage }).eq('id', selectedSale.id);
      showSuccess("Fatura emitida!");
      const updatedSale = { ...selectedSale, status: nextStage };
      setSelectedSale(updatedSale);
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'draft') return { label: 'Em Aberto (Orçamento)', color: 'bg-orange-50 text-orange-600 border-orange-100' };
    if (status === 'completed') return { label: 'Concluído (PDV)', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    if (status === 'paid') return { label: 'Pagamento Confirmado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    
    const stage = FULFILLMENT_STAGES.find(s => s.id === status);
    if (!stage) return { label: status, color: 'bg-apple-light text-apple-muted border-apple-border' };
    return { label: stage.label, color: 'bg-blue-50 text-blue-600 border-blue-100' };
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Gestão de Vendas</h2>
            <p className="text-apple-muted mt-1 font-medium">Acompanhe seus pedidos e movimente-os pelo fluxo de atendimento.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-apple-white border border-apple-border rounded-lg overflow-hidden pr-2 shadow-sm">
              <div className="pl-3 text-apple-muted"><CalendarDays size={16} /></div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-semibold text-orange-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="focus:bg-apple-light">{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all border-l-4 border-l-orange-500">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2 flex items-center gap-2">
              <DollarSign size={14} className="text-orange-500" /> Faturamento no Período
            </p>
            {loading ? <Loader2 className="animate-spin text-apple-muted" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(totalMonthRevenue)}</p>
                <p className="text-[10px] text-apple-muted mt-2 font-medium uppercase">
                  {monthOptions.find(o => o.value === selectedMonth)?.label}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar pedido ou cliente..." className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm" />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Ref. Pedido</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-apple-light transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-apple-black font-mono uppercase">#{sale.id.split('-')[0]}</p>
                      <p className="text-[10px] text-apple-muted mt-1 font-bold">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black">{sale.customers?.name || 'Venda PDV'}</p>
                      <p className="text-[10px] text-apple-muted font-bold flex items-center gap-1 mt-0.5"><Contact size={10} className="text-blue-500" /> {sale.employees?.full_name || 'Venda Direta'}</p>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-orange-600">{currencyFormatter.format(sale.total_amount)}</td>
                    <td className="px-8 py-5">
                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border", getStatusDisplay(sale.status).color)}>
                        {getStatusDisplay(sale.status).label}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => openDetails(sale)} className="p-2.5 text-apple-muted hover:text-orange-500 transition-colors"><Eye size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[700px] p-0 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {selectedSale && (
            <>
              <div className="p-8 border-b border-apple-border bg-apple-offWhite shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm"><ShoppingBag size={20} /></div>
                  <div>
                    <h3 className="text-xl font-bold">Pedido <span className="font-mono uppercase text-orange-500">#{selectedSale.id.split('-')[0]}</span></h3>
                    <p className="text-xs text-apple-muted font-bold">Feito em {new Date(selectedSale.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <span className={cn("px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border", getStatusDisplay(selectedSale.status).color)}>{getStatusDisplay(selectedSale.status).label}</span>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {selectedSale.status !== 'draft' && selectedSale.status !== 'completed' && (
                  <div className="p-6 rounded-[1.5rem] border border-apple-border bg-apple-offWhite shadow-inner">
                    <div className="flex items-center justify-between mb-8"><h4 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">Fluxo de Atendimento</h4></div>
                    <div className="relative flex justify-between items-center px-4">
                      <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 bg-apple-border -z-10 -translate-y-1/2"></div>
                      {FULFILLMENT_STAGES.map((stage, index) => {
                        const currentIndex = FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status);
                        const isCompleted = index <= currentIndex;
                        return (
                          <div key={stage.id} className="flex flex-col items-center gap-2 z-10 relative">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all", isCompleted ? "bg-orange-500 border-orange-600 text-white shadow-sm" : "bg-apple-white border-apple-border text-apple-muted")}>
                              <stage.icon size={16} />
                            </div>
                            <span className={cn("absolute -bottom-6 text-[8px] font-black uppercase tracking-wider", isCompleted ? "text-orange-600" : "text-apple-muted")}>{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-14 flex justify-center">
                       {selectedSale.status === 'paid' ? (
                         <div className="flex gap-4">
                            {selectedSale.quote_items.some((i: any) => i.products?.is_produced) ? (
                              <button onClick={() => advanceStatus('production')} disabled={updatingStatus} className="bg-orange-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-sm">
                                {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <><Factory size={16} /> Liberar para Produção</>}
                              </button>
                            ) : (
                              <button onClick={() => advanceStatus('picking')} disabled={updatingStatus} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm">
                                {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <><PackageSearch size={16} /> Liberar para Separação</>}
                              </button>
                            )}
                         </div>
                       ) : (
                         FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status) < FULFILLMENT_STAGES.length - 1 && selectedSale.status !== 'approved' && (
                           <button onClick={selectedSale.status === 'picking' ? handleInvoiceAndAdvance : () => advanceStatus()} disabled={updatingStatus} className="bg-orange-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-sm">
                             {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : (selectedSale.status === 'picking' ? "Emitir Fatura Oficial" : "Avançar Próxima Etapa")}
                           </button>
                         )
                       )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-6 bg-apple-offWhite border border-apple-border rounded-3xl">
                      <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Cliente / Pagador</p>
                      <p className="text-base font-bold text-apple-black">{selectedSale.customers?.name}</p>
                      <p className="text-xs text-apple-muted font-bold mt-1">{selectedSale.customers?.email}</p>
                   </div>
                   <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl text-right">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">Valor Total</p>
                      <p className="text-3xl font-black text-orange-600">{currencyFormatter.format(selectedSale.total_amount)}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2"><Package size={14} /> Itens do Pedido</h4>
                  {selectedSale.quote_items?.map((item: any) => (
                    <div key={item.id} className="p-4 bg-apple-white border border-apple-border rounded-2xl flex items-center justify-between shadow-sm">
                      <div><p className="text-sm font-bold text-apple-black">{item.products?.name || 'Item Excluído'}</p><p className="text-[10px] text-apple-muted font-mono font-bold">SKU: {item.products?.sku || 'N/A'}</p></div>
                      <div className="text-right"><p className="text-sm font-black text-apple-black">{currencyFormatter.format(item.total_price)}</p><p className="text-[10px] text-apple-muted font-bold">{item.quantity}x {currencyFormatter.format(item.unit_price)}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SalesList;