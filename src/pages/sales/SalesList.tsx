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
  const { effectiveUserId } = useAuth(); // Usando effectiveUserId para suportar modo contador
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
    if (!effectiveUserId) return;
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

  const getStatusDisplay = (status: string) => {
    if (status === 'shipped') return { label: 'Despachado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    if (status === 'draft') return { label: 'Em Aberto (Orçamento)', color: 'bg-orange-50 text-orange-600 border-orange-100' };
    if (status === 'completed') return { label: 'Concluído (PDV)', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    if (status === 'paid') return { label: 'Pago', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    
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

        <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm border-l-4 border-l-orange-500 max-w-sm">
          <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Faturamento no Período</p>
          <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(totalMonthRevenue)}</p>
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