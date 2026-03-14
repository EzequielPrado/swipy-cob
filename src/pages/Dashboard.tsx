"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  Wallet, 
  Zap, 
  Target, 
  Loader2, 
  RefreshCw 
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

  // Formatador de moeda reutilizável
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });

  const fetchWalletBalance = async () => {
    setWallet(prev => ({ ...prev, loading: true, error: false }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await response.json();
      
      if (data.error === "MISSING_KEY") {
        setWallet({ balance: 0, available: 0, loading: false, error: true });
        return;
      }

      setWallet({
        balance: (data.balance?.total || 0) / 100,
        available: (data.balance?.available || 0) / 100,
        loading: false,
        error: false
      });
    } catch (err) {
      console.error("[Dashboard] Erro ao buscar saldo:", err);
      setWallet(prev => ({ ...prev, loading: false, error: true }));
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('amount, status')
        .eq('user_id', user.id);
      
      const activeSubs = subs?.filter(s => s.status === 'active') || [];
      const cancelledSubs = subs?.filter(s => s.status === 'cancelled') || [];
      
      const mrr = activeSubs.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const churn = subs && subs.length > 0 
        ? (cancelledSubs.length / subs.length) * 100 
        : 0;

      const { count: activeCust } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'em dia');

      const { data: pending } = await supabase
        .from('charges')
        .select('amount')
        .eq('user_id', user.id)
        .in('status', ['pendente', 'atrasado']);
      
      const pendingAmount = pending?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const projection = [];
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        projection.push({
          name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
          valor: Number((mrr + (i === 0 ? pendingAmount : 0)).toFixed(2))
        });
      }

      setStats({
        mrr,
        activeCustomers: activeCust || 0,
        pendingAmount,
        churnRate: parseFloat(churn.toFixed(1)),
        projectionData: projection
      });
    } catch (err) {
      console.error("[Dashboard] Erro nos dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchWalletBalance();
    }
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-zinc-400 mt-1">Dados reais de faturamento e saldo Woovi.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { fetchDashboardData(); fetchWalletBalance(); }}
              className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"
              title="Atualizar Dados"
            >
              <RefreshCw size={18} className={cn((loading || wallet.loading) && "animate-spin")} />
            </button>
            <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
              <Zap size={16} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Tempo Real</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">MRR (Assinaturas)</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{currencyFormatter.format(stats.mrr)}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <ArrowUpRight size={12} /> Projeção estável
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Taxa de Cancelamento</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{stats.churnRate}%</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase">
              Saúde: <span className={stats.churnRate < 5 ? "text-emerald-400" : "text-orange-400"}>
                {stats.churnRate < 5 ? "Excelente" : "Atenção"}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clientes Ativos</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{stats.activeCustomers}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
              <Users size={12} className="text-orange-500" /> Base de pagadores
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden bg-gradient-to-br from-zinc-900 to-emerald-500/5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pendente Hoje</p>
            <h3 className="text-3xl font-bold mt-2 text-zinc-100">{currencyFormatter.format(stats.pendingAmount)}</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase">
              <Target size={12} className="text-emerald-500" /> Meta de liquidez
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-xl">
            <div className="mb-10">
              <h3 className="text-xl font-bold text-zinc-100">Projeção de Recebíveis</h3>
              <p className="text-xs text-zinc-500">Expectativa de faturamento baseada no seu MRR ativo.</p>
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
                    tickFormatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [currencyFormatter.format(value), "Projeção"]}
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                <Wallet size={80} />
              </div>
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2 relative z-10">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Carteira Woovi
              </h4>
              
              <div className="space-y-8 relative z-10">
                {wallet.loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Consultando API...</span>
                  </div>
                ) : wallet.error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Erro Woovi</p>
                    <p className="text-xs text-zinc-500 leading-relaxed italic">
                      Chave de API não configurada ou inválida. Ajuste em "Personalização".
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase mb-1">Saldo Total</p>
                      <p className="text-4xl font-black text-zinc-100">{currencyFormatter.format(wallet.balance)}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-500 uppercase tracking-tighter">Disponível agora</span>
                        <span className="text-emerald-400">{currencyFormatter.format(wallet.available)}</span>
                      </div>
                      <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
                          style={{ width: `${(wallet.available / (wallet.balance || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsWithdrawOpen(true)}
                      disabled={wallet.available <= 0}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold py-5 rounded-2xl transition-all shadow-xl shadow-orange-500/10 uppercase tracking-widest text-[10px]"
                    >
                      SOLICITAR SAQUE PIX
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8">
              <div className="flex items-center gap-3 text-emerald-500 mb-3">
                <Target size={20} />
                <h4 className="font-bold text-sm">Status da Recorrência</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed italic">
                Seu MRR de <strong>{currencyFormatter.format(stats.mrr)}</strong> está saudável. Mantenha suas regras de WhatsApp ativas para garantir a liquidez.
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