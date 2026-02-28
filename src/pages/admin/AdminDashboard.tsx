"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  DollarSign, 
  Activity, 
  AlertCircle, 
  Loader2, 
  Building2,
  TrendingUp,
  Play,
  Settings,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalCharges: 0
  });
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRecurrence, setProcessingRecurrence] = useState(false);
  const [processingRules, setProcessingRules] = useState(false);

  const fetchGlobalData = async () => {
    setLoading(true);
    
    // 1. Buscar perfis
    const { data: profiles } = await supabase.from('profiles').select('status');
    const active = profiles?.filter(p => p.status === 'active').length || 0;
    const pending = profiles?.filter(p => p.status === 'pending').length || 0;

    // 2. Buscar cobranças com dados do merchant (quem criou)
    const { data: charges } = await supabase
      .from('charges')
      .select('*, profiles:user_id(company, full_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Somar faturamento (apenas pagos)
    const { data: allPaid } = await supabase
      .from('charges')
      .select('amount')
      .eq('status', 'pago');
    
    const revenue = allPaid?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    setStats({
      totalRevenue: revenue,
      activeUsers: active,
      pendingUsers: pending,
      totalCharges: charges?.length || 0
    });

    setRecentCharges(charges || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleForceRecurrence = async () => {
    if (!confirm("Isso irá gerar cobranças para todas as assinaturas agendadas para HOJE. Deseja continuar?")) return;
    
    setProcessingRecurrence(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/process-recurring-charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao processar");

      showSuccess(`Geração concluída! ${result.results?.length || 0} assinaturas verificadas.`);
      fetchGlobalData();
    } catch (err: any) {
      showError("Erro: " + err.message);
    } finally {
      setProcessingRecurrence(false);
    }
  };

  const handleForceRules = async () => {
    if (!confirm("Isso irá disparar as mensagens de lembrete (Hoje, D+3, etc) para todas as faturas pendentes. Continuar?")) return;
    
    setProcessingRules(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/process-billing-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error("Erro ao processar a régua.");

      showSuccess("Régua de cobrança processada com sucesso!");
    } catch (err: any) {
      showError("Erro: " + err.message);
    } finally {
      setProcessingRules(false);
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Visão Geral do Sistema</h2>
            <p className="text-zinc-400 mt-1">Monitoramento global de faturamento e engajamento dos parceiros.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Controle 1: Novas Cobranças */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Assinaturas</p>
                <p className="text-[10px] text-zinc-400">Gerar faturas de hoje</p>
              </div>
              <button 
                onClick={handleForceRecurrence}
                disabled={processingRecurrence}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold p-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10"
                title="Executar Geração de Assinaturas"
              >
                {processingRecurrence ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              </button>
            </div>

            {/* Controle 2: Régua de Cobrança */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Régua Global</p>
                <p className="text-[10px] text-zinc-400">Enviar lembretes agendados</p>
              </div>
              <button 
                onClick={handleForceRules}
                disabled={processingRules}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-bold p-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                title="Executar Régua de Lembretes"
              >
                {processingRules ? <Loader2 className="animate-spin" size={16} /> : <BellRing size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Faturamento Total" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)} 
            icon={<DollarSign className="text-emerald-500" size={18} />} 
          />
          <StatCard 
            title="Usuários Ativos" 
            value={stats.activeUsers.toString()} 
            icon={<Users className="text-blue-400" size={18} />} 
          />
          <StatCard 
            title="Aguardando Aprovação" 
            value={stats.pendingUsers.toString()} 
            icon={<AlertCircle className="text-orange-500" size={18} />} 
          />
          <StatCard 
            title="Total de Cobranças" 
            value={stats.totalCharges.toString()} 
            icon={<Activity className="text-purple-500" size={18} />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-500" /> Fluxo de Caixa Global
              </h3>
              <button onClick={fetchGlobalData} className="text-zinc-500 hover:text-zinc-100 transition-colors">
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              </button>
            </div>
            
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Empresa / Parceiro</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">ID Woovi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recentCharges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 italic text-sm">Nenhuma movimentação registrada.</td>
                  </tr>
                ) : (
                  recentCharges.map((charge) => (
                    <tr key={charge.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-zinc-600" />
                          <span className="text-sm font-medium text-zinc-200">
                            {charge.profiles?.company || charge.profiles?.full_name || 'Usuário'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-zinc-100">
                        R$ {Number(charge.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {new Date(charge.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border",
                          charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {charge.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] text-zinc-600 font-mono">{charge.woovi_id || '---'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;