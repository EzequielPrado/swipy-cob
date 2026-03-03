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
  TestTube2,
  ExternalLink,
  Search,
  Building2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCharges: 0,
    activeSubs: 0,
    overdueAmount: 0
  });
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Estados do Simulador
  const [selectedChargeId, setSelectedChargeId] = useState('');

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      // 1. Métricas Globais
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: chargesData } = await supabase.from('charges').select('amount, status');
      const { count: subs } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true, filter: 'status=eq.active' });

      const overdue = chargesData?.filter(c => c.status === 'atrasado').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setStats({
        totalUsers: users || 0,
        totalCharges: chargesData?.length || 0,
        activeSubs: subs || 0,
        overdueAmount: overdue
      });

      // 2. Transações Recentes (Global)
      const { data: charges } = await supabase
        .from('charges')
        .select('*, customers(name), profiles:user_id(company, full_name)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (charges) setRecentCharges(charges);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleSimulate = async (dayOffset: number) => {
    if (!selectedChargeId) return showError("Selecione uma cobrança na lista abaixo.");
    
    setProcessing(`test-${dayOffset}`);
    try {
      const { data: rule } = await supabase
        .from('billing_rules')
        .select('name')
        .eq('day_offset', dayOffset)
        .eq('is_active', true)
        .single();

      if (!rule) throw new Error(`Regra D${dayOffset} não encontrada ou inativa.`);

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          chargeId: selectedChargeId,
          templateName: rule.name,
          manualTrigger: true 
        })
      });

      if (!response.ok) throw new Error("Falha no disparo do WhatsApp.");
      showSuccess(`Simulação D${dayOffset} enviada!`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Visão Global do Sistema</h2>
            <p className="text-zinc-400 mt-1">Métricas em tempo real de todos os lojistas.</p>
          </div>
          <button onClick={fetchGlobalData} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* 4 Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Users size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Lojistas</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <CreditCard size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Cobranças Totais</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalCharges}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Activity size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Recorrências</span>
            </div>
            <p className="text-3xl font-bold">{stats.activeSubs}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-orange-500/50 shadow-xl">
            <div className="flex items-center gap-3 text-orange-500 mb-3">
              <AlertTriangle size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Inadimplência</span>
            </div>
            <p className="text-3xl font-bold">R$ {stats.overdueAmount.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tabela de Transações Recentes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-widest">Últimas Transações</h3>
              <button className="text-[10px] font-bold text-orange-500 hover:underline">VER TODAS</button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Lojista / Cliente</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {recentCharges.map((charge) => (
                    <tr 
                      key={charge.id} 
                      className={cn(
                        "hover:bg-zinc-800/30 transition-colors group cursor-pointer",
                        selectedChargeId === charge.id && "bg-orange-500/5"
                      )}
                      onClick={() => setSelectedChargeId(charge.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-100">{charge.profiles?.company || charge.profiles?.full_name}</p>
                            <p className="text-[10px] text-zinc-500">Para: {charge.customers?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-zinc-200">R$ {charge.amount.toLocaleString('pt-BR')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border",
                          charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {charge.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/cobrancas/${charge.id}`); }}
                          className="p-2 text-zinc-600 hover:text-orange-400 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simulador de Régua Organizado */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-widest px-2">Simulador de Régua</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
              
              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <p className="text-[9px] font-bold text-zinc-600 uppercase mb-2">Cobrança Selecionada</p>
                  {selectedChargeId ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Zap size={16} />
                      </div>
                      <p className="text-xs font-bold text-zinc-200">
                        {recentCharges.find(c => c.id === selectedChargeId)?.customers?.name || "Selecionada"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-500 italic">Clique em uma cobrança na tabela ao lado para testar.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Criação', offset: -1 },
                    { label: 'Vencimento', offset: 0 },
                    { label: 'D+3 Atraso', offset: 3 },
                    { label: 'D+7 Crítico', offset: 7 }
                  ].map((stage) => (
                    <button
                      key={stage.offset}
                      disabled={!selectedChargeId || !!processing}
                      onClick={() => handleSimulate(stage.offset)}
                      className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-orange-500/50 transition-all group disabled:opacity-50"
                    >
                      {processing === `test-${stage.offset}` ? (
                        <Loader2 className="animate-spin text-orange-500 mb-2" size={16} />
                      ) : (
                        <TestTube2 className="text-zinc-600 group-hover:text-orange-500 mb-2 transition-colors" size={16} />
                      )}
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-100">{stage.label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-[9px] text-zinc-600 leading-relaxed text-center px-4 italic">
                  Ao clicar, o sistema ignora as datas reais e dispara o template configurado na Régua Global para o WhatsApp do cliente selecionado.
                </p>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-orange-500 mb-2">
                <Search size={14} />
                <h4 className="text-[10px] font-bold uppercase">Como testar?</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Selecione qualquer transação na tabela da esquerda (ela ficará destacada) e depois clique em um dos estágios acima para simular o disparo imediato.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;