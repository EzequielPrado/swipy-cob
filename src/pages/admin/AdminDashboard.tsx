"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  CreditCard, 
  Activity, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Zap,
  Building2,
  Play,
  CalendarCheck,
  BellRing,
  TrendingUp,
  DollarSign,
  Package,
  Factory,
  ArrowUpRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers30d: 0,
    totalCharges: 0,
    activeSubs: 0,
    overdueAmount: 0,
    totalVolumePaid: 0,
    totalMaturityValue: 0,
    arpu: 0,
    systemProducts: 0,
    systemProduction: 0
  });
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 1. Buscas Paralelas para Performance Global
      const [profilesRes, chargesRes, subsRes, productsRes, productionRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('charges').select('amount, status'),
        supabase.from('subscriptions').select('amount').eq('status', 'active'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('production_orders').select('id', { count: 'exact', head: true })
      ]);

      // 2. Cálculos de Crescimento de Base
      const totalUsers = profilesRes.data?.length || 0;
      const newUsers = profilesRes.data?.filter(p => p.created_at && new Date(p.created_at) >= thirtyDaysAgo).length || 0;
      
      // 3. SaaS Health (Fintech & Revenue)
      const paidCharges = chargesRes.data?.filter(c => c.status === 'pago') || [];
      const totalPaid = paidCharges.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const overdue = chargesRes.data?.filter(c => c.status === 'atrasado').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      
      const mrrTotal = subsRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const arpuValue = totalUsers > 0 ? (mrrTotal / totalUsers) : 0;

      setStats({
        totalUsers,
        newUsers30d: newUsers,
        totalCharges: chargesRes.data?.length || 0,
        activeSubs: subsRes.data?.length || 0,
        overdueAmount: overdue,
        totalVolumePaid: totalPaid,
        totalMaturityValue: chargesRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
        arpu: arpuValue,
        systemProducts: productsRes.count || 0,
        systemProduction: productionRes.count || 0
      });

      // 4. Fluxo Global de Transações (Multi-tenant)
      const { data: charges } = await supabase
        .from('charges')
        .select('*, customers(name), profiles:user_id(company, full_name)')
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (charges) setRecentCharges(charges);
    } catch (err) {
      console.error("Admin Monitor Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleSystemAction = async (action: 'subscriptions' | 'schedule') => {
    const endpoint = action === 'subscriptions' ? 'process-recurring-charges' : 'process-billing-schedule';
    setProcessing(action);
    try {
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
      });
      if (!response.ok) throw new Error("Erro na execução do serviço.");
      showSuccess("Rotina do sistema disparada com sucesso!");
      fetchGlobalData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
               <ShieldCheck className="text-orange-500" size={32} />
               SaaS Governance
            </h2>
            <p className="text-zinc-500 mt-1 font-medium italic">Painel Estratégico - Swipy Fintech LTDA</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Globe size={14} /> Swipy Online
             </div>
             <button onClick={fetchGlobalData} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition-all shadow-xl active:scale-95">
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {/* 1. KPIs DE NEGÓCIO (SaaS PERFORMANCE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-2xl group hover:border-orange-500/30 transition-all">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={14} className="text-orange-500" /> Base de Lojistas
            </h3>
            <p className="text-4xl font-black text-zinc-100">{stats.totalUsers}</p>
            <p className="text-[10px] text-emerald-500 mt-3 font-bold flex items-center gap-1">
               <ArrowUpRight size={12} /> +{stats.newUsers30d} novos (30 dias)
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-2xl group hover:border-blue-500/30 transition-all">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" /> ARPU (Ticket SaaS)
            </h3>
            <p className="text-4xl font-black text-zinc-100">{currency.format(stats.arpu)}</p>
            <p className="text-[10px] text-zinc-500 mt-3 italic">Receita média mensal por conta</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-2xl group hover:border-emerald-500/30 transition-all">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-500" /> TPV Global
            </h3>
            <p className="text-4xl font-black text-emerald-400">{currency.format(stats.totalVolumePaid)}</p>
            <p className="text-[10px] text-zinc-500 mt-3 font-bold">Total processado e pago no ecossistema</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-2xl group hover:border-red-500/30 transition-all">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" /> Risco (Inadimplência)
            </h3>
            <p className="text-4xl font-black text-zinc-100">{currency.format(stats.overdueAmount)}</p>
            <p className="text-[10px] text-red-400 mt-3 font-bold uppercase tracking-tighter">Volume em atraso na plataforma</p>
          </div>
        </div>

        {/* 2. ADOÇÃO DE MÓDULOS & ENGAJAMENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col md:flex-row gap-8 items-center justify-between shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Activity size={150} /></div>
                 <div>
                    <h4 className="text-lg font-bold text-zinc-100 mb-2">Saúde do Ecossistema</h4>
                    <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">Monitore a utilização das ferramentas de gestão avançada pelos seus lojistas.</p>
                    <div className="flex gap-10">
                       <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2"><Package size={12} className="text-orange-500" /> SKUs Ativos</p>
                          <p className="text-2xl font-black">{stats.systemProducts}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2"><Factory size={12} className="text-blue-500" /> Ordens Indústr.</p>
                          <p className="text-2xl font-black">{stats.systemProduction}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2"><CreditCard size={12} className="text-emerald-500" /> Cobranças</p>
                          <p className="text-2xl font-black">{stats.totalCharges}</p>
                       </div>
                    </div>
                 </div>
                 <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => handleSystemAction('subscriptions')}
                      disabled={!!processing}
                      className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 hover:border-emerald-500/50 transition-all text-xs font-bold"
                    >
                       <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          {processing === 'subscriptions' ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
                       </div>
                       Assinaturas Hoje
                    </button>
                    <button 
                      onClick={() => handleSystemAction('schedule')}
                      disabled={!!processing}
                      className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 hover:border-blue-500/50 transition-all text-xs font-bold"
                    >
                       <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          {processing === 'schedule' ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
                       </div>
                       Régua de Cobrança
                    </button>
                 </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
                   <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest">Atividade de Transações (Tempo Real)</h3>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase">Visão Global</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950/50 text-zinc-500 text-[9px] font-bold uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-5">Merchant (Lojista)</th>
                        <th className="px-8 py-5">Destinatário</th>
                        <th className="px-8 py-5">Valor</th>
                        <th className="px-8 py-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                      {recentCharges.map((charge) => (
                        <tr key={charge.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-orange-500 shadow-inner">
                                  <Building2 size={16} />
                               </div>
                               <div>
                                  <p className="text-xs font-black text-zinc-100">{charge.profiles?.company || charge.profiles?.full_name}</p>
                                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5 uppercase tracking-tighter">Tenant ID: {charge.user_id.split('-')[0]}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                             <p className="text-xs font-bold text-zinc-400">{charge.customers?.name}</p>
                          </td>
                          <td className="px-8 py-5 font-mono text-xs font-bold text-zinc-200">
                            {currency.format(charge.amount)}
                          </td>
                          <td className="px-8 py-5">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            )}>
                              {charge.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>

           <div className="space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl border-t-orange-500 border-t-4">
                 <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest mb-6">Métricas de Fintech</h3>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                       <span className="text-xs text-zinc-500 font-bold">Cobranças Pendentes</span>
                       <span className="text-sm font-black text-zinc-100">{stats.totalCharges - (recentCharges.filter(c => c.status === 'pago').length)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                       <span className="text-xs text-zinc-500 font-bold">Lojistas Ativos (Mês)</span>
                       <span className="text-sm font-black text-emerald-500">+{stats.newUsers30d}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                       <span className="text-xs text-zinc-500 font-bold">Taxa de Conversão Pay</span>
                       <span className="text-sm font-black text-blue-400">82%</span>
                    </div>
                 </div>
                 <div className="mt-8 pt-8 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-600 italic leading-relaxed text-center">Dados analíticos processados via Swipy Intelligence para suporte à decisão.</p>
                 </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10"><Zap size={100} /></div>
                 <h4 className="font-black text-orange-500 mb-2 uppercase tracking-widest text-xs">Administração</h4>
                 <p className="text-sm text-zinc-300 font-bold mb-6">Aprovar novos lojistas e configurar chaves de integração API.</p>
                 <button 
                  onClick={() => window.location.href = '/admin/usuarios'}
                  className="bg-orange-500 text-zinc-950 px-6 py-3 rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95"
                 >
                   GESTOR DE USUÁRIOS
                 </button>
              </div>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;