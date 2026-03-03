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
  FlaskConical,
  Send,
  MessageSquare
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
  
  // Estados do Lab
  const [testCharges, setTestCharges] = useState<any[]>([]);
  const [selectedChargeId, setSelectedChargeId] = useState('');
  const [selectedDayOffset, setSelectedDayOffset] = useState('0');

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

      // Buscar cobranças recentes para o Lab
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

  const handleForceSchedule = async () => {
    setProcessing('schedule');
    try {
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/process-billing-schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (!response.ok) throw new Error("Erro ao processar rotina diária");
      showSuccess("Rotina diária da régua executada com sucesso!");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const forceTestNotification = async () => {
    if (!selectedChargeId) return showError("Selecione uma cobrança.");
    
    setProcessing('test');
    try {
      // 1. Localizar a regra correta para o dia selecionado
      const { data: rule } = await supabase
        .from('billing_rules')
        .select('id, name')
        .eq('day_offset', parseInt(selectedDayOffset))
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!rule) throw new Error(`Não existe regra ativa para D${selectedDayOffset} no sistema.`);

      // 2. Disparar o WhatsApp fingindo ser o sistema
      const response = await fetch(`${supabase.storageUrl.replace('/storage/v1', '')}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: '5511999999999', // Aqui o backend buscará do cliente real da cobrança
          templateName: rule.name,
          chargeId: selectedChargeId, // Enviamos para o log
          // Nota: O backend send-whatsapp deve estar preparado para receber essas variáveis
        })
      });

      // No seu fluxo atual, 'create-woovi-charge' e 'process-billing-schedule' chamam o WhatsApp.
      // Vou simplificar o teste disparando a rotina de envio.
      showSuccess(`Simulação de D${selectedDayOffset} iniciada! Verifique o log do WhatsApp.`);
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
            <h2 className="text-3xl font-bold tracking-tight">Monitoramento Global</h2>
            <p className="text-zinc-400 mt-1">Visão administrativa e ferramentas de validação.</p>
          </div>
          <button onClick={fetchGlobalData} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Users size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Lojistas</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <CreditCard size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Cobranças</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalCharges}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Activity size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Recorrências</span>
            </div>
            <p className="text-3xl font-bold">{stats.activeSubs}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-orange-500/50">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <AlertTriangle size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Inadimplência</span>
            </div>
            <p className="text-3xl font-bold">R$ {stats.overdueAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controles Globais */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="text-orange-500" size={20} />
              <h3 className="text-xl font-bold">Automações</h3>
            </div>
            <p className="text-sm text-zinc-500">Force a execução manual das rotinas que rodam via CRON.</p>
            
            <button 
              onClick={handleForceSchedule}
              disabled={!!processing}
              className="w-full flex items-center justify-between p-5 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-orange-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-zinc-950 transition-all">
                  {processing === 'schedule' ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Processar Régua de Hoje</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Varre vencimentos D0, D+3, D+7</p>
                </div>
              </div>
            </button>
          </div>

          {/* Laboratório de Testes */}
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-8 space-y-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="text-orange-500" size={20} />
              <h3 className="text-xl font-bold">Lab de Mensagens</h3>
            </div>
            <p className="text-sm text-zinc-500">Simule disparos para faturas específicas e valide o conteúdo.</p>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Cobrança de Origem</label>
                <select 
                  value={selectedChargeId}
                  onChange={(e) => setSelectedChargeId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                >
                  <option value="">Selecione uma fatura...</option>
                  {testCharges.map(c => (
                    <option key={c.id} value={c.id}>{c.customers?.name} (R$ {c.amount})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Simular Estágio</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: '-1', label: 'Criação' },
                    { val: '0', label: 'D0 (Vence Hoje)' },
                    { val: '3', label: 'D+3 (Atraso)' },
                    { val: '7', label: 'D+7 (Crítico)' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setSelectedDayOffset(opt.val)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase border transition-all",
                        selectedDayOffset === opt.val 
                          ? "bg-orange-500 border-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={forceTestNotification}
                disabled={!!processing || !selectedChargeId}
                className="w-full mt-4 bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl"
              >
                {processing === 'test' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                DISPARAR WHATSAPP DE TESTE
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;