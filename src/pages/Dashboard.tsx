"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet, 
  Target, 
  Loader2, 
  RefreshCw,
  Scale,
  CalendarDays,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';
import FinancialAgenda from '@/components/financial/FinancialAgenda';

const COLORS = ['#FF8C42', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#86868b'];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() + 1);
    }
    return options;
  }, []);

  const [finance, setFinance] = useState({
    entradasTotais: 0,
    saidasTotais: 0,
    lucroLiquido: 0,
    aReceber: 0,
    aPagar: 0,
    mrr: 0,
    chartData: [] as any[],
    expenseBreakdown: [] as any[],
    cashProjection: [] as any[]
  });

  const [wallet, setWallet] = useState({ available: 0, total: 0, loading: true });

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

      // 1. Buscar Carteira
      const { data: { session } } = await supabase.auth.getSession();
      const wooviRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      }).then(res => res.json()).catch(() => ({ balance: { total: 0, available: 0 } }));
      
      const swipyBalance = (wooviRes?.balance?.total || 0) / 100;

      // 2. Buscar Contas Bancárias Manuais
      const { data: accounts } = await supabase.from('bank_accounts').select('balance, type').eq('user_id', user.id);
      const manualBalance = accounts?.filter(a => a.type !== 'swipy').reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;
      const currentTotalCash = swipyBalance + manualBalance;

      // 3. Buscar Movimentações do Período
      const [chargesRes, expensesRes, subsRes, categoriesRes] = await Promise.all([
        supabase.from('charges').select('amount, status, due_date').eq('user_id', user.id).gte('due_date', startDate).lte('due_date', endDate),
        supabase.from('expenses').select('amount, status, due_date, chart_of_accounts(name)').eq('user_id', user.id).gte('due_date', startDate).lte('due_date', endDate),
        supabase.from('subscriptions').select('amount').eq('status', 'active').eq('user_id', user.id),
        supabase.from('chart_of_accounts').select('id, name').eq('user_id', user.id).eq('type', 'expense')
      ]);

      const mrr = subsRes.data?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;

      let inPaid = 0, inPending = 0, outPaid = 0, outPending = 0;
      chargesRes.data?.forEach(c => { if (c.status === 'pago') inPaid += Number(c.amount); else inPending += Number(c.amount); });
      expensesRes.data?.forEach(e => { if (e.status === 'pago') outPaid += Number(e.amount); else outPending += Number(e.amount); });

      // Composição de Despesas
      const expMap: Record<string, number> = {};
      expensesRes.data?.forEach(e => {
        const catName = e.chart_of_accounts?.name || 'Não Categorizada';
        expMap[catName] = (expMap[catName] || 0) + Number(e.amount);
      });
      const breakdown = Object.entries(expMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      // Projeção de Caixa (Próximos 30 dias a partir de hoje)
      const projection = [];
      let runningBalance = currentTotalCash;
      const today = new Date();
      
      // Buscar faturas pendentes GLOBAIS (não só do mês selecionado) para projeção real
      const { data: allPendingIn } = await supabase.from('charges').select('amount, due_date').eq('user_id', user.id).neq('status', 'pago').gte('due_date', today.toISOString());
      const { data: allPendingOut } = await supabase.from('expenses').select('amount, due_date').eq('user_id', user.id).neq('status', 'pago').gte('due_date', today.toISOString());

      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dStr = d.toISOString().split('T')[0];

        const dayIn = allPendingIn?.filter(c => c.due_date === dStr).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        const dayOut = allPendingOut?.filter(e => e.due_date === dStr).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        
        runningBalance = runningBalance + dayIn - dayOut;
        projection.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), balance: runningBalance });
      }

      setFinance({
        entradasTotais: inPaid,
        saidasTotais: outPaid,
        lucroLiquido: inPaid - outPaid,
        aReceber: inPending,
        aPagar: outPending,
        mrr,
        chartData: [
          { name: 'Realizado (Pago)', Entradas: inPaid, Saídas: outPaid },
          { name: 'Projetado (Pendente)', Entradas: inPending, Saídas: outPending }
        ],
        expenseBreakdown: breakdown,
        cashProjection: projection
      });
      setWallet({ available: (wooviRes?.balance?.available || 0) / 100, total: currentTotalCash, loading: false });

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchFinancialData(); }, [user, selectedMonth]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-12 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div><h2 className="text-3xl font-bold tracking-tight text-apple-black">Painel Financeiro</h2><p className="text-apple-muted mt-1 font-medium">Análise de performance, gastos e projeção de liquidez.</p></div>
          <div className="flex items-center gap-3">
             <div className="flex items-center bg-apple-white border border-apple-border rounded-xl px-4 py-2 shadow-sm">
                <CalendarDays size={16} className="text-apple-muted mr-3" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-bold text-orange-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">{monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
             </div>
             <button onClick={fetchFinancialData} className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:bg-apple-light transition-all shadow-sm"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ArrowUpRight size={100} /></div>
            <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowUpRight size={14} className="text-emerald-500" /> Recebido (Mês)</h3>
            <p className="text-4xl font-black text-apple-black">{currencyFormatter.format(finance.entradasTotais)}</p>
          </div>
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ArrowDownRight size={100} /></div>
            <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowDownRight size={14} className="text-red-500" /> Pago (Mês)</h3>
            <p className="text-4xl font-black text-apple-black">{currencyFormatter.format(finance.saidasTotais)}</p>
          </div>
          <div className={cn("p-8 rounded-[2rem] shadow-sm relative overflow-hidden border transition-all", finance.lucroLiquido >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
            <div className="absolute top-0 right-0 p-6 opacity-5"><Scale size={100} /></div>
            <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4 flex items-center gap-2"><Scale size={14} className={finance.lucroLiquido >= 0 ? "text-emerald-500" : "text-red-500"} /> Saldo Operacional</h3>
            <p className={cn("text-4xl font-black", finance.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600")}>{currencyFormatter.format(finance.lucroLiquido)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* GRÁFICO 1: COMPARATIVO */}
           <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-10 flex items-center gap-2"><TrendingUp size={16} className="text-orange-500" /> Realizado vs. Projetado</h3>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finance.chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} fontWeight="bold" />
                       <YAxis hide />
                       <Tooltip cursor={{fill: '#fafafa'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                       <Legend wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                       <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                       <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* GRÁFICO 2: PROJEÇÃO DE CAIXA */}
           <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-10 flex items-center gap-2"><Activity size={16} className="text-blue-500" /> Projeção de Saldo (Próximos 30 dias)</h3>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={finance.cashProjection}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} interval={5} />
                       <YAxis hide />
                       <Tooltip contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} formatter={(v: number) => [currencyFormatter.format(v), 'Saldo Previsto']} />
                       <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* GRÁFICO 3: DISTRIBUIÇÃO DE DESPESAS */}
           <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-10 flex items-center gap-2"><PieChartIcon size={16} className="text-red-500" /> Composição de Gastos (Plano de Contas)</h3>
              <div className="h-[350px] flex items-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={finance.expenseBreakdown} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                          {finance.expenseBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="w-48 space-y-3">
                    {finance.expenseBreakdown.slice(0, 5).map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase text-apple-black truncate">{item.name}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* INDICADORES DE MRR E CARTEIRA */}
           <div className="space-y-6">
              <div className="bg-apple-black p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={100} className="text-orange-500" /></div>
                 <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Liquidez Imediata (Consolidado)</p>
                 <h4 className="text-4xl font-black text-white">{currencyFormatter.format(wallet.total)}</h4>
                 <div className="mt-8 pt-8 border-t border-white/10 flex gap-10">
                    <div><p className="text-[9px] text-zinc-500 font-black uppercase">Na Woovi</p><p className="text-lg font-bold text-emerald-400">{currencyFormatter.format(wallet.available)}</p></div>
                    <div className="h-10 w-px bg-white/10" />
                    <div><p className="text-[9px] text-zinc-500 font-black uppercase">Receita Recorrente</p><p className="text-lg font-bold text-orange-400">{currencyFormatter.format(finance.mrr)}</p></div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="bg-apple-white border border-apple-border p-6 rounded-3xl shadow-sm"><p className="text-[9px] font-black text-apple-muted uppercase mb-2">A Receber no Período</p><p className="text-2xl font-black text-apple-black">{currencyFormatter.format(finance.aReceber)}</p></div>
                 <div className="bg-apple-white border border-apple-border p-6 rounded-3xl shadow-sm"><p className="text-[9px] font-black text-apple-muted uppercase mb-2">A Pagar no Período</p><p className="text-2xl font-black text-red-500">{currencyFormatter.format(finance.aPagar)}</p></div>
              </div>
           </div>
        </div>

        <div className="pt-12 border-t border-apple-border">
           <FinancialAgenda />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;