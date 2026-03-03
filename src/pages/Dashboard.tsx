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
  Target,
  Loader2
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
import { showError } from '@/utils/toast';
import WithdrawModal from '@/components/dashboard/WithdrawModal';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    mrr: 0,
    activeCustomers: 0,
    pendingAmount: 0,
    churnRate: 0,
    projectionData: [] as any[]
  });
  const [wallet, setWallet] = useState({
    balance: 0,
    available: 0,
    loading: true,
    error: false
  });
  const [loading, setLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.error === "MISSING_KEY") {
        setWallet(prev => ({ ...prev, loading: false, error: true }));
        return;
      }

      // A API da Woovi retorna valores em centavos no campo 'balance'
      setWallet({
        balance: (data.balance?.total || 0) / 100,
        available: (data.balance?.available || 0) / 100,
        loading: false,
        error: false
      });
    } catch (err) {
      setWallet(prev => ({ ...prev, loading: false, error: true }));
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Calcular MRR Real
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('amount, status')
      .eq('user_id', user.id);
    
    const activeSubs = subs?.filter(s => s.status === 'active') || [];
    const cancelledSubs = subs?.filter(s => s.status === 'cancelled') || [];
    
    const mrr = activeSubs.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const churn = subs && subs.length > 0 ? (cancelledSubs.length / subs.length) * 100 : 0;

    // 2. Clientes Ativos Reais
    const { count: activeCust } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'em dia');

    // 3. Valor Pendente Real
    const { data: pending } = await supabase
      .from('charges')
      .select('amount')
      .eq('user_id', user.id)
      .in('status', ['pendente', 'atrasado']);
    
    const pendingAmount = pending?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // 4. Projeção Baseada em Dados
    const projection = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      projection.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        valor: mrr + (i === 0 ? pendingAmount : 0) // Mês 0 inclui o que já está aberto
      });
    }

    setStats({
      mrr,
      activeCustomers: activeCust || 0,
      pendingAmount,
      churnRate: parseFloat(churn.toFixed(1)),
      projectionData: projection
    });
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchWalletBalance();
    }
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
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Acesso em Tempo Real</span>
          </div>
        </div>

        {/* Métricas SaaS Reais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">MRR (Recorrência)</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{formatCurrency(stats.mrr)}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <ArrowUpRight size={12} /> Dados sincronizados
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Churn Rate</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{stats.churnRate}%</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
              Saúde da base: <span className={stats.churnRate < 5 ? "text-emerald-400" : "text-orange-400"}>
                {stats.churnRate < 5 ? "Excelente" : "Atenção"}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assinantes Ativos</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{stats.activeCustomers}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
              <Users size={12} className="text-orange-500" /> Clientes pagantes
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden bg-gradient-to-br from-zinc-900 to-emerald-500/5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pendente em Aberto</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{formatCurrency(stats.pendingAmount)}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase">
              <Target size={12} className="text-emerald-500" /> Meta de cobrança
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Projeção de Recebíveis</h3>
                <p className="text-xs text-zinc-500">Expectativa de caixa baseada no MRR atual.</p>
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
                    tickFormatter={(v) => `R$ ${v}`}
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
                <Wallet size={16} className="text-orange-500" /> Carteira Woovi (Real)
              </h4>
              <div className="space-y-6">
                {wallet.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                  </div>
                ) : wallet.error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Erro na Conexão</p>
                    <p className="text-xs text-zinc-500 leading-relaxed italic">
                      Verifique se o seu AppID da Woovi está configurado corretamente em "Personalização".
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase mb-1">Saldo Total</p>
                      <p className="text-3xl font-bold text-zinc-100">{formatCurrency(wallet.balance)}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Disponível para Saque</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(wallet.available)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-1000" 
                          style={{ width: `${(wallet.available / (wallet.balance || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsWithdrawOpen(true)}
                      disabled={wallet.available <= 0}
                      className="w-full bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-xl shadow-zinc-950/20 text-xs"
                    >
                      SOLICITAR SAQUE IMEDIATO
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-[2rem] p-8">
              <div className="flex items-center gap-3 text-orange-500 mb-3">
                <Target size={20} />
                <h4 className="font-bold text-sm">Próximos Passos</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Você tem <strong>{stats.activeCustomers}</strong> clientes ativos. Para aumentar o MRR, considere criar novas regras de automação na aba "Régua Global".
              </p>
            </div>
          </div>
        </div>
      </div>

      <WithdrawModal 
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={fetchWalletBalance}
        availableBalance={wallet.available}
      />
    </AppLayout>
  );
};

export default Dashboard;