"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet, 
  Target, 
  Loader2, 
  RefreshCw,
  Scale
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [finance, setFinance] = useState({
    entradasTotais: 0,
    saidasTotais: 0,
    lucroLiquido: 0,
    aReceber: 0,
    aPagar: 0,
    mrr: 0,
    chartData: [] as any[]
  });

  const [wallet, setWallet] = useState({
    balance: 0,
    loading: true,
  });

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });

  const fetchWalletBalance = async () => {
    setWallet(prev => ({ ...prev, loading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      setWallet({
        balance: data.error ? 0 : (data.balance?.total || 0) / 100,
        loading: false,
      });
    } catch (err) {
      setWallet({ balance: 0, loading: false });
    }
  };

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Receitas (Cobranças)
      const { data: charges } = await supabase
        .from('charges')
        .select('amount, status, created_at')
        .eq('user_id', user.id);

      // 2. Despesas (Contas a Pagar)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, status, due_date')
        .eq('user_id', user.id);

      // 3. Assinaturas (MRR)
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('amount')
        .eq('status', 'active')
        .eq('user_id', user.id);

      const mrr = subs?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;

      // --- CÁLCULOS ---
      let entradasTotais = 0;
      let aReceber = 0;
      
      charges?.forEach(charge => {
        if (charge.status === 'pago') {
          entradasTotais += Number(charge.amount || 0);
        } else if (charge.status === 'pendente' || charge.status === 'atrasado') {
          aReceber += Number(charge.amount || 0);
        }
      });

      let saidasTotais = 0;
      let aPagar = 0;

      expenses?.forEach(exp => {
        if (exp.status === 'pago') {
          saidasTotais += Number(exp.amount || 0);
        } else {
          aPagar += Number(exp.amount || 0);
        }
      });

      const lucroLiquido = entradasTotais - saidasTotais;

      // --- DADOS PARA O GRÁFICO (Ilustrativo comparativo global) ---
      const chartData = [
        {
          name: 'Realizado (Pago)',
          Entradas: entradasTotais,
          Saídas: saidasTotais,
        },
        {
          name: 'Projetado (Pendente)',
          Entradas: aReceber,
          Saídas: aPagar,
        }
      ];

      setFinance({
        entradasTotais,
        saidasTotais,
        lucroLiquido,
        aReceber,
        aPagar,
        mrr,
        chartData
      });

    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
    fetchWalletBalance();
  }, [user]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Visão Financeira</h2>
            <p className="text-zinc-400 mt-1">Fluxo de Caixa, Desempenho e Conciliação</p>
          </div>
          <button 
            onClick={fetchWalletBalance}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            {wallet.loading ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <RefreshCw size={16} className="text-zinc-400" />}
            Sincronizar Dados
          </button>
        </div>

        {/* TOP CARDS: O DRE BÁSICO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><ArrowUpRight size={100} /></div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-500" /> Entradas (Realizadas)
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className="text-4xl font-black text-zinc-100">{currencyFormatter.format(finance.entradasTotais)}</p>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Cobranças Pagas Pelos Clientes</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><ArrowDownRight size={100} /></div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ArrowDownRight size={16} className="text-red-500" /> Saídas (Pagas)
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className="text-4xl font-black text-zinc-100">{currencyFormatter.format(finance.saidasTotais)}</p>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Despesas e Contas Quitadas</p>
          </div>

          <div className={cn(
            "p-6 rounded-[2rem] shadow-xl relative overflow-hidden border",
            finance.lucroLiquido >= 0 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-red-500/5 border-red-500/20"
          )}>
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Scale size={100} /></div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Scale size={16} className={finance.lucroLiquido >= 0 ? "text-emerald-500" : "text-red-500"} /> 
              Saldo Operacional (Lucro)
            </h3>
            {loading ? <Loader2 className="animate-spin text-zinc-600" /> : (
              <p className={cn("text-4xl font-black", finance.lucroLiquido >= 0 ? "text-emerald-400" : "text-red-400")}>
                {currencyFormatter.format(finance.lucroLiquido)}
              </p>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">O que Sobrou no Caixa (Líquido)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GRÁFICO */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl min-h-[400px]">
            <h3 className="text-sm font-bold text-zinc-100 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-500"/>
              Comparativo: Entradas x Saídas
            </h3>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={32} />
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finance.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: number) => [currencyFormatter.format(value), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* INDICADORES SECUNDÁRIOS */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
              <div className="flex items-center gap-3 text-zinc-500 mb-2">
                <Wallet size={16} className="text-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Saldo Carteira Woovi</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100 mb-1">
                {wallet.loading ? "..." : currencyFormatter.format(wallet.balance)}
              </p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Em tempo real</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
              <div className="flex items-center gap-3 text-zinc-500 mb-2">
                <Target size={16} className="text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">MRR (Assinaturas Ativas)</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100 mb-1">
                {loading ? "..." : currencyFormatter.format(finance.mrr)}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Receita Recorrente Mensal</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">A Receber</span>
                <p className="text-lg font-bold text-zinc-300 mt-1">{loading ? "..." : currencyFormatter.format(finance.aReceber)}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">A Pagar</span>
                <p className="text-lg font-bold text-red-400 mt-1">{loading ? "..." : currencyFormatter.format(finance.aPagar)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;