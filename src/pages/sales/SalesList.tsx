"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingBag, Loader2, Calendar, TrendingUp,
  Store, Eye, Package, Receipt, ArrowUpRight, Globe,
  CheckCircle2, Wrench, PackageSearch, Truck, ChevronRight, FileText, Contact,
  CalendarDays, Banknote, PlayCircle, DollarSign, Factory, MapPin, ShoppingCart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FulfillmentStepper from '@/components/sales/FulfillmentStepper';

const SalesList = () => {
  const { effectiveUserId } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'nuvemshop' | 'pdv'>('all');
  
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

  const fetchSales = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *, 
        customers(name, email, phone, address),
        employees(full_name),
        quote_items(
          id, product_id, quantity, unit_price, total_price,
          products(name, sku, is_produced)
        ),
        charges(correlation_id)
      `)
      .eq('user_id', effectiveUserId)
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
  }, [effectiveUserId, selectedMonth]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const isNuvem = s.charges?.some((c: any) => c.correlation_id?.startsWith('nuvem_'));
      const matchesSearch = s.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrigin = originFilter === 'all' || (originFilter === 'nuvemshop' && isNuvem) || (originFilter === 'pdv' && !isNuvem);
      
      return matchesSearch && matchesOrigin;
    });
  }, [sales, searchTerm, originFilter]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusDisplay = (status: string) => {
    const map: Record<string, { label: string, color: string }> = {
      'draft': { label: 'Orçamento', color: 'bg-orange-50 text-orange-600 border-orange-100' },
      'approved': { label: 'Aprovado', color: 'bg-blue-50 text-blue-600 border-blue-100' },
      'paid': { label: 'Pago / Conciliado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      'production': { label: 'Em Produção', color: 'bg-purple-50 text-purple-600 border-purple-100' },
      'picking': { label: 'Em Separação', color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
      'invoiced': { label: 'Faturado', color: 'bg-blue-50 text-blue-600 border-blue-100' },
      'shipped': { label: 'Despachado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      'completed': { label: 'Concluído', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    };
    return map[status] || { label: status, color: 'bg-apple-light text-apple-muted border-apple-border' };
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black">Gestão de Vendas</h2>
            <p className="text-apple-muted mt-1 font-medium">Acompanhe seus pedidos e movimente-os pelo fluxo de atendimento.</p>
          </div>
          <div className="flex items-center bg-apple-white border border-apple-border rounded-xl px-4 py-2 shadow-sm">
            <CalendarDays size={16} className="text-apple-muted mr-3" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-bold text-orange-500"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-apple-white p-2 rounded-[2rem] border border-apple-border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Buscar por cliente ou #ID..." 
              className="w-full bg-transparent border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-0 outline-none transition-all text-apple-black" 
            />
          </div>
          <div className="flex gap-2 p-1 overflow-x-auto w-full md:w-auto">
            <button onClick={() => setOriginFilter('all')} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap", originFilter === 'all' ? "bg-orange-500 text-white shadow-sm" : "bg-apple-offWhite text-apple-muted hover:bg-apple-light")}>Todos</button>
            <button onClick={() => setOriginFilter('nuvemshop')} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 whitespace-nowrap", originFilter === 'nuvemshop' ? "bg-blue-600 text-white shadow-sm" : "bg-apple-offWhite text-apple-muted hover:bg-apple-light")}><Store size={12}/> Nuvemshop</button>
            <button onClick={() => setOriginFilter('pdv')} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 whitespace-nowrap", originFilter === 'pdv' ? "bg-emerald-600 text-white shadow-sm" : "bg-apple-offWhite text-apple-muted hover:bg-apple-light")}><ShoppingCart size={12}/> Balcão / PDV</button>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-apple-muted opacity-40">
               <ShoppingBag size={48} className="mb-4" />
               <p className="font-bold italic">Nenhum pedido localizado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-6">Data / Identificação</th>
                    <th className="px-8 py-6">Cliente</th>
                    <th className="px-8 py-6">Fulfillment (Status)</th>
                    <th className="px-8 py-6 text-right">Total</th>
                    <th className="px-8 py-6 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {filteredSales.map((sale) => {
                    const isNuvemshop = sale.charges?.some((c: any) => c.correlation_id?.startsWith('nuvem_'));

                    return (
                      <tr key={sale.id} className="hover:bg-apple-light transition-colors group">
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-apple-black font-mono uppercase">#{sale.id.split('-')[0]}</p>
                          <p className="text-[10px] text-apple-muted mt-1 font-bold">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</p>
                          {isNuvemshop && (
                             <span className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-white bg-blue-600 px-2 py-0.5 rounded shadow-sm">
                                <Store size={10} /> Nuvemshop
                             </span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-apple-black group-hover:text-orange-500 transition-colors">{sale.customers?.name || 'Venda PDV'}</p>
                          <p className="text-[10px] text-apple-muted font-bold flex items-center gap-1 mt-0.5">
                            <Contact size={10} className={isNuvemshop ? "text-blue-500" : "text-emerald-500"} /> 
                            {isNuvemshop ? 'E-commerce' : (sale.employees?.full_name || 'Venda Direta')}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusDisplay(sale.status).color)}>
                            {getStatusDisplay(sale.status).label}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-apple-black">
                          {currencyFormatter.format(sale.total_amount)}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => { setSelectedSale(sale); setIsDetailsOpen(true); }} className="p-2.5 bg-apple-offWhite hover:bg-orange-500 hover:text-white rounded-xl transition-all border border-apple-border shadow-sm">
                            <Eye size={18}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[750px] p-0 rounded-[3rem] overflow-hidden shadow-2xl">
          {selectedSale && (
            <>
              <div className="p-10 border-b border-apple-border bg-apple-offWhite flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 border border-apple-border shadow-inner"><ShoppingBag size={28} /></div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Pedido <span className="font-mono text-orange-500 uppercase">#{selectedSale.id.split('-')[0]}</span></h3>
                    <p className="text-xs text-apple-muted font-bold uppercase tracking-widest">Registrado em {new Date(selectedSale.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-apple-muted uppercase mb-1">Status Operacional</p>
                  <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusDisplay(selectedSale.status).color)}>{getStatusDisplay(selectedSale.status).label}</span>
                </div>
              </div>

              <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                {/* PIPELINE DE FLUXO */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] ml-1">Fluxo de Atendimento</h4>
                   <div className="bg-apple-offWhite border border-apple-border p-6 rounded-[2.5rem] shadow-inner">
                      <FulfillmentStepper currentStatus={selectedSale.status} />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-8 bg-apple-offWhite border border-apple-border rounded-[2.5rem]">
                      <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Informações do Cliente</p>
                      <h4 className="text-xl font-black text-apple-black">{selectedSale.customers?.name}</h4>
                      <p className="text-sm text-apple-muted font-bold mt-1">{selectedSale.customers?.email}</p>
                      <div className="mt-6 flex items-center gap-2 text-xs font-bold text-apple-dark bg-white p-3 rounded-xl border border-apple-border">
                         <MapPin size={14} className="text-orange-500" />
                         {selectedSale.customers?.address?.city || 'Retirada no Local'}
                      </div>
                   </div>
                   <div className="p-8 bg-orange-50 border border-orange-100 rounded-[2.5rem] flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Total do Pedido</p>
                        <p className="text-5xl font-black text-orange-500 tracking-tighter">{currencyFormatter.format(selectedSale.total_amount)}</p>
                      </div>
                      {selectedSale.tracking_code && (
                        <div className="mt-6 p-4 bg-white rounded-2xl border border-orange-200">
                           <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Rastreio ({selectedSale.carrier})</p>
                           <p className="text-xs font-mono font-bold text-apple-black">{selectedSale.tracking_code}</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2"><Package size={16} /> Composição da Venda</h4>
                  <div className="space-y-3">
                    {selectedSale.quote_items?.map((item: any) => (
                      <div key={item.id} className="p-5 bg-apple-white border border-apple-border rounded-2xl flex items-center justify-between shadow-sm hover:border-apple-dark transition-all">
                        <div className="flex items-center gap-4">
                           {item.products?.is_produced ? <Factory size={18} className="text-orange-500" /> : <Package size={18} className="text-blue-500" />}
                           <div>
                             <p className="text-sm font-bold text-apple-black">{item.products?.name || 'Item Excluído'}</p>
                             <p className="text-[10px] text-apple-muted font-mono font-bold uppercase">SKU: {item.products?.sku || 'N/A'}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-apple-black">{currencyFormatter.format(item.total_price)}</p>
                          <p className="text-[10px] text-apple-muted font-bold">{item.quantity}x {currencyFormatter.format(item.unit_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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