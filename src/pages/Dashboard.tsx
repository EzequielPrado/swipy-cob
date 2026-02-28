"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  UserCheck, 
  AlertCircle, 
  BarChart3, 
  TrendingUp, 
  ArrowRightLeft,
  Loader2,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPaid: 0,
    activeSubs: 0,
    pendingAmount: 0,
    overdueAmount: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentCharges, setRecentCharges] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Buscar todas as cobranças do usuário
      const { data: charges } = await supabase
        .from('charges')
        .select('*, customers(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (charges) {
        const paid = charges.filter(c => c.status === 'pago');
        const pending = charges.filter(c => c.status === 'pendente');
        const overdue = charges.filter(c => c.status === 'atrasado');

        const totalPaid = paid.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalPending = pending.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalOverdue = overdue.reduce((acc, curr) => acc + Number(curr.amount), 0);
        
        // 2. Contar clientes ativos
        const { count: activeCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'em dia');

        setStats({
          totalPaid,
          activeSubs: activeCount || 0,
          pendingAmount: totalPending,
          overdueAmount: totalOverdue
        });

        setRecentCharges(charges.slice(0, 5));
        
        // Dados fictícios para o gráfico baseados no faturamento real
        setChartData([
          { name: 'Jan', value: totalPaid * 0.4 },
          { name: 'Fev', value: totalPaid * 0.6 },
          { name: 'Mar', value: totalPaid * 0.5 },
          { name: 'Abr', value: totalPaid * 0.8 },
          { name: 'Mai', value: totalPaid * 0.9 },
          { name: 'Jun', value: totalPaid },
        ]);
      }
    } catch (err: any) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-zinc-400 mt-1">Acompanhe o desempenho das suas cobranças em tempo real.</p>
        </div>

        {/* Grade de Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Recebido" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalPaid)} 
            trend={12} 
            icon={<DollarSign className="text-emerald-500" size={18} />} 
          />
          <StatCard 
            title="Clientes Ativos" 
            value={stats.activeSubs.toString()} 
            icon={<UserCheck className="text-blue-400" size={18} />} 
          />
          <StatCard 
            title="Aguardando Pagamento" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pendingAmount)} 
            label="Faturas pendentes"
            icon={<BarChart3 className="text-orange-500" size={18} />} 
          />
          <StatCard 
            title="Total Atrasado" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.overdueAmount)} 
            icon={<AlertCircle className="text-red-500" size={18} />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gráfico de Evolução */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-semibold text-zinc-200">Evolução de Recebimentos</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <TrendingUp size={14} className="text-orange-500" />
                Performance Mensal
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f97316" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Últimas Atividades */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-zinc-200 mb-6 flex items-center justify-between">
              Atividades Recentes
              <ArrowRightLeft size={16} className="text-zinc-600" />
            </h3>
            <div className="space-y-6">
              {recentCharges.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm italic">Nenhuma atividade recente.</div>
              ) : recentCharges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between group">
                  <div className="flex gap-3 overflow-hidden">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-500" : 
                      charge.status === 'atrasado' ? "bg-red-500/10 text-red-500" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <DollarSign size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-zinc-200 truncate">{charge.customers?.name || 'Cliente Removido'}</p>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight">{charge.status}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-zinc-100">
                      R$ {Number(charge.amount).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-zinc-600 flex items-center justify-end gap-1">
                      <Calendar size={10} />
                      {new Date(charge.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;