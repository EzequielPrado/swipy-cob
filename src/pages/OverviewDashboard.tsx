"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
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
  PlayCircle,
  Store,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import FinancialAgenda from '@/components/financial/FinancialAgenda';
import LiveOperationFeed from '@/components/dashboard/LiveOperationFeed';

const OverviewDashboard = () => {
  const { effectiveUserId, profile, activeMerchant } = useAuth();
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

  // Verificação de Acesso por Módulo (Plano do Usuário)
  const activePlanFeatures = activeMerchant ? (activeMerchant.system_plans?.features || []) : (profile?.system_plans?.features || []);
  const isSuperAdmin = profile?.is_admin && !activeMerchant;
  
  const canSee = (mod: string, sub: string) => {
    if (isSuperAdmin) return true;
    if (!activePlanFeatures || activePlanFeatures.length === 0) return false;
    return activePlanFeatures.includes(mod) || activePlanFeatures.includes(sub);
  };

  const showSalesCard = canSee('vendas', 'vendas_dashboard');
  const showBalanceCard = canSee('financeiro', 'financeiro_dashboard');
  const showPayablesCard = canSee('financeiro', 'financeiro_pagar');
  const showMrrCard = canSee('financeiro', 'financeiro_contratos');
  const showProduction = canSee('estoque', 'industria_producao');
  const showStock = canSee('estoque', 'estoque_produtos');
  const showRecentSales = canSee('vendas', 'vendas_lista');
  const showHR = canSee('rh', 'rh_colaboradores');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!effectiveUserId) return;
      setLoading(true);
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const { data: { session } } = await supabase.auth.getSession();

        const promises: any[] = [];
        let subsIdx = -1, salesIdx = -1, productsIdx = -1, expensesIdx = -1, accountsIdx = -1, ordersIdx = -1, employeesIdx = -1, wooviIdx = -1;

        if (showMrrCard) {
          subsIdx = promises.length;
          promises.push(supabase.from('subscriptions').select('amount').eq('user_id', effectiveUserId).eq('status', 'active'));
        }
        if (showSalesCard || showRecentSales) {
          salesIdx = promises.length;
          promises.push(supabase.from('quotes').select('*, customers(name), charges(correlation_id)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }).limit(20));
        }
        if (showStock) {
          productsIdx = promises.length;
          promises.push(supabase.from('products').select('*').eq('user_id', effectiveUserId));
        }
        if (showPayablesCard) {
          expensesIdx = promises.length;
          promises.push(supabase.from('expenses').select('amount').eq('user_id', effectiveUserId).eq('due_date', todayStr).neq('status', 'pago'));
        }
        if (showBalanceCard) {
          accountsIdx = promises.length;
          promises.push(supabase.from('bank_accounts').select('balance, type').eq('user_id', effectiveUserId));
          wooviIdx = promises.length;
          promises.push(fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          }).then(res => res.json()).catch(() => ({ balance: { total: 0 } })));
        }
        if (showProduction) {
          ordersIdx = promises.length;
          promises.push(supabase.from('production_orders').select('*, products(name)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }));
        }
        if (showHR) {
          employeesIdx = promises.length;
          promises.push(supabase.from('employees').select('id').eq('user_id', effectiveUserId).eq('status', 'Ativo'));
        }

        const results = await Promise.all(promises);

        const subsRes = subsIdx > -1 ? results[subsIdx] : { data: [] };
        const salesRes = salesIdx > -1 ? results[salesIdx] : { data: [] };
        const productsRes = productsIdx > -1 ? results[productsIdx] : { data: [] };
        const expensesRes = expensesIdx > -1 ? results[expensesIdx] : { data: [] };
        const accountsRes = accountsIdx > -1 ? results[accountsIdx] : { data: [] };
        const wooviRes = wooviIdx > -1 ? results[wooviIdx] : { balance: { total: 0 } };
        const ordersRes = ordersIdx > -1 ? results[ordersIdx] : { data: [] };
        const employeesRes = employeesIdx > -1 ? results[employeesIdx] : { data: [] };

        const totalMrr = subsRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;
        const salesTodayList = salesRes.data?.filter((s: any) => new Date(s.created_at) >= today) || [];
        const totalSalesToday = salesTodayList.reduce((acc: number, curr: any) => acc + Number(curr.total_amount || 0), 0) || 0;

        let totalStockValue = 0;
        let lowStock: any[] = [];
        if (productsRes.data) {
          totalStockValue = productsRes.data.reduce((acc: number, curr: any) => acc + ((curr.stock_quantity || 0) * Number(curr.cost_price || 0)), 0);
          lowStock = productsRes.data.filter((p: any) => (p.stock_quantity || 0) <= 5).sort((a: any, b: any) => a.stock_quantity - b.stock_quantity).slice(0, 4);
        }

        const pendingProd = ordersRes.data?.filter((o: any) => o.status === 'pending').length || 0;
        const activeProd = ordersRes.data?.filter((o: any) => o.status === 'in_progress').length || 0;

        const swipyApiBalance = (wooviRes?.balance?.total || 0) / 100;
        const manualBanksBalance = accountsRes.data?.filter((acc: any) => acc.type !== 'swipy').reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0) || 0;
        const consolidatedTotal = swipyApiBalance + manualBanksBalance;

        setStats({
          mrr: totalMrr,
          salesToday: totalSalesToday,
          skus: productsRes.data?.length || 0,
          stockValue: totalStockValue,
          lowStockItems: lowStock,
          expensesTodayCount: expensesRes.data?.length || 0,
          expensesTodayAmount: expensesRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0,
          totalBalance: consolidatedTotal,
          pendingProduction: pendingProd,
          activeProduction: activeProd,
          activeEmployees: employeesRes.data?.length || 0,
          recentSales: salesRes.data?.slice(0, 5) || [],
          recentProduction: ordersRes.data?.filter((o: any) => o.status !== 'completed').slice(0, 5) || []
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
            <p className="text-apple-muted mt-1 font-medium">Status em tempo real da sua operação.</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-apple-white border border-apple-border px-5 py-2.5 rounded-2xl shadow-sm">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <span className="text-[11px] font-bold text-apple-dark uppercase tracking-[0.15em]">Monitoramento Ativo</span>
          </div>
        </div>

        {/* KPIs FINANCEIROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {showSalesCard && (
            <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ShoppingCart size={80} /></div>
              <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShoppingCart size={14} className="text-orange-500" /> Faturado Hoje
              </h3>
              <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.salesToday)}</p>
            </div>
          )}
          {showBalanceCard && (
            <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Landmark size={80} /></div>
              <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <Landmark size={14} className="text-emerald-500" /> Saldo Consolidado
              </h3>
              <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.totalBalance)}</p>
            </div>
          )}
          {showPayablesCard && (
            <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><CalendarClock size={80} /></div>
              <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <CalendarClock size={14} className="text-red-500" /> Contas a Pagar (Hoje)
              </h3>
              <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.expensesTodayAmount)}</p>
            </div>
          )}
          {showMrrCard && (
            <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
              <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-500" /> Recorrência (MRR)
              </h3>
              <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(stats.mrr)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* NOVO WIDGET: FEED DE OPERAÇÕES EM TEMPO REAL */}
            <LiveOperationFeed userId={effectiveUserId!} />

            {showRecentSales && (
              <div className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-bold text-apple-black uppercase tracking-widest flex items-center gap-2">
                    <ShoppingCart size={16} className="text-orange-500" /> Vendas Recentes
                  </h3>
                  <Link to="/vendas/lista" className="text-[10px] font-bold text-apple-muted hover:text-orange-500 transition-colors uppercase tracking-widest">Ver Tudo</Link>
                </div>
                <div className="space-y-3">
                  {stats.recentSales.map(sale => (
                    <div key={sale.id} className="bg-apple-offWhite border border-apple-border p-4 rounded-2xl flex items-center justify-between group hover:border-apple-dark transition-all">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-white border border-apple-border flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-105 transition-transform">
                          <CheckCircle2 size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-apple-black truncate">{sale.customers?.name || 'Venda PDV'}</p>
                          <p className="text-[10px] text-apple-muted uppercase font-mono">Ref: #{sale.id.split('-')[0]}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-sm font-black text-apple-black">{currencyFormatter.format(sale.total_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {showStock && (
              <div className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm">
                <h3 className="text-xs font-bold text-apple-muted uppercase tracking-widest mb-8 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" /> Reposição de Estoque
                </h3>
                <div className="space-y-4">
                  {stats.lowStockItems.map(item => (
                    <div key={item.id} className="bg-apple-offWhite border border-apple-border p-4 rounded-2xl flex justify-between items-center group hover:border-red-200 transition-all">
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-bold text-apple-black truncate">{item.name}</p>
                        <p className="text-[10px] text-apple-muted font-mono mt-0.5">{item.sku}</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border bg-orange-50 text-orange-600 border-orange-200">
                        {item.stock_quantity} un
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showHR && (
              <div className="bg-apple-black p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                 <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <Users size={120} />
                 </div>
                 <div className="relative z-10">
                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Equipe Ativa</p>
                   <h4 className="text-2xl font-black text-white mb-6">{stats.activeEmployees} <span className="text-sm font-normal text-zinc-400">Pessoas</span></h4>
                   <Link to="/rh/colaboradores" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-white hover:text-orange-500 transition-colors bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 shadow-sm">
                     Ver Quadro <ArrowRight size={14} />
                   </Link>
                 </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-apple-border">
           <FinancialAgenda />
        </div>
      </div>
    </AppLayout>
  );
};

export default OverviewDashboard;