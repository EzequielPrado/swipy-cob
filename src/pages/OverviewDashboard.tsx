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
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import FinancialAgenda from '@/components/financial/FinancialAgenda';

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

  const hasAnyWidget = showSalesCard || showBalanceCard || showPayablesCard || showMrrCard || showProduction || showStock || showRecentSales || showHR;

  // Variáveis para layout dinâmico
  const kpiCount = [showSalesCard, showBalanceCard, showPayablesCard, showMrrCard].filter(Boolean).length;
  const kpiGridClass = 
    kpiCount === 1 ? "grid-cols-1" : 
    kpiCount === 2 ? "grid-cols-1 md:grid-cols-2" : 
    kpiCount === 3 ? "grid-cols-1 md:grid-cols-3" : 
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  const hasLeftCol = showProduction || showStock || showRecentSales;
  const hasRightCol = showStock || showProduction || showHR;

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

        {!loading && !hasAnyWidget && (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-dashed border-apple-border rounded-[3rem] bg-apple-white shadow-sm">
            <ShieldCheck size={48} className="text-apple-muted mb-6 opacity-40" />
            <h3 className="text-2xl font-black text-apple-black mb-3 tracking-tight">Ambiente em Configuração</h3>
            <p className="text-apple-muted font-medium max-w-md">
              Seu plano atual não possui módulos de gestão ativados na tela inicial ou você ainda não os configurou. 
              Navegue pelo menu lateral para acessar os módulos liberados para o seu perfil.
            </p>
          </div>
        )}

        {/* KPIs FINANCEIROS */}
        {(showSalesCard || showBalanceCard || showPayablesCard || showMrrCard) && (
          <div className={cn("grid gap-6", kpiGridClass)}>
            
            {showSalesCard && (
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
            )}

            {showBalanceCard && (
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
            )}

            {showPayablesCard && (
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
            )}

            {showMrrCard && (
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
            )}

          </div>
        )}

        {/* OPERAÇÕES E LISTAS RECENTES */}
        {(hasLeftCol || hasRightCol) && (
          <div className={cn(
            "grid grid-cols-1 gap-8",
            hasLeftCol && hasRightCol ? "lg:grid-cols-3" : "lg:grid-cols-1"
          )}>
            
            {hasLeftCol && (
              <div className={cn("space-y-8", hasRightCol ? "lg:col-span-2" : "col-span-1")}>
                {(showProduction || showStock) && (
                  <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-sm">
                    {showProduction && (
                      <div className={cn("p-8 flex-1 bg-apple-offWhite", showStock ? "border-b md:border-b-0 md:border-r border-apple-border" : "")}>
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
                    )}

                    {showStock && (
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
                             <span className="text-sm text-apple-dark font-medium">Custo de Inventário</span>
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
                    )}
                  </div>
                )}

                {showRecentSales && (
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
                        stats.recentSales.map(sale => {
                          const isNuvem = sale.charges?.some((c: any) => c.correlation_id?.startsWith('nuvem_'));

                          return (
                            <div key={sale.id} className="bg-apple-offWhite border border-apple-border p-4 rounded-2xl flex items-center justify-between group hover:border-apple-dark transition-all">
                              <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-10 h-10 rounded-xl bg-white border border-apple-border flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-105 transition-transform">
                                  {isNuvem ? <Store size={18} className="text-blue-600" /> : <CheckCircle2 size={18} />}
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-bold text-apple-black truncate">{sale.customers?.name || 'Venda PDV'}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-apple-muted uppercase font-mono">Ref: #{sale.id.split('-')[0]}</p>
                                    {isNuvem && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Nuvemshop</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                 <p className="text-sm font-black text-apple-black">{currencyFormatter.format(sale.total_amount)}</p>
                                 <p className="text-[9px] text-apple-muted font-bold uppercase mt-0.5">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasRightCol && (
              <div className={cn(
                hasLeftCol ? "space-y-8" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              )}>
                {showStock && (
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
                )}

                {showProduction && (
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
                )}

                {showHR && (
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
                )}
              </div>
            )}
          </div>
        )}

        {/* AGENDA FINANCEIRA INTEGRADA */}
        {showBalanceCard && (
          <div className="pt-8 border-t border-apple-border">
             <FinancialAgenda title="Agenda do Negócio" description="Resumo diário de compromissos financeiros e operacionais." />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OverviewDashboard;