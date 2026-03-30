"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
  Percent,
  CalendarDays,
  Store
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';

const SalesDashboard = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
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

  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    totalOrders: 0,
    conversionRate: 0,
    avgTicket: 0
  });

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!effectiveUserId) return;
      setLoading(true);

      try {
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

        // 1. Buscando as Vendas e as correlações corretamente sem Join FK
        const { data: quotesData, error: quotesErr } = await supabase
          .from('quotes')
          .select('*, employees(full_name)')
          .eq('user_id', effectiveUserId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (quotesErr) throw quotesErr;
        const quotes = quotesData || [];

        const quoteIds = quotes.map(q => q.id);
        let chargesData: any[] = [];

        if (quoteIds.length > 0) {
          const { data: cData, error: cErr } = await supabase
            .from('charges')
            .select('quote_id, correlation_id')
            .in('quote_id', quoteIds);
          
          if (!cErr && cData) chargesData = cData;
        }

        const enrichedQuotes = quotes.map(q => ({
          ...q,
          charges: chargesData.filter(c => c.quote_id === q.id)
        }));

        // Consideramos "pedidos fechados" tudo que não é draft
        const approvedQuotes = enrichedQuotes.filter(q => q.status !== 'draft');
        const totalVolume = approvedQuotes.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
        const avgTicket = approvedQuotes.length > 0 ? totalVolume / approvedQuotes.length : 0;
        const conversionRate = quotes.length > 0 ? (approvedQuotes.length / quotes.length) * 100 : 0;

        setMetrics({
          totalVolume,
          totalOrders: approvedQuotes.length,
          conversionRate,
          avgTicket
        });

        // Ranking de Vendedores (Separando E-commerce de Balcão)
        const sellerMap: Record<string, { name: string, total: number, count: number, isNuvem: boolean }> = {};
        approvedQuotes.forEach(q => {
          const isNuvemshop = q.charges?.some((c: any) => c.correlation_id?.startsWith('nuvem_'));
          const sellerName = isNuvemshop ? 'E-commerce Nuvemshop' : (q.employees?.full_name || 'Balcão / PDV');
          
          if (!sellerMap[sellerName]) {
            sellerMap[sellerName] = { name: sellerName, total: 0, count: 0, isNuvem: isNuvemshop };
          }
          sellerMap[sellerName].total += Number(q.total_amount);
          sellerMap[sellerName].count += 1;
        });

        const sellersChart = Object.values(sellerMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopSellers(sellersChart);

        // Curva ABC de Produtos
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
              productMap[pName].qty += Number(i.quantity);
              productMap[pName].total += Number(i.total_price);
            });
            const pChart = Object.values(productMap)
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5);
            setTopProducts(pChart);
          }
        } else {
          setTopProducts([]);
        }

        // Fluxo de Faturamento Diário
        const trendMap: Record<string, number> = {};
        approvedQuotes.forEach(q => {
          const dateStr = new Date(q.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          trendMap[dateStr] = (trendMap[dateStr] || 0) + Number(q.total_amount);
        });

        const sortedTrend = Object.keys(trendMap)
          .map(k => ({ date: k, value: trendMap[k] }))
          .sort((a, b) => {
            const [d1, m1] = a.date.split('/');
            const [d2, m2] = b.date.split('/');
            return new Date(2000, Number(m1)-1, Number(d1)).getTime() - new Date(2000, Number(m2)-1, Number(d2)).getTime();
          });
        
        setSalesTrend(sortedTrend);

      } catch (err: any) {
        console.error("Erro ao carregar dashboard de vendas:", err);
        showError("Falha na sincronização do Dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [effectiveUserId, selectedMonth]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Award className="text-orange-500" size={32} /> Performance de Vendas
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Analise as métricas de conversão e faturamento do seu negócio.</p>
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

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-orange-500" /> Faturamento Total
            </h3>
            <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(metrics.totalVolume)}</p>
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ShoppingCart size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingCart size={14} className="text-blue-500" /> Volume de Pedidos
            </h3>
            <p className="text-3xl font-black text-apple-black">{metrics.totalOrders} <span className="text-base text-apple-muted font-bold">pedidos fechados</span></p>
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Target size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={14} className="text-emerald-500" /> Ticket Médio
            </h3>
            <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(metrics.avgTicket)}</p>
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-purple-200 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Percent size={80} /></div>
            <h3 className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <Percent size={14} className="text-purple-500" /> Taxa de Conversão
            </h3>
            <p className="text-3xl font-black text-apple-black">{metrics.conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-apple-muted font-bold mt-2">Fechamentos / Orçamentos Totais</p>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CURVA ABC (Produtos) */}
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
            <h3 className="font-bold text-apple-black mb-8 flex items-center gap-2 text-xs uppercase tracking-widest">
              <Package size={18} className="text-orange-500" /> Top Produtos (Unidades)
            </h3>
            <div className="h-[300px] w-full">
              {topProducts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-apple-muted text-sm italic">Sem dados suficientes no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#1d1d1f" fontSize={11} tickLine={false} axisLine={false} width={100} fontWeight="bold" />
                    <Tooltip 
                      cursor={{fill: '#f5f5f7'}}
                      contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '15px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="qty" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} name="Unidades" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* RANKING VENDEDORES */}
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
            <h3 className="font-bold text-apple-black mb-8 flex items-center gap-2 text-xs uppercase tracking-widest">
              <Users size={18} className="text-blue-500" /> Performance por Local / Vendedor
            </h3>
            <div className="space-y-4">
              {topSellers.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-apple-muted text-sm italic">Sem vendas registradas no período.</div>
              ) : (
                topSellers.map((seller, idx) => (
                  <div key={seller.name} className={cn(
                    "bg-apple-offWhite border rounded-2xl p-5 flex items-center justify-between group transition-all",
                    seller.isNuvem ? "border-blue-100 hover:border-blue-300" : "border-apple-border hover:border-orange-200"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border",
                        idx === 0 ? "bg-orange-500 text-white border-orange-600" :
                        "bg-white text-apple-muted border-apple-border"
                      )}>
                        {idx + 1}º
                      </div>
                      <div>
                        <p className="font-black text-apple-black flex items-center gap-2">
                           {seller.name}
                           {seller.isNuvem && <Store size={14} className="text-blue-600" />}
                        </p>
                        <p className="text-[10px] text-apple-muted font-bold uppercase tracking-tighter">{seller.count} conversões</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-black", seller.isNuvem ? "text-blue-600" : "text-orange-500")}>{currencyFormatter.format(seller.total)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TENDÊNCIA DE VENDAS */}
          <div className="lg:col-span-2 bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
            <h3 className="font-bold text-apple-black mb-8 flex items-center gap-2 text-xs uppercase tracking-widest">
              <TrendingUp size={18} className="text-emerald-500" /> Fluxo de Faturamento Diário
            </h3>
            <div className="h-[250px] w-full">
              {salesTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-apple-muted text-sm italic">Nenhuma atividade registrada.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#86868b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#86868b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1d1d1f', border: 'none', borderRadius: '15px', color: '#fff' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      formatter={(value: number) => currencyFormatter.format(value)}
                    />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} name="Faturamento" />
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