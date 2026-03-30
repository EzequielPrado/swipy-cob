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
      const [profilesRes, chargesRes, subsRes, custRes, rulesRes, plansRes] = await Promise.all([
        supabase.from('profiles').select('id, company, full_name, plan_id, system_plans(name)'),
        supabase.from('charges').select('id, amount, status, user_id, customer_id, customers(name)').order('created_at', { ascending: false }).limit(30),
        supabase.from('subscriptions').select('id').eq('status', 'active'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('billing_rules').select('id, label, day_offset').eq('is_active', true).order('day_offset', { ascending: true }),
        supabase.from('system_plans').select('id, name')
      ]);

      const allProfiles = profilesRes.data || [];
      const totalPaid = (chargesRes.data || []).filter(c => c.status === 'pago').reduce((acc, c) => acc + Number(c.amount), 0);
      
      setStats({ 
        totalUsers: allProfiles.length, 
        totalCharges: chargesRes.data?.length || 0, 
        activeSubs: subsRes.data?.length || 0, 
        totalVolumePaid: totalPaid,
        totalCustomers: custRes.data?.length || 0
      });

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