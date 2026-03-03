"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  CreditCard, 
  Activity, 
  AlertTriangle, 
  Play, 
  Loader2, 
  RefreshCw,
  Send,
  Zap,
  TestTube2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCharges: 0,
    activeSubs: 0,
    overdueAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Estados do Simulador
  const [testCharges, setTestCharges] = useState<any[]>([]);
  const [selectedChargeId, setSelectedChargeId] = useState('');

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: charges } = await supabase.from('charges').select('amount, status');
      const { count: subs } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true, filter: 'status=eq.active' });

      const overdue = charges?.filter(c => c.status === 'atrasado').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setStats({
        totalUsers: users || 0,
        totalCharges: charges?.length || 0,
        activeSubs: subs || 0,
        overdueAmount: overdue
      });

      const { data: recent } = await supabase
        .from('charges')
        .select('id, amount, customers(name)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recent) setTestCharges(recent);

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
    if (!selectedChargeId) return showError("Selecione uma cobrança primeiro.");
    
    setProcessing(`test-${dayOffset}`);
    try {
      const { data: rule } = await supabase
        .from('billing_rules')
        .select('name')
        .eq('day_offset', dayOffset)
        .eq('is_active', true)
        .single();

      if (!rule) throw new Error(`Não há regra ativa para D${dayOffset}`);

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          chargeId: selectedChargeId,
          templateName: rule.name,
          manualTrigger: true // Flag para o backend saber que é um teste
        })
      });

      if (!response.ok) throw new Error("Erro ao disparar simulação");
      showSuccess(`Simulação D${dayOffset} enviada com sucesso!`);
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
            <h2 className="text-3xl font-bold tracking-tight">Visão Global</h2>
            <p className="text-zinc-400 mt-1">Métricas de toda a plataforma Swipy Cob.</p>
          </div>
          <button onClick={fetchGlobalData} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* 4 Cards Principais (Visual Revertido) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Users size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Lojistas Totais</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <CreditCard size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Cobranças Ativas</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalCharges}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Activity size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Recorrências</span>
            </div>
            <p className="text-3xl font-bold">{stats.activeSubs}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-orange-500/50 shadow-xl">
            <div className="flex items-center gap-3 text-orange-500 mb-2">
              <AlertTriangle size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Inadimplência</span>
            </div>
            <p className="text-3xl font-bold">R$ {stats.overdueAmount.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Seção de Simulador (Melhor Organizada) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <TestTube2 size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Simulador de Régua</h3>
                <p className="text-xs text-zinc-500">Teste o envio de mensagens vencidas agora mesmo.</p>
              </div>
            </div>
            <select 
              value={selectedChargeId}
              onChange={(e) => setSelectedChargeId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none w-64"
            >
              <option value="">Selecione uma cobrança...</option>
              {testCharges.map(c => (
                <option key={c.id} value={c.id}>{c.customers?.name} (R$ {c.amount})</option>
              ))}
            </select>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Criação', offset: -1, desc: 'Imediato' },
              { label: 'Vencimento', offset: 0, desc: 'Dia D0' },
              { label: 'Atrasada', offset: 3, desc: 'D+3' },
              { label: 'Crítica', offset: 7, desc: 'D+7' }
            ].map((stage) => (
              <button
                key={stage.offset}
                disabled={!selectedChargeId || !!processing}
                onClick={() => handleSimulate(stage.offset)}
                className="flex flex-col items-center gap-3 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-orange-500/50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-colors">
                  {processing === `test-${stage.offset}` ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{stage.label}</p>
                  <p className="text-[10px] text-zinc-600 uppercase font-bold">{stage.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;