"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Target, 
  Package, 
  Users, 
  Loader2, 
  Award,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';

const SalesDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    totalOrders: 0,
    conversionRate: 0,
    avgTicket: 0,
  });

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Buscar todas as vendas/orçamentos
        const { data: quotes } = await supabase
          .from('quotes')
          .select('*, employees(full_name)')
          .eq('user_id', user.id);

        if (!quotes) return;

        // Métricas Gerais
        const approvedQuotes = quotes.filter(q => q.status !== 'draft');
        const totalVolume = approvedQuotes.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
        const avgTicket = approvedQuotes.length > 0 ? totalVolume / approvedQuotes.length : 0;
        const conversionRate = quotes.length > 0 ? (approvedQuotes.length / quotes.length) * 100 : 0;

        setMetrics({
          totalVolume,
          totalOrders: approvedQuotes.length,
          conversionRate,
          avgTicket
        });

        // Ranking de Vendedores
        const sellerMap: Record<string, { name: string, total: number, count: number }> = {};
        approvedQuotes.forEach(q => {
          const sellerName = q.employees?.full_name || 'Venda Direta';
          if (!sellerMap[sellerName]) sellerMap[sellerName] = { name: sellerName, total: 0, count: 0 };
          sellerMap[sellerName].total += Number(q.total_amount);
          sellerMap[sellerName].count += 1;
        });

        const sellersChart = Object.values(sellerMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopSellers(sellersChart);

        // 2. Buscar Itens para Curva ABC (Top Produtos)
        const quoteIds = approvedQuotes.map(q => q.id);
        if (quoteIds.length > 0) {
          const { data: items } = await supabase
            .from('quote_items')
            .select('*, products(name)')
            .in('quote_id', quoteIds);

          if (items) {
            const productMap: Record<string, { name: string, qty: number, total: number }> = {};
            items.forEach(i => {
              const pName = i.products?.name || 'Produto Removido';
              if (!productMap[pName]) productMap[pName] = { name: pName, qty: 0, total: 0 };
              productMap[pName].qty += i.quantity;
              productMap[pName].total += Number(i.total_price);
            });

            const productsChart = Object.values(productMap)
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5);
            setTopProducts(productsChart);
          }
        }

        // Tendência de Vendas (Últimos 7 dias simulado agrupando as datas)
        const trendMap: Record<string, number> = {};
        approvedQuotes.forEach(q => {
          const date = new Date(q.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (!trendMap[date]) trendMap[date] = 0;
          trendMap[date] += Number(q.total_amount);
        });

        // Ordenar as datas
        const trendChart = Object.keys(trendMap)
          .sort((a, b) => {
            const [d1, m1] = a.split('/');
            const [d2, m2] = b.split('/');
            return new Date(2024, Number(m1)-1, Number(d1)).getTime() - new Date(2024, Number(m2)-1, Number(d2)).getTime();
          })
          .slice(-7)
          .map(k => ({ date: k, volume: trendMap[k] }));

        setSalesTrend(trendChart);

      } catch (err) {
        console.error("Erro ao montar dashboard de vendas", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="text-orange-500" size={32} />
            Dashboard de Vendas
          </h2>
          <p className="text-zinc-400 mt-1">Métricas, performance e curva ABC dos seus produtos.</p>
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border-t-orange-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <TrendingUp size={14} className="text-orange-500" /> Volume Faturado
            </p>
            <p className="text-3xl font-black text-zinc-100">{currencyFormatter.format(metrics.totalVolume)}</p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border-t-emerald-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <ShoppingCart size={14} className="text-emerald-500" /> Pedidos Fechados
            </p>
            <p className="text-3xl font-black text-zinc-100">{metrics.totalOrders}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border-t-blue-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Percent size={14} className="text-blue-500" /> Conversão
            </p>
            <p className="text-3xl font-black text-blue-400">{metrics.conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-zinc-500 mt-1">Orçamentos x Pagos</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border-t-purple-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Award size={14} className="text-purple-500" /> Ticket Médio
            </p>
            <p className="text-3xl font-black text-zinc-100">{currencyFormatter.format(metrics.avgTicket)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CURVA ABC (Produtos) */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <h3 className="font-bold text-zinc-100 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Package size={18} className="text-orange-500" /> Top Produtos (Qtd. Vendida)
            </h3>
            <div className="h-[300px] w-full">
              {topProducts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Sem dados suficientes.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} width={100} />
                    <Tooltip 
                      cursor={{fill: '#27272a'}}
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                      itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="qty" fill="#f97316" radius={[0, 4, 4, 0]} barSize={24} name="Unidades" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* RANKING VENDEDORES */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <h3 className="font-bold text-zinc-100 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Users size={18} className="text-blue-500" /> Ranking de Vendedores
            </h3>
            <div className="space-y-4">
              {topSellers.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-zinc-500 text-sm">Sem dados suficientes.</div>
              ) : (
                topSellers.map((seller, idx) => (
                  <div key={seller.name} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border",
                        idx === 0 ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" :
                        idx === 1 ? "bg-zinc-400/20 text-zinc-300 border-zinc-400/30" :
                        idx === 2 ? "bg-orange-700/20 text-orange-600 border-orange-700/30" :
                        "bg-zinc-800 text-zinc-500 border-zinc-700"
                      )}>
                        {idx + 1}º
                      </div>
                      <div>
                        <p className="font-bold text-zinc-200">{seller.name}</p>
                        <p className="text-[10px] text-zinc-500">{seller.count} vendas concluídas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-400">{currencyFormatter.format(seller.total)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TENDÊNCIA DE VENDAS */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <h3 className="font-bold text-zinc-100 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <TrendingUp size={18} className="text-emerald-500" /> Evolução (Últimos 7 dias)
            </h3>
            <div className="h-[250px] w-full">
              {salesTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Sem dados suficientes.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      formatter={(value: number) => [currencyFormatter.format(value), 'Faturado']}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#09090b' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default SalesDashboard;