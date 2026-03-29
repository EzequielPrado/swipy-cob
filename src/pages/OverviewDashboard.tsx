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
import FinancialAgenda from '@/components/financial/FinancialAgenda';

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

        // 1. Buscar Sessão para API Woovi
        const { data: { session } } = await supabase.auth.getSession();

        // 2. Buscar Dados em paralelo
        const [subsRes, salesRes, productsRes, expensesRes, accountsRes, ordersRes, employeesRes, wooviRes] = await Promise.all([
          supabase.from('subscriptions').select('amount').eq('user_id', effectiveUserId).eq('status', 'active'),
          supabase.from('quotes').select('*, customers(name)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }).limit(20),
          supabase.from('products').select('*').eq('user_id', effectiveUserId),
          supabase.from('expenses').select('amount').eq('user_id', effectiveUserId).eq('due_date', todayStr).neq('status', 'pago'),
          supabase.from('bank_accounts').select('balance, type').eq('user_id', effectiveUserId),
          supabase.from('production_orders').select('*, products(name)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }),
          supabase.from('employees').select('id').eq('user_id', effectiveUserId).eq('status', 'Ativo'),
          fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          }).then(res => res.json()).catch(() => ({ balance: { total: 0 } }))
        ]);

        // MRR
        const totalMrr = subsRes.data?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
        
        // Vendas Hoje
        const salesToday = salesRes.data?.filter(s => new Date(s.created_at) >= today) || [];
        const totalSalesToday = salesToday.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) || 0;

        // Estoque
        let totalStockValue = 0;
        let lowStock: any[] = [];
        if (productsRes.data) {
          totalStockValue = productsRes.data.reduce((acc, curr) => acc + ((curr.stock_quantity || 0) * Number(curr.cost_price || 0)), 0);
          lowStock = productsRes.data.filter(p => (p.stock_quantity || 0) <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 4);
        }

        // Produção
        const pendingProd = ordersRes.data?.filter(o => o.status === 'pending').length || 0;
        const activeProd = ordersRes.data?.filter(o => o.status === 'in_progress').length || 0;

        // CÁLCULO DO SALDO CONSOLIDADO (API Woovi + Bancos Manuais)
        const swipyApiBalance = (wooviRes?.balance?.total || 0) / 100;
        const manualBanksBalance = accountsRes.data?.filter(acc => acc.type !== 'swipy').reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0;
        const consolidatedTotal = swipyApiBalance + manualBanksBalance;

        setStats({
          mrr: totalMrr,
          salesToday: totalSalesToday,
          skus: productsRes.data?.length || 0,
          stockValue: totalStockValue,
          lowStockItems: lowStock,
          expensesTodayCount: expensesRes.data?.length || 0,
          expensesTodayAmount: expensesRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
          totalBalance: consolidatedTotal,
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
      <div className="space-y-12 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Visão Geral</h2>
            <p className="text-apple-muted mt-1 font-medium">Status em tempo real de toda a sua operação corporativa.</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-apple-white border border-apple-border px-5 py-2.5 rounded-2xl shadow-sm">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <span className="text-[11px] font-bold text-apple-dark uppercase tracking-[0.15em]">Monitoramento Ativo</span>
          </div>
        </div>

        {/* KPIs FINANCEIROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ShoppingCart size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingCart size={14} className="text-orange-500" /> Faturado Hoje
            </h3>
            {loading ? <Loader2 className="animate-spin text-apple-muted" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.salesToday)}</p>
                <p className="text-[10px] text-emerald-600 mt-2 font-bold flex items-center gap-1">
                  <ArrowUpRight size={12} /> Desempenho diário positivo
                </p>
              </div>
            )}
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Landmark size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <Landmark size={14} className="text-emerald-500" /> Saldo Consolidado
            </h3>
            {loading ? <Loader2 className="animate-spin text-apple-muted" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.totalBalance)}</p>
                <p className="text-[10px] text-apple-muted mt-2 italic">Consolidado Bancos + Swipy</p>
              </div>
            )}
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><CalendarClock size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <CalendarClock size={14} className="text-red-500" /> Contas a Pagar (Hoje)
            </h3>
            {loading ? <Loader2 className="animate-spin text-apple-muted" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.expensesTodayAmount)}</p>
                <p className="text-[10px] text-red-500 mt-2 font-bold">
                   {stats.expensesTodayCount} lançamentos pendentes
                </p>
              </div>
            )}
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" /> Recorrência (MRR)
            </h3>
            {loading ? <Loader2 className="animate-spin text-apple-muted" size={24} /> : (
              <div>
                <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.mrr)}</p>
                <p className="text-[10px] text-apple-muted mt-2 uppercase tracking-tight font-bold">Volume de Assinaturas</p>
              </div>
            )}
          </div>
        </div>

        {/* OPERAÇÕES E LISTAS RECENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-sm">
              <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-apple-border bg-apple-offWhite">
                <h3 className="text-xs font-bold text-apple-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Factory size={16} className="text-orange-500" /> Atividade Industrial
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-apple-white p-5 rounded-2xl border border-apple-border shadow-sm">
                    <p className="text-[10px] text-apple-muted font-bold uppercase mb-1">Aguardando</p>
                    <p className="text-3xl font-black text-apple-black">{stats.pendingProduction}</p>
                  </div>
                  <div className="bg-apple-white p-5 rounded-2xl border border-apple-border shadow-sm">
                    <p className="text-[10px] text-apple-muted font-bold uppercase mb-1">Em Produção</p>
                    <p className="text-3xl font-black text-orange-500">{stats.activeProduction}</p>
                  </div>
                </div>
                <Link to="/industria/producao" className="mt-8 flex items-center justify-between text-[11px] font-bold uppercase text-orange-600 hover:text-orange-500 transition-all bg-orange-50 p-4 rounded-xl border border-orange-100 group">
                  Monitorar Chão de Fábrica
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="p-8 flex-1">
                <h3 className="text-xs font-bold text-apple-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Package size={16} className="text-blue-500" /> Patrimônio em Estoque
                </h3>
                <div className="space-y-5">
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-apple-dark font-medium">Total de SKUs</span>
                     <span className="text-sm font-bold text-apple-black">{stats.skus} itens</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-apple-dark font-medium">Custo Total de Inventário</span>
                     <span className="text-sm font-bold text-blue-600">{currencyFormatter.format(stats.stockValue)}</span>
                   </div>
                   <div className="pt-2">
                    <div className="h-2.5 bg-apple-border rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: '72%' }} />
                    </div>
                    <p className="text-[10px] text-apple-muted mt-2 font-medium">Capacidade de armazenamento otimizada</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold text-apple-black uppercase tracking-widest flex items-center gap-2">
                  <ShoppingCart size={16} className="text-orange-500" /> Fluxo de Vendas Recentes
                </h3>
                <Link to="/vendas/lista" className="text-[10px] font-bold text-apple-muted hover:text-orange-500 transition-colors uppercase tracking-widest">Ver Tudo</Link>
              </div>

              <div className="space-y-3">
                {stats.recentSales.length === 0 ? (
                  <p className="text-xs text-apple-muted italic py-4">Nenhuma venda registrada recentemente.</p>
                ) : (
                  stats.recentSales.map(sale => (
                    <div key={sale.id} className="bg-apple-offWhite border border-apple-border p-4 rounded-2xl flex items-center justify-between group hover:border-apple-dark transition-all">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-white border border-apple-border flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-105 transition-transform">
                          <CheckCircle2 size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-apple-black truncate">{sale.customers?.name || 'Venda PDV'}</p>
                          <p className="text-[10px] text-apple-muted uppercase font-mono mt-0.5">Ref: #{sale.id.split('-')[0]}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-sm font-black text-apple-black">{currencyFormatter.format(sale.total_amount)}</p>
                         <p className="text-[9px] text-apple-muted font-bold uppercase mt-0.5">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-xs font-bold text-apple-muted uppercase tracking-widest mb-8 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Alertas de Reposição
              </h3>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-apple-muted" size={24} /></div>
                ) : stats.lowStockItems.length === 0 ? (
                  <div className="text-center py-12 bg-apple-offWhite border border-dashed border-apple-border rounded-2xl">
                     <p className="text-xs text-apple-muted italic">Estoque 100% regularizado.</p>
                  </div>
                ) : (
                  <>
                    {stats.lowStockItems.map(item => (
                      <div key={item.id} className="bg-apple-offWhite border border-apple-border p-4 rounded-2xl flex justify-between items-center group hover:border-red-200 transition-all">
                        <div className="overflow-hidden pr-2">
                          <p className="text-sm font-bold text-apple-black truncate group-hover:text-red-500 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-apple-muted font-mono mt-0.5">{item.sku}</p>
                        </div>
                        <div className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border",
                          item.stock_quantity <= 2 ? "bg-red-50 text-red-600 border-red-200" : "bg-orange-50 text-orange-600 border-orange-200"
                        )}>
                          {item.stock_quantity} un
                        </div>
                      </div>
                    ))}
                    <Link to="/estoque/produtos" className="block text-center text-[10px] text-apple-muted font-bold uppercase hover:text-orange-500 mt-6 tracking-widest transition-colors">
                      Plano de Suprimentos
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-xs font-bold text-apple-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Pipeline Industrial
              </h3>
              
              <div className="space-y-4">
                {stats.recentProduction.length === 0 ? (
                  <p className="text-xs text-apple-muted italic py-4 text-center">Nenhuma ordem ativa.</p>
                ) : (
                  stats.recentProduction.map(order => (
                    <div key={order.id} className="flex items-center gap-4 p-4 bg-apple-offWhite border border-apple-border rounded-2xl">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        order.status === 'in_progress' ? "bg-blue-500 animate-pulse" : "bg-yellow-500"
                      )} />
                      <div className="flex-1 overflow-hidden">
                         <p className="text-xs font-bold text-apple-black truncate">{order.products?.name}</p>
                         <p className="text-[9px] text-apple-muted font-bold uppercase mt-0.5">{order.quantity} unidades</p>
                      </div>
                      <div className="shrink-0">
                         {order.status === 'in_progress' ? <PlayCircle size={14} className="text-blue-500" /> : <Clock size={14} className="text-apple-muted" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-apple-white to-apple-offWhite p-8 rounded-[2rem] border border-apple-border shadow-sm relative overflow-hidden group">
               <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Users size={120} />
               </div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Equipe Ativa</p>
                 <h4 className="text-2xl font-black text-apple-black mb-6">{stats.activeEmployees} <span className="text-sm font-normal text-apple-muted">Colaboradores</span></h4>
                 <Link to="/rh/colaboradores" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-apple-dark hover:text-apple-black transition-colors bg-white px-4 py-2.5 rounded-xl border border-apple-border shadow-sm">
                   Gestão de Pessoas <ArrowRight size={14} />
                 </Link>
               </div>
            </div>
          </div>
        </div>

        {/* AGENDA FINANCEIRA INTEGRADA */}
        <div className="pt-8 border-t border-apple-border">
           <FinancialAgenda title="Agenda do Negócio" description="Resumo diário de compromissos financeiros e operacionais." />
        </div>
      </div>
    </AppLayout>
  );
};

export default OverviewDashboard;