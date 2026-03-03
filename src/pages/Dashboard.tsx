"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  ArrowUpRight, 
  BarChart3,
  Wallet,
  Zap,
  Target
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    mrr: 0,
    activeCustomers: 0,
    pendingAmount: 0,
    churnRate: 1.8,
    projectionData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      // 1. Calcular MRR
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      const mrr = subs?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 2. Clientes Ativos
      const { count: activeCust } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'em dia');

      // 3. Valor Pendente
      const { data: pending } = await supabase
        .from('charges')
        .select('amount')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'atrasado']);
      
      const pendingAmount = pending?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 4. Projeção
      const projection = [];
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        projection.push({
          name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
          valor: mrr + (i === 0 ? pendingAmount * 0.8 : mrr * (i * 0.05)) // Simulação de crescimento
        });
      }

      setStats({
        mrr,
        activeCustomers: activeCust || 0,
        pendingAmount,
        churnRate: 1.8,
        projectionData: projection
      });
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <AppLayout>
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-zinc-400 mt-1">Sua inteligência de dados e projeção de faturamento.</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
            <Zap size={16} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Plano Pro Ativo</span>
          </div>
        </div>

        {/* Métricas SaaS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">MRR (Recorrência)</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{formatCurrency(stats.mrr)}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <ArrowUpRight size={12} /> +8% este mês
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Churn Rate</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{stats.churnRate}%</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
              Saúde da base: <span className="text-emerald-400">Excelente</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assinantes</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{stats.activeCustomers}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
              <Users size={12} className="text-orange-500" /> Clientes pagantes
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden bg-gradient-to-br from-zinc-900 to-emerald-500/5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">A Receber</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{formatCurrency(stats.pendingAmount)}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase">
              <Target size={12} className="text-emerald-500" /> Meta do mês
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projeção de Caixa */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Projeção de Fluxo de Caixa</h3>
                <p className="text-xs text-zinc-500">Expectativa de recebimentos para os próximos 6 meses.</p>
              </div>
              <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                 <button className="px-4 py-1.5 rounded-lg bg-orange-500 text-zinc-950 text-[10px] font-bold uppercase">Mensal</button>
                 <button className="px-4 py-1.5 rounded-lg text-zinc-500 text-[10px] font-bold uppercase">Anual</button>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.projectionData}>
                  <defs>
                    <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#71717a', fontSize: 10}}
                    tickFormatter={(v) => `R$ ${v/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px' }}
                    itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#f97316" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorProjection)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Wallet size={16} className="text-orange-500" /> Sua Carteira Woovi
              </h4>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase mb-1">Saldo Líquido</p>
                  <p className="text-3xl font-bold text-zinc-100">{formatCurrency(12450.00)}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Disponível</span>
                    <span className="text-emerald-400 font-bold">R$ 8.200,00</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-2/3 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                  </div>
                </div>
                <button className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-xl shadow-zinc-950/20 text-xs">
                  SOLICITAR SAQUE IMEDIATO
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-[2rem] p-8">
              <div className="flex items-center gap-3 text-orange-500 mb-3">
                <Target size={20} />
                <h4 className="font-bold">Insight de IA</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Você tem **R$ 2.450,00** em faturas que vencem nos próximos 3 dias. Sugerimos disparar um lembrete preventivo via WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;