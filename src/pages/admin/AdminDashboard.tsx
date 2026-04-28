"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, CreditCard, Activity, AlertTriangle, Loader2, RefreshCw, Zap,
  Building2, CalendarCheck, MessageSquare, TrendingUp, DollarSign, Package, Factory, ArrowUpRight, ShieldCheck, Globe, Play, Calendar, Send, CheckCircle2, Clock, Layers
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalCharges: 0, activeSubs: 0, totalVolumePaid: 0, totalCustomers: 0 });
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [merchantsReturn, setMerchantsReturn] = useState<any[]>([]);
  const [saasMetrics, setSaasMetrics] = useState({ mrr: 0, arpu: 0, ltv: 0 });
  const [delinquencyReport, setDelinquencyReport] = useState<any[]>([]);

  // Simulador de Crescimento
  const [simTaxaFixa, setSimTaxaFixa] = useState(1.50);
  const [simNovasEmpresas, setSimNovasEmpresas] = useState(10);
  const [simTicketPlano, setSimTicketPlano] = useState(99.00);
  const [simTransacoesPorEmpresa, setSimTransacoesPorEmpresa] = useState(100);
  const [globalCustomers, setGlobalCustomers] = useState<any[]>([]);
  const [availableRules, setAvailableRules] = useState<any[]>([]);
  const [plansDistribution, setPlansDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  // States para o Teste de WhatsApp
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [selectedTestCharge, setSelectedTestCharge] = useState<any>(null);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const [profilesRes, chargesRes, subsRes, custRes, rulesRes, plansRes, allChargesRes] = await Promise.all([
        supabase.from('profiles').select('id, company, full_name, plan_id, status, system_plans(name, price), transaction_fee_fixed'),
        supabase.from('charges').select('id, amount, status, user_id, customer_id, customers(name)').order('created_at', { ascending: false }).limit(30),
        supabase.from('subscriptions').select('id').eq('status', 'active'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('billing_rules').select('id, label, day_offset').eq('is_active', true).order('day_offset', { ascending: true }),
        supabase.from('system_plans').select('id, name'),
        supabase.from('charges').select('user_id, amount, status, due_date, created_at')
      ]);

      const allProfiles = profilesRes.data || [];
      const allCharges = allChargesRes.data || [];
      const allPaidCharges = allCharges.filter(c => c.status === 'pago');
      const totalPaid = allPaidCharges.reduce((acc, c) => acc + Number(c.amount), 0);
      
      setStats({ 
        totalUsers: allProfiles.length, 
        totalCharges: chargesRes.data?.length || 0, 
        activeSubs: subsRes.data?.length || 0, 
        totalVolumePaid: totalPaid,
        totalCustomers: custRes.data?.length || 0
      });

      // Calcular retorno por lojista
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const returnData = allProfiles
        .filter(profile => profile.company && profile.company.trim() !== '')
        .filter(profile => profile.company !== profile.full_name)
        .map(profile => {
        const merchantCharges = allPaidCharges.filter(c => c.user_id === profile.id);
        
        const currentMonthCharges = merchantCharges.filter(c => {
          if (!c.created_at) return false;
          const date = new Date(c.created_at);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const tpvTotal = merchantCharges.reduce((acc, c) => acc + Number(c.amount), 0);
        const tpvMonth = currentMonthCharges.reduce((acc, c) => acc + Number(c.amount), 0);
        const feeFixed = profile.transaction_fee_fixed || 0;
        
        const txCountTotal = merchantCharges.length;
        const txCountMonth = currentMonthCharges.length;
        
        const returnTotal = txCountTotal * feeFixed;
        const returnMonth = txCountMonth * feeFixed;

        return {
          id: profile.id,
          company: profile.company || 'Pessoa Física',
          fullName: profile.full_name,
          plan: profile.system_plans?.name || 'SaaS Gratuito',
          tpvMonth,
          txCountMonth,
          returnMonth,
          returnTotal,
          feeFixed
        };
      }).sort((a, b) => b.returnMonth - a.returnMonth);

      setMerchantsReturn(returnData);

      // Calcular Métricas SaaS
      const activeMerchants = allProfiles.filter(p => p.plan_id);
      const mrr = activeMerchants.reduce((acc, p) => acc + (p.system_plans?.price || 0), 0);
      const arpu = activeMerchants.length > 0 ? mrr / activeMerchants.length : 0;
      const ltv = arpu * 12;

      setSaasMetrics({ mrr, arpu, ltv });

      // Calcular Inadimplência
      const nowStr = new Date().toISOString().split('T')[0];
      const overdueCharges = allCharges.filter(c => c.status === 'pendente' && c.due_date && c.due_date < nowStr);

      const delinquencyData = allProfiles
        .filter(profile => profile.company && profile.company.trim() !== '')
        .map(profile => {
          const merchantOverdue = overdueCharges.filter(c => c.user_id === profile.id);
          const totalOverdue = merchantOverdue.reduce((acc, c) => acc + Number(c.amount), 0);
          const countOverdue = merchantOverdue.length;

          return {
            id: profile.id,
            company: profile.company,
            fullName: profile.full_name,
            totalOverdue,
            countOverdue
          };
        })
        .filter(d => d.totalOverdue > 0)
        .sort((a, b) => b.totalOverdue - a.totalOverdue);

      setDelinquencyReport(delinquencyData);

      if (rulesRes.data) setAvailableRules(rulesRes.data);

      // Distribuição de Lojistas por Plano
      if (plansRes.data) {
        const dist = plansRes.data.map(plan => {
          const count = allProfiles.filter(p => p.plan_id === plan.id).length;
          return { name: plan.name, count };
        }).sort((a, b) => b.count - a.count);
        
        // Adiciona os que não têm plano (Free/Trial)
        const noPlanCount = allProfiles.filter(p => !p.plan_id).length;
        if (noPlanCount > 0) {
          dist.push({ name: 'Sem Plano / Free', count: noPlanCount });
        }
        
        setPlansDistribution(dist);
      }

      if (chargesRes.data) {
        const enrichedCharges = chargesRes.data.slice(0, 10).map(c => ({
          ...c,
          merchant: allProfiles.find(p => p.id === c.user_id)
        }));
        setRecentCharges(enrichedCharges);
      }

      if (custRes.data) {
        const enrichedCustomers = custRes.data.map(cust => ({
          ...cust,
          merchant: allProfiles.find(p => p.id === cust.user_id)
        }));
        setGlobalCustomers(enrichedCustomers);
      }

    } catch (err) { 
      console.error("[AdminDashboard] Erro ao carregar dados:", err); 
    } finally { 
      setLoading(false); 
    }
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

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !selectedTestCharge || !selectedRuleId) {
      return showError("Preencha todos os campos do teste.");
    }
    
    setRunningAction('test_whatsapp');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/resend-charge-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          chargeId: selectedTestCharge.id,
          ruleId: selectedRuleId,
          origin: window.location.origin,
          overridePhone: testPhone
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      showSuccess("Disparo de teste realizado!");
      setIsTestModalOpen(false);
      setTestPhone('');
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
              <ShieldCheck className="text-orange-500" size={32} /> Admin Control
            </h2>
            <p className="text-apple-muted font-medium">Governança Master da Swipy Fintech.</p>
          </div>
          <button onClick={fetchGlobalData} className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted shadow-sm hover:bg-apple-light transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* MÉTRICAS SAAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-500" /> MRR (Receita Recorrente)
            </p>
            <p className="text-4xl font-black text-apple-black">{currency.format(saasMetrics.mrr)}</p>
            <p className="text-[10px] text-apple-muted mt-2 font-bold flex items-center gap-1">Soma dos planos ativos</p>
          </div>
          
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" /> ARPU (Ticket Médio)
            </p>
            <p className="text-4xl font-black text-apple-black">{currency.format(saasMetrics.arpu)}</p>
            <p className="text-[10px] text-apple-muted mt-2 font-bold flex items-center gap-1">Por lojista ativo</p>
          </div>

          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck size={14} className="text-orange-500" /> LTV Estimado
            </p>
            <p className="text-4xl font-black text-apple-black">{currency.format(saasMetrics.ltv)}</p>
            <p className="text-[10px] text-apple-muted mt-2 font-bold flex items-center gap-1">Projeção 12 meses</p>
          </div>
        </div>

        {/* KPIs GLOBAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Lojistas Ativos</p>
            <p className="text-4xl font-black text-apple-black">{stats.totalUsers}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={100} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Volume SaaS (TPV)</p>
            <p className="text-4xl font-black text-emerald-600">{currency.format(stats.totalVolumePaid)}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={100} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Clientes Finais</p>
            <p className="text-4xl font-black text-blue-600">{stats.totalCustomers}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Users size={100} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Assinaturas Ativas</p>
            <p className="text-4xl font-black text-orange-500">{stats.activeSubs}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><CalendarCheck size={100} /></div>
          </div>
        </div>

        {/* SIMULADOR DE CRESCIMENTO */}
        {(() => {
          const qtdEmpresasAtuais = stats.totalUsers;
          const mrrAtual = saasMetrics.mrr;
          const taxasAtuais = merchantsReturn.reduce((acc, m) => acc + m.returnMonth, 0);
          const receitaMensalAtual = mrrAtual + taxasAtuais;
          
          const totalEmpresasProjetadas = qtdEmpresasAtuais + simNovasEmpresas;
          const mrrProjetado = (qtdEmpresasAtuais * (saasMetrics.arpu || simTicketPlano)) + (simNovasEmpresas * simTicketPlano);
          const taxasProjetadas = totalEmpresasProjetadas * simTransacoesPorEmpresa * simTaxaFixa;
          const receitaMensalProjetada = mrrProjetado + taxasProjetadas;
          const lucroAdicional = receitaMensalProjetada - receitaMensalAtual;

          return (
            <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} className="text-orange-500" /> Simulador de Crescimento Swipy
                  </h3>
                  <p className="text-apple-muted text-xs font-medium mt-1">Projete cenários de faturamento alterando as variáveis do seu negócio.</p>
                </div>
                <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl font-black text-sm border border-orange-100 flex items-center gap-2">
                  <span>Lucro Adicional:</span>
                  <span>{currency.format(lucroAdicional)} /mês</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-apple-muted flex justify-between">
                    <span>Taxa Fixa (R$)</span>
                    <span className="text-orange-500">{currency.format(simTaxaFixa)}</span>
                  </Label>
                  <input 
                    type="range" min="0.50" max="10.00" step="0.10" 
                    value={simTaxaFixa} onChange={e => setSimTaxaFixa(Number(e.target.value))}
                    className="w-full h-2 bg-apple-offWhite rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-apple-muted flex justify-between">
                    <span>Novas Empresas</span>
                    <span className="text-orange-500">+{simNovasEmpresas}</span>
                  </Label>
                  <input 
                    type="range" min="1" max="100" step="1" 
                    value={simNovasEmpresas} onChange={e => setSimNovasEmpresas(Number(e.target.value))}
                    className="w-full h-2 bg-apple-offWhite rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-apple-muted flex justify-between">
                    <span>Ticket Plano (R$)</span>
                    <span className="text-orange-500">{currency.format(simTicketPlano)}</span>
                  </Label>
                  <input 
                    type="range" min="29.00" max="499.00" step="10" 
                    value={simTicketPlano} onChange={e => setSimTicketPlano(Number(e.target.value))}
                    className="w-full h-2 bg-apple-offWhite rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-apple-muted flex justify-between">
                    <span>Tx / Mês por Empresa</span>
                    <span className="text-orange-500">{simTransacoesPorEmpresa}</span>
                  </Label>
                  <input 
                    type="range" min="10" max="1000" step="10" 
                    value={simTransacoesPorEmpresa} onChange={e => setSimTransacoesPorEmpresa(Number(e.target.value))}
                    className="w-full h-2 bg-apple-offWhite rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-apple-offWhite p-6 rounded-3xl border border-apple-border">
                <div>
                  <span className="text-[10px] font-black uppercase text-apple-muted block">Receita Atual</span>
                  <span className="text-lg font-bold text-apple-black">{currency.format(receitaMensalAtual)}</span>
                  <span className="text-[9px] text-apple-muted block font-medium mt-0.5">Planos + Taxas do mês</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-apple-muted block">Nova Receita Projetada</span>
                  <span className="text-xl font-black text-emerald-600">{currency.format(receitaMensalProjetada)}</span>
                  <span className="text-[9px] text-emerald-600 block font-black mt-0.5">Crescimento de {((receitaMensalProjetada / (receitaMensalAtual || 1) - 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase text-apple-muted block">Empresas Projetadas</span>
                  <span className="text-lg font-bold text-orange-500">{totalEmpresasProjetadas}</span>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AUTOMAÇÕES */}
          <div className="lg:col-span-2 bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={140} className="text-orange-500" /></div>
             <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
               <Zap size={16} /> Comandos de Servidor (Manual Override)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <button 
                  onClick={() => runAutomation('subscriptions')}
                  disabled={!!runningAction}
                  className="bg-apple-offWhite hover:bg-blue-50 border border-apple-border p-6 rounded-3xl flex flex-col justify-between group transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 border border-apple-border shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {runningAction === 'subscriptions' ? <Loader2 className="animate-spin" /> : <RefreshCw size={24} />}
                    </div>
                    <Play size={20} className="text-apple-muted opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <div>
                    <p className="font-black text-apple-black text-base">Processar Assinaturas</p>
                    <p className="text-[10px] text-apple-muted mt-1 font-medium">Gera as cobranças Pix para as recorrências de hoje.</p>
                  </div>
                </button>

                <button 
                  onClick={() => runAutomation('billing')}
                  disabled={!!runningAction}
                  className="bg-apple-offWhite hover:bg-orange-50 border border-apple-border p-6 rounded-3xl flex flex-col justify-between group transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 border border-apple-border shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-all">
                      {runningAction === 'billing' ? <Loader2 className="animate-spin" /> : <MessageSquare size={24} />}
                    </div>
                    <Play size={20} className="text-apple-muted opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <div>
                    <p className="font-black text-apple-black text-base">Disparar Régua Global</p>
                    <p className="text-[10px] text-apple-muted mt-1 font-medium">Envia os WhatsApps de aviso e atraso para todos.</p>
                  </div>
                </button>
             </div>
          </div>

          {/* DISTRIBUIÇÃO DE PLANOS */}
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm flex flex-col">
             <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <Layers size={16} className="text-blue-500" /> Assinantes por Plano
             </h3>
             <div className="flex-1 space-y-4">
               {loading ? (
                 <div className="flex justify-center py-10"><Loader2 className="animate-spin text-apple-muted" size={24} /></div>
               ) : plansDistribution.length === 0 ? (
                 <p className="text-xs text-apple-muted italic text-center py-10">Nenhum plano atribuído.</p>
               ) : (
                 plansDistribution.map((pd, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 bg-apple-offWhite border border-apple-border rounded-2xl">
                      <p className="text-xs font-bold text-apple-black truncate pr-4">{pd.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                         <span className="text-sm font-black text-orange-500">{pd.count}</span>
                         <span className="text-[9px] font-black uppercase text-apple-muted">Lojas</span>
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MONITOR DE TRANSAÇÕES */}
          <div className="lg:col-span-2 bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-orange-500" /> Fluxo Global de Cobranças
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Merchant / Lojista</th>
                    <th className="px-8 py-5 text-right">Valor</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Laboratório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {recentCharges.map((c) => (
                    <tr key={c.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-apple-black truncate max-w-[200px]">{c.merchant?.company || 'Pessoa Física'}</p>
                        <p className="text-[10px] text-apple-muted font-bold flex items-center gap-1">Cliente: {c.customers?.name}</p>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-apple-black">{currency.format(c.amount)}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border",
                          c.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                        )}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => {
                            setSelectedTestCharge(c);
                            setIsTestModalOpen(true);
                          }}
                          className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-100 group-hover:scale-105 active:scale-95"
                          title="Testar Régua de Cobrança"
                        >
                          <Send size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CRM GLOAL */}
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
             <div className="p-8 border-b border-apple-border bg-apple-offWhite">
                <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-blue-500" /> CRM Global Master
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto">
               <table className="w-full text-left">
                  <tbody className="divide-y divide-apple-border">
                    {globalCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-apple-light transition-colors">
                        <td className="px-8 py-4">
                           <p className="text-sm font-black text-apple-black">{cust.name}</p>
                           <p className="text-[10px] text-apple-muted font-bold uppercase mt-1">Lojista: <span className="text-orange-500">{cust.merchant?.company || 'N/A'}</span></p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* MONITOR DE INADIMPLÊNCIA */}
        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
            <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" /> Monitor de Inadimplência Global
            </h3>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-apple-muted block">Total Vencido na Rua</span>
              <span className="text-xl font-black text-red-600">
                {currency.format(delinquencyReport.reduce((acc, d) => acc + d.totalOverdue, 0))}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Empresa / Responsável</th>
                  <th className="px-8 py-5 text-center">Qtd Títulos Vencidos</th>
                  <th className="px-8 py-5 text-right">Valor Total Vencido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {delinquencyReport.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-6 text-center text-xs text-apple-muted font-bold">
                      Nenhuma cobrança vencida encontrada. Parabéns!
                    </td>
                  </tr>
                ) : (
                  delinquencyReport.map((d) => (
                    <tr key={d.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-sm font-black text-apple-black">{d.company}</p>
                        <p className="text-[10px] text-apple-muted font-bold">{d.fullName}</p>
                      </td>
                      <td className="px-8 py-4 text-center font-black text-red-500">
                        {d.countOverdue}
                      </td>
                      <td className="px-8 py-4 text-right font-black text-red-600">
                        {currency.format(d.totalOverdue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RELATÓRIO DE RETORNO POR LOJISTA */}
        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
            <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={16} className="text-orange-500" /> Retorno Financeiro por Lojista (Transações)
            </h3>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-apple-muted block">Retorno Total Acumulado</span>
              <span className="text-xl font-black text-emerald-600">
                {currency.format(merchantsReturn.reduce((acc, m) => acc + m.swipyReturn, 0))}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Empresa / Responsável</th>
                  <th className="px-8 py-5">Plano Atual</th>
                  <th className="px-8 py-5 text-right">TPV (Mês Atual)</th>
                  <th className="px-8 py-5 text-center">Tx (Mês)</th>
                  <th className="px-8 py-5 text-center">Taxa</th>
                  <th className="px-8 py-5 text-right">Retorno (Mês)</th>
                  <th className="px-8 py-5 text-right">Retorno (Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {merchantsReturn.map((m) => (
                  <tr key={m.id} className="hover:bg-apple-light transition-colors">
                    <td className="px-8 py-4">
                      <p className="text-sm font-black text-apple-black">{m.company}</p>
                      <p className="text-[10px] text-apple-muted font-bold">{m.fullName}</p>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-100">
                        {m.plan}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right font-bold text-apple-black">
                      {currency.format(m.tpvMonth)}
                    </td>
                    <td className="px-8 py-4 text-center font-black text-blue-600">
                      {m.txCountMonth}
                    </td>
                    <td className="px-8 py-4 text-center font-black text-orange-500">
                      {currency.format(m.feeFixed)}
                    </td>
                    <td className="px-8 py-4 text-right font-black text-emerald-600">
                      {currency.format(m.returnMonth)}
                    </td>
                    <td className="px-8 py-4 text-right font-bold text-apple-muted">
                      {currency.format(m.returnTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE TESTE AVANÇADO (CHOICE DE RÉGUA) */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[3rem] p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <DialogHeader className="p-10 bg-apple-offWhite border-b border-apple-border relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Send size={80} className="text-orange-500" /></div>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Send size={24} />
              </div>
              Simulador de Régua
            </DialogTitle>
            <p className="text-xs text-apple-muted font-bold mt-4">Simulando cobrança de <span className="text-orange-500">{selectedTestCharge?.customers?.name}</span> no valor de {selectedTestCharge && currency.format(selectedTestCharge.amount)}.</p>
          </DialogHeader>

          <form onSubmit={handleSendTest} className="p-10 space-y-8">
             <div className="space-y-3">
                <Label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] ml-1">1. Qual template deseja testar?</Label>
                <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                   <SelectTrigger className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-bold focus:ring-orange-500/20 text-sm shadow-sm">
                      <SelectValue placeholder="Escolha um gatilho da régua..." />
                   </SelectTrigger>
                   <SelectContent className="bg-apple-white border-apple-border">
                      {availableRules.map(rule => (
                        <SelectItem key={rule.id} value={rule.id} className="focus:bg-orange-50">
                          <div className="flex items-center gap-2">
                             {rule.day_offset === -1 ? <Zap size={14} className="text-orange-500" /> : <Clock size={14} className="text-blue-500" />}
                             <span className="font-bold">{rule.label}</span>
                             <span className="text-[9px] text-apple-muted uppercase font-black ml-2 opacity-50">({rule.day_offset === -1 ? 'Criada' : `D${rule.day_offset}`})</span>
                          </div>
                        </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] ml-1">2. Telefone para entrega (DDI+DDD+Nº)</Label>
                <div className="relative">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 text-apple-muted"><Globe size={18} /></div>
                   <Input 
                      required
                      placeholder="5511999999999" 
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="bg-apple-offWhite border-apple-border h-14 rounded-2xl pl-14 font-mono font-bold text-apple-black shadow-sm focus:ring-orange-500/20" 
                   />
                </div>
                <p className="text-[9px] text-apple-muted font-medium px-1 italic">Dica: Use seu próprio número para validar como o cliente verá a mensagem.</p>
             </div>

             <DialogFooter className="pt-4">
               <button 
                 type="submit" 
                 disabled={runningAction === 'test_whatsapp' || !selectedRuleId} 
                 className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50 text-base active:scale-95"
               >
                 {runningAction === 'test_whatsapp' ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                 DISPARAR TESTE AGORA
               </button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
};

export default AdminDashboard;