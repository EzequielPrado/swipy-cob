"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingBag, Loader2, Calendar, TrendingUp,
  Store, Eye, Package, Receipt, ArrowUpRight, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SalesList = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Detalhes
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchSales = async () => {
    if (!user) return;
    setLoading(true);
    
    // Na nossa modelagem, 'quotes' (orçamentos) atuam como Pedidos de Venda
    // quando o status é 'approved' (Venda Fechada) ou 'draft' (Em negociação)
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *, 
        customers(name, email, phone),
        quote_items(
          id, quantity, unit_price, total_price,
          products(name, sku)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSales(data);
    } else if (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, [user]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      s.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sales, searchTerm]);

  // Métricas
  const metrics = useMemo(() => {
    const approvedSales = sales.filter(s => s.status === 'approved');
    const totalVolume = approvedSales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
    const avgTicket = approvedSales.length > 0 ? totalVolume / approvedSales.length : 0;

    return {
      totalOrders: approvedSales.length,
      totalVolume,
      avgTicket,
      pendingQuotes: sales.filter(s => s.status === 'draft').length
    };
  }, [sales]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const openDetails = (sale: any) => {
    setSelectedSale(sale);
    setIsDetailsOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ShoppingBag className="text-orange-500" size={32} />
              Gestão de Vendas
            </h2>
            <p className="text-zinc-400 mt-1">Centralize pedidos do ERP, PDV e futuros E-commerces.</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-400">
             <Globe size={18} />
             <span className="text-xs font-bold uppercase tracking-widest">Integrações em Breve</span>
          </div>
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><ArrowUpRight size={100} /></div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Volume de Vendas
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className="text-3xl font-black text-zinc-100">{currencyFormatter.format(metrics.totalVolume)}</p>
            )}
            <p className="text-[10px] text-emerald-500 mt-2 font-bold">Apenas pedidos aprovados</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Store size={100} /></div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Store size={16} className="text-orange-500" /> Pedidos Fechados
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className="text-3xl font-black text-zinc-100">{metrics.totalOrders}</p>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">Neste período</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Receipt size={16} className="text-blue-500" /> Ticket Médio
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className="text-3xl font-black text-blue-400">{currencyFormatter.format(metrics.avgTicket)}</p>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">Por venda aprovada</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-yellow-500" /> Em Negociação
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className="text-3xl font-black text-zinc-100">{metrics.pendingQuotes}</p>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">Orçamentos pendentes</p>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou ID do pedido..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        {/* LISTAGEM DE PEDIDOS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Nenhum pedido encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Cód. Pedido</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Canal</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-zinc-300 font-mono uppercase">#{sale.id.split('-')[0]}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-100">{sale.customers?.name || 'Cliente não identificado'}</p>
                      <p className="text-xs text-zinc-500">{sale.customers?.email}</p>
                    </td>
                    <td className="px-8 py-5">
                      {/* Placeholder de Integrações. Por enquanto todos são ERP/PDV */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight bg-zinc-800 text-zinc-300 border border-zinc-700">
                        <Store size={10} /> ERP / Balcão
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-orange-400">
                      {currencyFormatter.format(sale.total_amount)}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                        sale.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      )}>
                        {sale.status === 'approved' ? 'Fechado' : 'Em Aberto'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => openDetails(sale)}
                        className="p-2 text-zinc-500 hover:text-orange-400 transition-colors"
                        title="Ver Itens do Pedido"
                      >
                        <Eye size={18}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES DO PEDIDO */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[600px] p-0 overflow-hidden">
          {selectedSale && (
            <>
              <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/50">
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="text-orange-500" size={24} />
                    <div>
                      <h3 className="text-xl">Pedido <span className="font-mono uppercase text-orange-500">#{selectedSale.id.split('-')[0]}</span></h3>
                      <p className="text-xs text-zinc-400 font-normal">Realizado em {new Date(selectedSale.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    selectedSale.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  )}>
                    {selectedSale.status === 'approved' ? 'Venda Fechada' : 'Orçamento'}
                  </span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="p-6 space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-sm font-bold text-zinc-100">{selectedSale.customers?.name}</p>
                    <p className="text-xs text-zinc-400">{selectedSale.customers?.phone || 'Sem telefone'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor Total</p>
                    <p className="text-2xl font-black text-orange-500">{currencyFormatter.format(selectedSale.total_amount)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Package size={16} className="text-zinc-500" /> Itens do Pedido ({selectedSale.quote_items?.length || 0})
                  </h4>
                  
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {selectedSale.quote_items && selectedSale.quote_items.length > 0 ? (
                      selectedSale.quote_items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <div>
                            <p className="text-sm font-bold text-zinc-200">{item.products?.name || 'Produto Excluído'}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">SKU: {item.products?.sku || 'N/A'}</p>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div className="text-zinc-500 text-xs">
                              {item.quantity}x <span className="font-mono">{currencyFormatter.format(item.unit_price)}</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-100 w-24">
                              {currencyFormatter.format(item.total_price)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500 text-center py-4">Nenhum item encontrado.</p>
                    )}
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