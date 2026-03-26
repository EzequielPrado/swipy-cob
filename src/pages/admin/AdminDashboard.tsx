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
  CalendarCheck,
  BellRing,
  TrendingUp,
  DollarSign,
  Package,
  Factory,
  ArrowUpRight,
  ShieldCheck,
  Globe,
  MessageSquare,
  PlayCircle
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

      const [profilesRes, chargesRes, subsRes, productsRes, productionRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('charges').select('amount, status'),
        supabase.from('subscriptions').select('amount').eq('status', 'active'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('production_orders').select('id', { count: 'exact', head: true })
      ]);

      const totalUsers = profilesRes.data?.length || 0;
      const newUsers = profilesRes.data?.filter(p => p.created_at && new Date(p.created_at) >= thirtyDaysAgo).length || 0;
      
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
    const label = action === 'subscriptions' ? 'Geração de Assinaturas' : 'Disparo de Régua';
    
    if (!confirm(`Deseja forçar a execução da rotina de ${label} para TODOS os lojistas agora?`)) return;

    setProcessing(action);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro na execução.");
      
      showSuccess(`Sucesso: ${result.processed || 0} processos executados.`);
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
            <p className="text-zinc-500 mt-1 font-medium italic">Painel de Controle Swipy Fintech LTDA</p>
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

        {/* 1. SEÇÃO DE GATILHOS DE AUTOMAÇÃO (DESTAQUE) */}
        <div className="bg-gradient-to-br from-orange-500/10 to-zinc-900 border border-orange-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Zap size={140} /></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                 <h3 className="text-xl font-black text-zinc-100 mb-2 flex items-center gap-2">
                    <Zap className="text-orange-500" size={24} />
                    Comandos de Automação Global
                 </h3>
                 <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
                    Execute manualmente os processos do sistema para todos os clientes ativos. 
                    Útil para processamentos emergenciais ou disparos de cobrança fora do horário agendado.
                 </p>
              </div>
              <div className="flex flex-wrap gap-4 shrink-0">
                 <button 
                  onClick={() => handleSystemAction('subscriptions')}
                  disabled={!!processing}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                 >
                    {processing === 'subscriptions' ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />}
                    Processar Assinaturas (D0)
                 </button>
                 <button 
                  onClick={() => handleSystemAction('schedule')}
                  disabled={!!processing}
                  className="bg-orange-500 hover:bg-orange-600 text-zinc-950 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                 >
                    {processing === 'schedule' ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} />}
                    Disparar Régua Global
                 </button>
              </div>
           </div>
        </div>

        {/* 2. KPIs DE NEGÓCIO */}
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
              <TrendingUp size={14} className="text-blue-500" /> ARPU (Receita SaaS)
            </h3>
            <p className="text-4xl font-black text-zinc-100">{currency.format(stats.arpu)}</p>
            <p className="text-[10px] text-zinc-500 mt-3 italic">Média de recorrência por conta</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-2xl group hover:border-emerald-500/30 transition-all">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-500" /> TPV Acumulado
            </h3>
            <p className="text-4xl font-black text-emerald-400">{currency.format(stats.totalVolumePaid)}</p>
            <p className="text-[10px] text-zinc-500 mt-3 font-bold">Total processado e liquidado</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[2.5rem] shadow-2xl group hover:border-red-500/30 transition-all">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" /> Risco de Inadimplência
            </h3>
            <p className="text-4xl font-black text-zinc-100">{currency.format(stats.overdueAmount)}</p>
            <p className="text-[10px] text-red-400 mt-3 font-bold uppercase tracking-tighter">Volume total em atraso</p>
          </div>
        </div>

        {/* 3. FLUXO E ENGAGEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20">
                   <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                     <Activity size={16} className="text-orange-500" /> Fluxo de Transações Global
                   </h3>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo Real</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950/50 text-zinc-500 text-[9px] font-bold uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-5">Lojista (Tenant)</th>
                        <th className="px-8 py-5">Cliente Final</th>
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
                                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">#{charge.user_id.split('-')[0].toUpperCase()}</p>
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
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                 <div className="absolute -right-6 -bottom-6 opacity-5"><Activity size={120} /></div>
                 <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest mb-6">Métricas de Engajamento</h3>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                       <div className="flex items-center gap-3">
                          <Package size={16} className="text-orange-500" />
                          <span className="text-xs text-zinc-400 font-bold">Itens Cadastrados</span>
                       </div>
                       <span className="text-sm font-black text-zinc-100">{stats.systemProducts}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                       <div className="flex items-center gap-3">
                          <Factory size={16} className="text-blue-500" />
                          <span className="text-xs text-zinc-400 font-bold">Ordens Industriais</span>
                       </div>
                       <span className="text-sm font-black text-zinc-100">{stats.systemProduction}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                       <div className="flex items-center gap-3">
                          <TrendingUp size={16} className="text-emerald-500" />
                          <span className="text-xs text-zinc-400 font-bold">Conversão Média</span>
                       </div>
                       <span className="text-sm font-black text-emerald-500">84%</span>
                    </div>
                 </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Globe size={100} /></div>
                 <h4 className="font-black text-white mb-2 uppercase tracking-widest text-xs">Gestão de Usuários</h4>
                 <p className="text-sm text-blue-100 font-medium mb-6">Aprove novos lojistas, configure chaves API e gerencie permissões de acesso.</p>
                 <button 
                  onClick={() => window.location.href = '/admin/usuarios'}
                  className="w-full bg-white text-blue-700 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-zinc-100 transition-all active:scale-95"
                 >
                   ACESSAR LISTA DE CLIENTES
                 </button>
              </div>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;