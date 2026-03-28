"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, CreditCard, Activity, AlertTriangle, Loader2, RefreshCw, Zap,
  Building2, CalendarCheck, MessageSquare, TrendingUp, DollarSign, Package, Factory, ArrowUpRight, ShieldCheck, Globe, Play, Calendar
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalCharges: 0, activeSubs: 0, totalVolumePaid: 0, totalCustomers: 0 });
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [globalCustomers, setGlobalCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const [profilesRes, chargesRes, subsRes, custRes] = await Promise.all([
        supabase.from('profiles').select('id'),
        supabase.from('charges').select('amount, status'),
        supabase.from('subscriptions').select('id').eq('status', 'active'),
        supabase.from('customers').select('*, profiles:user_id(company, full_name)').order('created_at', { ascending: false }).limit(20)
      ]);

      const totalPaid = chargesRes.data?.filter(c => c.status === 'pago').reduce((acc, c) => acc + Number(c.amount), 0) || 0;
      
      setStats({ 
        totalUsers: profilesRes.data?.length || 0, 
        totalCharges: chargesRes.data?.length || 0, 
        activeSubs: subsRes.data?.length || 0, 
        totalVolumePaid: totalPaid,
        totalCustomers: custRes.data?.length || 0
      });

      const { data: charges } = await supabase.from('charges').select('*, customers(name), profiles:user_id(company, full_name)').order('created_at', { ascending: false }).limit(10);
      if (charges) setRecentCharges(charges);
      if (custRes.data) setGlobalCustomers(custRes.data);

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchGlobalData(); }, []);

  const runAutomation = async (action: 'subscriptions' | 'billing') => {
    setRunningAction(action);
    const endpoint = action === 'subscriptions' ? 'process-recurring-charges' : 'process-billing-schedule';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro no servidor");
      
      showSuccess(action === 'subscriptions' ? "Assinaturas processadas com sucesso!" : "Régua de cobrança disparada!");
      fetchGlobalData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setRunningAction(null);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black">
              <ShieldCheck className="text-orange-500" size={32} /> SaaS Governance
            </h2>
            <p className="text-apple-muted font-medium italic">Painel de Controle Master • Swipy Fintech LTDA</p>
          </div>
          <div className="flex gap-2">
             <button onClick={fetchGlobalData} className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted shadow-sm hover:bg-apple-light transition-all">
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {/* CONTROLES DE SERVIDOR */}
        <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-[2.5rem] shadow-sm">
           <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
             <Zap size={16} /> Ações de Automação de Servidor
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => runAutomation('subscriptions')}
                disabled={!!runningAction}
                className="bg-apple-white hover:bg-apple-offWhite border border-apple-border p-6 rounded-3xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {runningAction === 'subscriptions' ? <Loader2 className="animate-spin" /> : <RefreshCw size={24} />}
                  </div>
                  <div>
                    <p className="font-bold text-apple-black text-sm">Gerar Assinaturas do Dia</p>
                    <p className="text-[10px] text-apple-muted">Processa mensalidades e cria cobranças Pix.</p>
                  </div>
                </div>
                <Play size={18} className="text-apple-muted opacity-0 group-hover:opacity-100 transition-all" />
              </button>

              <button 
                onClick={() => runAutomation('billing')}
                disabled={!!runningAction}
                className="bg-apple-white hover:bg-apple-offWhite border border-apple-border p-6 rounded-3xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    {runningAction === 'billing' ? <Loader2 className="animate-spin" /> : <MessageSquare size={24} />}
                  </div>
                  <div>
                    <p className="font-bold text-apple-black text-sm">Disparar Réguas de Cobrança</p>
                    <p className="text-[10px] text-apple-muted">Envia WhatsApps automáticos (Aviso, Vence Hoje, Atraso).</p>
                  </div>
                </div>
                <Play size={18} className="text-apple-muted opacity-0 group-hover:opacity-100 transition-all" />
              </button>
           </div>
        </div>

        {/* KPIs GLOBAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Lojistas Ativos</p>
            <p className="text-4xl font-black text-apple-black">{stats.totalUsers}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Volume SaaS (TPV)</p>
            <p className="text-4xl font-black text-emerald-600">{currency.format(stats.totalVolumePaid)}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Clientes Cadastrados</p>
            <p className="text-4xl font-black text-blue-600">{stats.totalCustomers}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Users size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Assinaturas Ativas</p>
            <p className="text-4xl font-black text-orange-500">{stats.activeSubs}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><CalendarCheck size={80} /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MONITOR DE TRANSAÇÕES */}
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-orange-500" /> Fluxo de Caixa SaaS
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Lojista</th>
                  <th className="px-8 py-5 text-right">Valor</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {recentCharges.map((c) => (
                  <tr key={c.id} className="hover:bg-apple-light transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black truncate max-w-[150px]">{c.profiles?.company || 'Pessoa Física'}</p>
                      <p className="text-[9px] text-apple-muted uppercase font-bold">Cliente: {c.customers?.name}</p>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-apple-black">{currency.format(c.amount)}</td>
                    <td className="px-8 py-5 text-right">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border",
                        c.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                      )}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CRM CONSOLIDADO (BASE DE CLIENTES GERAL) */}
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
             <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> CRM Global Master
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Cliente Final</th>
                  <th className="px-8 py-5">Vinculado a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {globalCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-apple-light transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black">{cust.name}</p>
                      <p className="text-[9px] text-apple-muted font-bold font-mono">{cust.tax_id}</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{cust.profiles?.company || 'Lojista Master'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-apple-offWhite text-center border-t border-apple-border">
               <button onClick={() => fetchGlobalData()} className="text-[10px] font-black text-apple-muted uppercase hover:text-apple-black transition-colors">Ver base completa de mercado</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;