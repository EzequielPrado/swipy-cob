"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingBag, Loader2, Calendar, TrendingUp,
  Store, Eye, Package, Receipt, ArrowUpRight, Globe,
  CheckCircle2, Wrench, PackageSearch, Truck, ChevronRight, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FULFILLMENT_STAGES = [
  { id: 'approved', label: 'Aprovado', icon: CheckCircle2 },
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
  
  // Modal de Detalhes
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSales = async () => {
    if (!user) return;
    setLoading(true);
    
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

  const metrics = useMemo(() => {
    const approvedSales = sales.filter(s => s.status !== 'draft');
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

  const advanceStatus = async () => {
    if (!selectedSale) return;
    const currentIndex = FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status);
    if (currentIndex === -1 || currentIndex >= FULFILLMENT_STAGES.length - 1) return;

    const nextStage = FULFILLMENT_STAGES[currentIndex + 1].id;
    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: nextStage })
        .eq('id', selectedSale.id);

      if (error) throw error;

      showSuccess(`Pedido avançado para: ${FULFILLMENT_STAGES[currentIndex + 1].label}`);
      
      const updatedSale = { ...selectedSale, status: nextStage };
      setSelectedSale(updatedSale);
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
      
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Função específica para emitir fatura e avançar o status
  const handleInvoiceAndAdvance = async () => {
    if (!selectedSale) return;
    setUpdatingStatus(true);

    try {
      // 1. Emitir a Fatura via Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          chargeId: selectedSale.id, // Usa o ID do pedido como correlation
          customerId: selectedSale.customer_id,
          amount: selectedSale.total_amount,
          description: `Fatura ref. Pedido #${selectedSale.id.split('-')[0].toUpperCase()}`
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao emitir fatura.");

      // 2. Atualizar o status para Faturado
      const nextStage = 'invoiced';
      const { error } = await supabase
        .from('quotes')
        .update({ status: nextStage })
        .eq('id', selectedSale.id);

      if (error) throw error;

      showSuccess("Fatura emitida e enviada via WhatsApp!");
      
      // 3. Atualizar a tela
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
    if (status === 'draft') return { label: 'Em Aberto (Orçamento)', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    const stage = FULFILLMENT_STAGES.find(s => s.id === status);
    if (!stage) return { label: status, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    
    if (status === 'shipped') return { label: 'Despachado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    return { label: stage.label, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
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
            <p className="text-zinc-400 mt-1">Acompanhe seus pedidos e movimente-os pelo fluxo de atendimento.</p>
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
            <p className="text-[10px] text-emerald-500 mt-2 font-bold">Pedidos aprovados/fechados</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Store size={100} /></div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Store size={16} className="text-orange-500" /> Total de Pedidos
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
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">Por venda fechada</p>
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
                {filteredSales.map((sale) => {
                  const statusInfo = getStatusDisplay(sale.status);
                  return (
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
                          statusInfo.color
                        )}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => openDetails(sale)}
                          className="p-2 text-zinc-500 hover:text-orange-400 transition-colors"
                          title="Detalhes do Pedido"
                        >
                          <Eye size={18}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES E FLUXO DO PEDIDO */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[700px] p-0 flex flex-col max-h-[90vh]">
          {selectedSale && (
            <>
              <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="text-orange-500" size={24} />
                    <div>
                      <h3 className="text-xl">Pedido <span className="font-mono uppercase text-orange-500">#{selectedSale.id.split('-')[0]}</span></h3>
                      <p className="text-xs text-zinc-400 font-normal">Feito em {new Date(selectedSale.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    getStatusDisplay(selectedSale.status).color
                  )}>
                    {getStatusDisplay(selectedSale.status).label}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* PIPELINE DE ATENDIMENTO (Só exibe se for aprovado/fechado) */}
                {selectedSale.status !== 'draft' && (
                  <div className="p-6 border-b border-zinc-800 bg-zinc-950/20">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fluxo de Atendimento</h4>
                      
                      {/* Botões de Ação do Pipeline */}
                      {FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status) < FULFILLMENT_STAGES.length - 1 && (
                        selectedSale.status === 'picking' ? (
                          <button 
                            onClick={handleInvoiceAndAdvance}
                            disabled={updatingStatus}
                            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20"
                          >
                            {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} 
                            Emitir Fatura
                          </button>
                        ) : (
                          <button 
                            onClick={advanceStatus}
                            disabled={updatingStatus}
                            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                          >
                            {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : "Avançar Etapa"} 
                            <ChevronRight size={14} />
                          </button>
                        )
                      )}
                    </div>
                    
                    <div className="relative flex justify-between items-center px-4 mt-8 mb-4">
                      {/* Linha de Fundo */}
                      <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 bg-zinc-800 -z-10 -translate-y-1/2"></div>
                      
                      {/* Linha de Progresso */}
                      {FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status) > 0 && (
                        <div 
                          className="absolute left-[10%] top-1/2 h-0.5 bg-orange-500 -z-10 -translate-y-1/2 transition-all duration-500"
                          style={{ width: `${(FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status) / (FULFILLMENT_STAGES.length - 1)) * 80}%` }}
                        ></div>
                      )}

                      {/* Etapas */}
                      {FULFILLMENT_STAGES.map((stage, index) => {
                        const currentIndex = FULFILLMENT_STAGES.findIndex(s => s.id === selectedSale.status);
                        const isCompleted = index <= currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                          <div key={stage.id} className="flex flex-col items-center gap-2 z-10 relative">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300",
                              isCompleted ? "bg-orange-500 border-zinc-900 text-zinc-950 shadow-lg shadow-orange-500/20" : "bg-zinc-800 border-zinc-900 text-zinc-500"
                            )}>
                              <stage.icon size={16} className={isCurrent ? "animate-pulse" : ""} />
                            </div>
                            <span className={cn(
                              "absolute -bottom-6 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                              isCompleted ? "text-orange-400" : "text-zinc-600"
                            )}>
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-6 mt-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex justify-between items-center shadow-inner">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Cliente</p>
                      <p className="text-base font-bold text-zinc-100">{selectedSale.customers?.name}</p>
                      <p className="text-xs text-zinc-400 mt-1">{selectedSale.customers?.phone || 'Sem telefone'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor Total</p>
                      <p className="text-3xl font-black text-orange-500">{currencyFormatter.format(selectedSale.total_amount)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Package size={16} className="text-zinc-500" /> Itens do Pedido ({selectedSale.quote_items?.length || 0})
                    </h4>
                    
                    <div className="space-y-3">
                      {selectedSale.quote_items && selectedSale.quote_items.length > 0 ? (
                        selectedSale.quote_items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SalesList;