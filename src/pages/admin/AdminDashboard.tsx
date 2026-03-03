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
  const [selectedChargeId, setSelectedChargeId] = useState('');

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
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

      const { data: charges } = await supabase
        .from('charges')
        .select('*, customers(name, email, phone, tax_id), profiles:user_id(company, full_name)')
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
    if (!selectedChargeId) return showError("Selecione uma cobrança na lista.");
    
    setProcessing(`test-${dayOffset}`);
    try {
      // 1. Buscar a Regra
      const { data: rule } = await supabase
        .from('billing_rules')
        .select('*')
        .eq('day_offset', dayOffset)
        .eq('is_active', true)
        .single();

      if (!rule) throw new Error(`Regra para D${dayOffset} não encontrada ou inativa.`);

      // 2. Localizar os dados da cobrança selecionada
      const charge = recentCharges.find(c => c.id === selectedChargeId);
      if (!charge) throw new Error("Dados da cobrança não carregados.");

      // 3. Mapear Variáveis (Lógica idêntica ao disparo real)
      const merchantName = charge.profiles?.company || charge.profiles?.full_name || "Nossa Empresa";
      const appUrl = window.location.origin;
      const internalCheckoutUrl = `${appUrl}/pagar/${charge.id}`;

      const variables = rule.mapping.map((key: string) => {
        if (key === 'customer_name') return charge.customers.name;
        if (key === 'merchant_name') return merchantName;
        if (key === 'amount') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(charge.amount);
        if (key === 'due_date') return new Date(charge.due_date).toLocaleDateString('pt-BR');
        if (key === 'payment_id') return charge.id;
        if (key === 'payment_link') return internalCheckoutUrl;
        return '---';
      });

      const buttonVariable = rule.button_link_variable === 'payment_link' ? internalCheckoutUrl : charge.id;

      // 4. Enviar para a função
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: charge.customers.phone,
          templateName: rule.name,
          language: rule.language || 'en',
          imageUrl: rule.image_url,
          variables: variables,
          buttonVariable: buttonVariable
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro no disparo de teste.");

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
            <p className="text-zinc-400 mt-1">Métricas em tempo real de toda a plataforma.</p>
          </div>
          <button onClick={fetchGlobalData} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Users size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Lojistas</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <CreditCard size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Cobranças</span>
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
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-widest px-2">Transações Recentes</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Lojista / Cliente</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {recentCharges.map((charge) => (
                    <tr 
                      key={charge.id} 
                      className={cn(
                        "hover:bg-zinc-800/30 transition-colors cursor-pointer",
                        selectedChargeId === charge.id && "bg-orange-500/5 border-l-2 border-orange-500"
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
                            <p className="text-[10px] text-zinc-500">{charge.customers?.name}</p>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-widest px-2">Simulador de Régua</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <p className="text-[9px] font-bold text-zinc-600 uppercase mb-2">Simulando para:</p>
                {selectedChargeId ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Zap size={16} />
                    </div>
                    <p className="text-xs font-bold text-zinc-200">
                      {recentCharges.find(c => c.id === selectedChargeId)?.customers?.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500 italic">Clique em uma cobrança na tabela ao lado.</p>
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
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;