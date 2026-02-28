"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import WithdrawModal from '@/components/dashboard/WithdrawModal';
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  UserCheck, 
  AlertCircle, 
  BarChart3, 
  TrendingUp, 
  Wallet, 
  ArrowRightLeft,
  Loader2,
  ChevronRight,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
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
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [stats, setStats] = useState({
    mrr: 0,
    activeSubs: 0,
    pendingAmount: 0,
    churn: 0,
    wooviAvailable: 0,
    wooviBlocked: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentCharges, setRecentCharges] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: charges } = await supabase
        .from('charges')
        .select('*, customers(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (charges) {
        const paid = charges.filter(c => c.status === 'pago');
        const pending = charges.filter(c => c.status === 'pendente');
        
        const totalPaid = paid.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalPending = pending.reduce((acc, curr) => acc + Number(curr.amount), 0);
        
        const { count: activeCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'em dia');

        // Busca saldo real via API Woovi
        const walletRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
          headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
        });
        const walletData = await walletRes.json();

        // A Woovi geralmente retorna { balance: { available: 100, blocked: 50 } }
        const available = walletData.balance?.available || walletData.available || 0;
        const blocked = walletData.balance?.blocked || walletData.blocked || 0;

        setStats({
          mrr: totalPaid,
          activeSubs: activeCount || 0,
          pendingAmount: totalPending,
          churn: 0,
          wooviAvailable: available / 100,
          wooviBlocked: blocked / 100
        });

        setRecentCharges(charges.slice(0, 5));

        setChartData([
          { name: 'Jan', value: totalPaid * 0.7 },
          { name: 'Fev', value: totalPaid * 0.8 },
          { name: 'Mar', value: totalPaid * 0.9 },
          { name: 'Abr', value: totalPaid * 0.85 },
          { name: 'Mai', value: totalPaid * 0.95 },
          { name: 'Jun', value: totalPaid },
        ]);
      }
    } catch (err: any) {
      console.error("Erro no dashboard:", err);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-zinc-400 mt-1">Visão geral da sua operação financeira.</p>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Disponível */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-xl shadow-orange-500/10 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md text-white">
                  <Wallet size={20} />
                </div>
                <button 
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="bg-zinc-950 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-zinc-900 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  SOLICITAR SAQUE <ChevronRight size={12} />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mb-1">Saldo Disponível (Woovi)</p>
                <h3 className="text-3xl font-bold text-white tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.wooviAvailable)}
                </h3>
              </div>
            </div>

            {/* Bloqueado */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-zinc-800 p-2 rounded-lg text-zinc-500">
                  <Lock size={20} />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Processando</span>
              </div>
              <div className="mt-4">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Saldo Bloqueado</p>
                <h3 className="text-2xl font-bold text-zinc-100 tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.wooviBlocked)}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Faturamento (Mês)" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr)} 
            trend={12} 
            icon={<DollarSign className="text-orange-500" size={18} />} 
          />
          <StatCard 
            title="Clientes Ativos" 
            value={stats.activeSubs.toString()} 
            icon={<UserCheck className="text-blue-400" size={18} />} 
          />
          <StatCard 
            title="Em Aberto" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pendingAmount)} 
            label="Aguardando pagamento"
            icon={<BarChart3 className="text-orange-500" size={18} />} 
          />
          <StatCard 
            title="Inadimplência" 
            value="0.0%" 
            icon={<AlertCircle className="text-red-500" size={18} />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-semibold text-zinc-200">Evolução de Faturamento</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                Volume Transacionado
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

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-zinc-200 mb-6 flex items-center justify-between">
              Últimas Atividades
              <ArrowRightLeft size={16} className="text-zinc-600" />
            </h3>
            <div className="space-y-6">
              {recentCharges.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm italic">Nenhuma atividade recente.</div>
              ) : recentCharges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between group">
                  <div className="flex gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-500" : 
                      charge.status === 'atrasado' ? "bg-red-500/10 text-red-500" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <DollarSign size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-zinc-200 truncate">{charge.customers?.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase">{charge.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-100">
                      R$ {Number(charge.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <WithdrawModal 
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={fetchDashboardData}
        availableBalance={stats.wooviAvailable}
      />
    </AppLayout>
  );
};

export default Dashboard;