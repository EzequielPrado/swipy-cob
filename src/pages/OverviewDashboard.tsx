"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  TrendingUp, 
  Package, 
  ArrowRight, 
  Loader2, 
  AlertTriangle,
  CalendarClock,
  Landmark,
  ShoppingCart,
  Factory,
  ArrowUpRight,
  ChevronRight,
  Users,
  Clock,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { cn } from "@/lib/utils";

const OverviewDashboard = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: 0,
    salesToday: 0,
    skus: 0,
    stockValue: 0,
    lowStockItems: [] as any[],
    expensesTodayCount: 0,
    expensesTodayAmount: 0,
    totalBalance: 0,
    pendingProduction: 0,
    activeProduction: 0,
    activeEmployees: 0,
    recentSales: [] as any[],
    recentProduction: [] as any[]
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!effectiveUserId) return;
      setLoading(true);
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Usamos effectiveUserId que alterna entre o contador e o lojista selecionado
        const [subsRes, salesRes, productsRes, expensesRes, accountsRes, ordersRes, employeesRes] = await Promise.all([
          supabase.from('subscriptions').select('amount').eq('user_id', effectiveUserId).eq('status', 'active'),
          supabase.from('quotes').select('*, customers(name)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }).limit(20),
          supabase.from('products').select('*').eq('user_id', effectiveUserId),
          supabase.from('expenses').select('amount').eq('user_id', effectiveUserId).eq('due_date', todayStr).neq('status', 'pago'),
          supabase.from('bank_accounts').select('balance').eq('user_id', effectiveUserId),
          supabase.from('production_orders').select('*, products(name)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }),
          supabase.from('employees').select('id').eq('user_id', effectiveUserId).eq('status', 'Ativo')
        ]);

        const totalMrr = subsRes.data?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
        const salesToday = salesRes.data?.filter(s => new Date(s.created_at) >= today) || [];
        const totalSalesToday = salesToday.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) || 0;

        let totalStockValue = 0;
        let lowStock: any[] = [];
        if (productsRes.data) {
          totalStockValue = productsRes.data.reduce((acc, curr) => acc + ((curr.stock_quantity || 0) * Number(curr.cost_price || 0)), 0);
          lowStock = productsRes.data.filter(p => (p.stock_quantity || 0) <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 4);
        }

        const pendingProd = ordersRes.data?.filter(o => o.status === 'pending').length || 0;
        const activeProd = ordersRes.data?.filter(o => o.status === 'in_progress').length || 0;

        setStats({
          mrr: totalMrr,
          salesToday: totalSalesToday,
          skus: productsRes.data?.length || 0,
          stockValue: totalStockValue,
          lowStockItems: lowStock,
          expensesTodayCount: expensesRes.data?.length || 0,
          expensesTodayAmount: expensesRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
          totalBalance: accountsRes.data?.reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0,
          pendingProduction: pendingProd,
          activeProduction: activeProd,
          activeEmployees: employeesRes.data?.length || 0,
          recentSales: salesRes.data?.slice(0, 5) || [],
          recentProduction: ordersRes.data?.filter(o => o.status !== 'completed').slice(0, 5) || []
        });
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [effectiveUserId]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="space-y-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Visão Geral</h2>
            <p className="text-zinc-400 mt-1">Status em tempo real de toda a sua operação corporativa.</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-5 py-2.5 rounded-2xl">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <span className="text-[11px] font-black text-zinc-300 uppercase tracking-[0.2em]">Monitoramento Ativo</span>
          </div>
        </div>

        {/* KPIs FINANCEIROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-orange-500/30 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ShoppingCart size={80} /></div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingCart size={14} className="text-orange-500" /> Faturado Hoje
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-700" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-zinc-100">{currencyFormatter.format(stats.salesToday)}</p>
                <p className="text-[10px] text-emerald-500 mt-2 font-bold flex items-center gap-1">
                  <ArrowUpRight size={12} /> Desempenho diário positivo
                </p>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Landmark size={80} /></div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Landmark size={14} className="text-emerald-500" /> Saldo Consolidado
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-700" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-emerald-400">{currencyFormatter.format(stats.totalBalance)}</p>
                <p className="text-[10px] text-zinc-500 mt-2 italic">Consolidado Bancos + Swipy</p>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-red-500/30 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><CalendarClock size={80} /></div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CalendarClock size={14} className="text-red-500" /> Contas a Pagar (Hoje)
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-700" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-zinc-100">{currencyFormatter.format(stats.expensesTodayAmount)}</p>
                <p className="text-[10px] text-red-400 mt-2 font-bold">
                   {stats.expensesTodayCount} lançamentos pendentes
                </p>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" /> Recorrência (MRR)
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-700" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-zinc-100">{currencyFormatter.format(stats.mrr)}</p>
                <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-tighter font-bold">Volume de Assinaturas</p>
              </div>
            )}
          </div>
        </div>

        {/* OPERAÇÕES E LISTAS RECENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl">
              <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/20">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Factory size={16} className="text-orange-500" /> Atividade Industrial
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-inner">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Aguardando</p>
                    <p className="text-3xl font-black text-zinc-100">{stats.pendingProduction}</p>
                  </div>
                  <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-inner">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Em Produção</p>
                    <p className="text-3xl font-black text-orange-500">{stats.activeProduction}</p>
                  </div>
                </div>
                <Link to="/industria/producao" className="mt-8 flex items-center justify-between text-[11px] font-bold uppercase text-orange-500 hover:text-orange-400 transition-all bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 group">
                  Monitorar Chão de Fábrica
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="p-8 flex-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Package size={16} className="text-blue-500" /> Patrimônio em Estoque
                </h3>
                <div className="space-y-5">
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-zinc-400 font-medium">Total de SKUs</span>
                     <span className="text-sm font-bold text-zinc-100">{stats.skus} itens</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-zinc-400 font-medium">Custo Total de Inventário</span>
                     <span className="text-sm font-bold text-blue-400">{currencyFormatter.format(stats.stockValue)}</span>
                   </div>
                   <div className="pt-2">
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: '72%' }} />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2 font-medium">Capacidade de armazenamento otimizada</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingCart size={16} className="text-orange-500" /> Fluxo de Vendas Recentes
                </h3>
                <Link to="/vendas/lista" className="text-[10px] font-bold text-zinc-500 hover:text-orange-500 transition-colors uppercase tracking-widest">Ver Tudo</Link>
              </div>

              <div className="space-y-3">
                {stats.recentSales.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-4">Nenhuma venda registrada recentemente.</p>
                ) : (
                  stats.recentSales.map(sale => (
                    <div key={sale.id} className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-all">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-zinc-200 truncate">{sale.customers?.name || 'Venda PDV'}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-mono mt-0.5">Ref: #{sale.id.split('-')[0]}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-sm font-black text-zinc-100">{currencyFormatter.format(sale.total_amount)}</p>
                         <p className="text-[9px] text-zinc-600 font-bold uppercase mt-0.5">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Alertas de Reposição
              </h3>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-zinc-700" size={24} /></div>
                ) : stats.lowStockItems.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-[2rem]">
                     <p className="text-xs text-zinc-600 italic">Estoque 100% regularizado.</p>
                  </div>
                ) : (
                  <>
                    {stats.lowStockItems.map(item => (
                      <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center group hover:border-red-500/30 transition-all">
                        <div className="overflow-hidden pr-2">
                          <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-red-400 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{item.sku}</p>
                        </div>
                        <div className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border",
                          item.stock_quantity <= 2 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {item.stock_quantity} un
                        </div>
                      </div>
                    ))}
                    <Link to="/estoque/produtos" className="block text-center text-[10px] text-zinc-500 font-black uppercase hover:text-orange-500 mt-6 tracking-[0.2em] transition-colors">
                      Plano de Suprimentos
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Pipeline Industrial
              </h3>
              
              <div className="space-y-4">
                {stats.recentProduction.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-4 text-center">Nenhuma ordem ativa.</p>
                ) : (
                  stats.recentProduction.map(order => (
                    <div key={order.id} className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        order.status === 'in_progress' ? "bg-blue-500 animate-pulse" : "bg-yellow-500"
                      )} />
                      <div className="flex-1 overflow-hidden">
                         <p className="text-xs font-bold text-zinc-200 truncate">{order.products?.name}</p>
                         <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{order.quantity} unidades</p>
                      </div>
                      <div className="shrink-0">
                         {order.status === 'in_progress' ? <PlayCircle size={14} className="text-blue-500" /> : <Clock size={14} className="text-zinc-700" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden group">
               <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Users size={120} />
               </div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Equipe Ativa</p>
                 <h4 className="text-2xl font-black text-zinc-100 mb-6">{stats.activeEmployees} <span className="text-sm font-normal text-zinc-500">Colaboradores</span></h4>
                 <Link to="/rh/colaboradores" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400 hover:text-white transition-colors bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
                   Gestão de Pessoas <ArrowRight size={14} />
                 </Link>
               </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default OverviewDashboard;