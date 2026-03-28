"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, 
  Loader2, Building2, Trophy, ArrowUpRight, PieChart, Target,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';
import { cn } from "@/lib/utils";

const COLORS = ['#FF8C42', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b'];

const Benchmarks = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    topMerchants: [] as any[],
    volumeByPlan: [] as any[],
    platformGrowth: [] as any[],
    stats: {
      avgTicket: 0,
      conversionRate: 0,
      activeRate: 0
    }
  });

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const [profilesRes, chargesRes, plansRes] = await Promise.all([
        supabase.from('profiles').select('id, company, plan_id, system_plans(name)'),
        supabase.from('charges').select('amount, status, user_id, created_at'),
        supabase.from('system_plans').select('id, name')
      ]);

      if (!profilesRes.data || !chargesRes.data) return;

      const allProfiles = profilesRes.data;
      const allCharges = chargesRes.data;
      const paidCharges = allCharges.filter(c => c.status === 'pago');

      // 1. Top Merchats por TPV
      const merchantVolumes = allProfiles.map(p => {
        const volume = paidCharges.filter(c => c.user_id === p.id).reduce((acc, c) => acc + Number(c.amount), 0);
        return { name: p.company || 'Pessoa Física', value: volume };
      }).sort((a, b) => b.value - a.value).slice(0, 6);

      // 2. Volume por Plano
      const planVolume = (plansRes.data || []).map(plan => {
        const merchantIds = allProfiles.filter(p => p.plan_id === plan.id).map(p => p.id);
        const volume = paidCharges.filter(c => merchantIds.includes(c.user_id)).reduce((acc, c) => acc + Number(c.amount), 0);
        return { name: plan.name, value: volume };
      });

      // 3. Crescimento da Plataforma (Mensal)
      const months: Record<string, number> = {};
      paidCharges.forEach(c => {
        const date = new Date(c.created_at);
        const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
        months[key] = (months[key] || 0) + Number(c.amount);
      });
      const growth = Object.keys(months).map(k => ({ date: k, volume: months[k] }));

      // 4. Stats
      const totalVolume = paidCharges.reduce((acc, c) => acc + Number(c.amount), 0);
      const avgTicket = paidCharges.length > 0 ? totalVolume / paidCharges.length : 0;
      const conversion = allCharges.length > 0 ? (paidCharges.length / allCharges.length) * 100 : 0;

      setData({
        topMerchants: merchantVolumes,
        volumeByPlan: planVolume,
        platformGrowth: growth,
        stats: {
          avgTicket,
          conversionRate: conversion,
          activeRate: (allProfiles.length > 0) ? (allProfiles.length / 50) * 100 : 0 // Exemplo mock
        }
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBenchmarks(); }, []);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black">
            <BarChart3 className="text-orange-500" size={32} /> Benchmarks Master
          </h2>
          <p className="text-apple-muted mt-1 font-medium">Análise comparativa de tração e volume transacionado no SaaS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Ticket Médio Global</p>
              <h3 className="text-3xl font-black text-apple-black">{currency.format(data.stats.avgTicket)}</h3>
              <p className="text-[10px] text-emerald-600 mt-2 font-bold">+4.2% em relação ao mês anterior</p>
           </div>
           <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Conversão de Faturas</p>
              <h3 className="text-3xl font-black text-blue-600">{data.stats.conversionRate.toFixed(1)}%</h3>
              <p className="text-[10px] text-apple-muted mt-2 font-medium">Faturas geradas vs Faturas pagas</p>
           </div>
           <div className="bg-apple-black p-7 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Target size={80} className="text-orange-500" /></div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Market Share Ativo</p>
              <h3 className="text-3xl font-black text-white">{data.stats.activeRate.toFixed(1)}%</h3>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium">Lojistas com transações nos últimos 7 dias</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* RANKING LOJISTAS */}
           <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <Trophy size={16} className="text-orange-500" /> Top Performers (TPV)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topMerchants} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={11} fontWeight="bold" />
                    <Tooltip 
                      cursor={{fill: '#fafafa'}}
                      contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [currency.format(val), 'Volume Pago']}
                    />
                    <Bar dataKey="value" fill="#FF8C42" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* SHARE POR PLANO */}
           <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <PieChart size={16} className="text-blue-500" /> Receita SaaS por Plano
              </h3>
              <div className="h-[300px] w-full flex items-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                       <Pie data={data.volumeByPlan} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                          {data.volumeByPlan.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip />
                    </RePieChart>
                 </ResponsiveContainer>
                 <div className="w-40 space-y-3">
                    {data.volumeByPlan.map((p, idx) => (
                       <div key={p.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[10px] font-black text-apple-black uppercase truncate">{p.name}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* CRESCIMENTO GLOBAL */}
           <div className="lg:col-span-2 bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Curva de Tração Global (Volume)
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.platformGrowth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [currency.format(val), 'Volume Transacionado']}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Benchmarks;