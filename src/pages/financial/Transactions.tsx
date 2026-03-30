"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  ArrowRightLeft, Search, Loader2, CheckCircle2, 
  ArrowUpCircle, ArrowDownCircle, Filter, Calendar, 
  Clock, Landmark, Info, ArrowUpRight, ArrowDownRight,
  Wallet, Receipt, DollarSign, AlertCircle, Activity, Layers,
  CalendarDays
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Transactions = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unifiedData, setUnifiedData] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setDate(1); 
    d.setMonth(d.getMonth() - 11); 
    for(let i=0; i<24; i++) { 
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() + 1);
    }
    return options.reverse();
  }, []);

  const fetchData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    try {
      const [accRes, trxRes, chargesRes, expensesRes] = await Promise.all([
        supabase.from('bank_accounts').select('id, name').eq('user_id', effectiveUserId),
        supabase.from('bank_transactions')
          .select('*, bank_accounts(name)')
          .eq('user_id', effectiveUserId)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase.from('charges')
          .select('*, customers(name)')
          .eq('user_id', effectiveUserId)
          .gte('due_date', startDate)
          .lte('due_date', `${endDate}T23:59:59`),
        supabase.from('expenses')
          .select('*')
          .eq('user_id', effectiveUserId)
          .gte('due_date', startDate)
          .lte('due_date', endDate)
      ]);

      if (accRes.data) setAccounts(accRes.data);

      const normalizedTrx = (trxRes.data || []).map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type === 'credit' ? 'IN' : 'OUT',
        status: t.status === 'reconciled' ? 'Conciliado' : 'Pendente (Banco)',
        source: 'bank',
        account: t.bank_accounts?.name,
        rawStatus: t.status
      }));

      const normalizedCharges = (chargesRes.data || []).map(c => ({
        id: c.id,
        date: c.due_date,
        description: `Recebível: ${c.customers?.name || 'Venda'}`,
        amount: c.amount,
        type: 'IN',
        status: c.status === 'pago' ? 'Recebido' : 'A Receber',
        source: 'receivable',
        rawStatus: c.status
      }));

      const normalizedExpenses = (expensesRes.data || []).map(e => ({
        id: e.id,
        date: e.due_date,
        description: `Pagamento: ${e.description}`,
        amount: e.amount,
        type: 'OUT',
        status: e.status === 'pago' ? 'Pago' : 'A Pagar',
        source: 'payable',
        rawStatus: e.status
      }));

      const combined = [...normalizedTrx, ...normalizedCharges, ...normalizedExpenses].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setUnifiedData(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [effectiveUserId, selectedMonth]);

  const filteredData = useMemo(() => {
    return unifiedData.filter(item => {
      const matchSearch = item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSource = sourceFilter === 'all' || item.source === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [unifiedData, searchTerm, sourceFilter]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Função utilitária para formatar data de forma segura no extrato
  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '---';
    // Se a string contiver 'T' (timestamp), pegamos apenas a parte da data YYYY-MM-DD
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    // Criamos a data usando meio-dia para evitar problemas de fuso horário saltando o dia
    return new Date(cleanDate + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <Activity className="text-orange-500" size={32} /> Fluxo Unificado
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Visão consolidada por período de extratos, contas a pagar e a receber.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-apple-white border border-apple-border rounded-xl px-4 py-2 shadow-sm">
              <CalendarDays size={16} className="text-apple-muted mr-3" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-bold text-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="focus:bg-apple-light">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Link 
              to="/financeiro/conciliacao"
              className="bg-apple-black text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Conciliar Bancos
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Total Entradas (Período)</p>
              <p className="text-2xl font-black text-emerald-600">{currency.format(unifiedData.filter(i => i.type === 'IN').reduce((acc, curr) => acc + Number(curr.amount), 0))}</p>
           </div>
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Total Saídas (Período)</p>
              <p className="text-2xl font-black text-red-600">{currency.format(unifiedData.filter(i => i.type === 'OUT').reduce((acc, curr) => acc + Number(curr.amount), 0))}</p>
           </div>
           <div className="bg-orange-500 p-6 rounded-[2rem] shadow-xl text-white">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Saldo Projetado no Mês</p>
              <p className="text-2xl font-black">{currency.format(unifiedData.filter(i => i.type === 'IN').reduce((acc, curr) => acc + Number(curr.amount), 0) - unifiedData.filter(i => i.type === 'OUT').reduce((acc, curr) => acc + Number(curr.amount), 0))}</p>
           </div>
        </div>

        <div className="bg-apple-white border border-apple-border p-2 rounded-[2rem] shadow-sm flex flex-col lg:flex-row gap-2">
           <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por descrição ou cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-0 outline-none font-medium text-apple-black"
              />
           </div>
           
           <div className="flex gap-2 p-1 overflow-x-auto">
              {[
                { id: 'all', label: 'Tudo', icon: Layers },
                { id: 'bank', label: 'Bancos', icon: Landmark },
                { id: 'receivable', label: 'A Receber', icon: ArrowUpCircle },
                { id: 'payable', label: 'A Pagar', icon: ArrowDownCircle }
              ].map(source => (
                <button
                  key={source.id}
                  onClick={() => setSourceFilter(source.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    sourceFilter === source.id ? "bg-orange-50 border-orange-600 text-white shadow-md" : "bg-apple-offWhite border-apple-border text-apple-muted hover:bg-apple-light"
                  )}
                >
                  <source.icon size={14} /> {source.label}
                </button>
              ))}
           </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-6">Data / Origem</th>
                  <th className="px-8 py-6">Descrição do Lançamento</th>
                  <th className="px-8 py-6">Valor</th>
                  <th className="px-8 py-6 text-center">Status Interno</th>
                  <th className="px-8 py-6 text-right">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={40} /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-apple-muted italic font-bold">Nenhum lançamento localizado para este mês.</td></tr>
                ) : (
                  filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-apple-black">{formatDateSafe(item.date)}</p>
                         <p className="text-[9px] text-apple-muted font-bold uppercase mt-0.5">{item.account || 'Previsão de Caixa'}</p>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-sm font-bold text-apple-dark">{item.description}</p>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            {item.type === 'IN' ? (
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><ArrowUpRight size={14} /></div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100"><ArrowDownRight size={14} /></div>
                            )}
                            <span className={cn("text-base font-black", item.type === 'IN' ? "text-emerald-600" : "text-red-600")}>
                              {item.type === 'IN' ? '+' : '-'}{currency.format(item.amount)}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <span className={cn(
                           "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                           item.rawStatus === 'reconciled' || item.rawStatus === 'pago' 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : item.rawStatus === 'atrasado' ? "bg-red-50 text-red-600 border-red-100" : "bg-orange-50 text-orange-600 border-orange-100"
                         )}>
                           {item.status}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex flex-col items-end">
                            {item.source === 'bank' ? (
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                 <Landmark size={10} /> Extrato Real
                               </div>
                            ) : (
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                 <Receipt size={10} /> Sistema ERP
                               </div>
                            )}
                         </div>
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

export default Transactions;