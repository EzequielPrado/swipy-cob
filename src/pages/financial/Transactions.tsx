"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  ArrowRightLeft, Search, Loader2, CheckCircle2, 
  ArrowUpCircle, ArrowDownCircle, Filter, Calendar, 
  Clock, Landmark, Building2, Info, ArrowUpRight, ArrowDownRight,
  ChevronRight,
  ListFilter
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';

const Transactions = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  const fetchData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const [accRes, trxRes] = await Promise.all([
        supabase.from('bank_accounts').select('id, name').eq('user_id', effectiveUserId),
        supabase.from('bank_transactions')
          .select('*, bank_accounts(name, type)')
          .eq('user_id', effectiveUserId)
          .order('date', { ascending: false })
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (trxRes.data) setTransactions(trxRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [effectiveUserId]);

  const filteredTrx = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchAccount = accountFilter === 'all' || t.bank_account_id === accountFilter;
      return matchSearch && matchStatus && matchAccount;
    });
  }, [transactions, searchTerm, statusFilter, accountFilter]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <ArrowRightLeft className="text-orange-500" size={32} /> Transações
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Fluxo consolidado de entradas e saídas de todas as suas contas.</p>
          </div>
          <div className="flex gap-2">
             <Link 
              to="/financeiro/conciliacao"
              className="bg-apple-black text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-all flex items-center gap-2"
             >
                <CheckCircle2 size={16} /> Realizar Conciliação
             </Link>
          </div>
        </div>

        {/* BARRA DE FILTROS ESTILO APPLE */}
        <div className="bg-apple-white border border-apple-border p-2 rounded-[2rem] shadow-sm flex flex-col lg:flex-row gap-2">
           <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por descrição ou valor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-0 outline-none font-medium text-apple-black"
              />
           </div>
           
           <div className="flex flex-wrap gap-2 p-1">
              <select 
                value={accountFilter} 
                onChange={e => setAccountFilter(e.target.value)}
                className="bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">Todas as Contas</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>

              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-apple-offWhite border border-apple-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="reconciled">Conciliadas</option>
              </select>
           </div>
        </div>

        {/* TABELA DE MOVIMENTAÇÃO */}
        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-6">Data / Origem</th>
                  <th className="px-8 py-6">Descrição no Banco</th>
                  <th className="px-8 py-6">Valor</th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={40} /></td></tr>
                ) : filteredTrx.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-apple-muted italic font-bold">Nenhum lançamento encontrado para os filtros aplicados.</td></tr>
                ) : (
                  filteredTrx.map((trx) => (
                    <tr key={trx.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-apple-black">{new Date(trx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                         <div className="flex items-center gap-1.5 mt-1">
                            <Landmark size={10} className="text-orange-500" />
                            <span className="text-[9px] text-apple-muted font-black uppercase tracking-tighter">{trx.bank_accounts?.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-sm font-bold text-apple-dark italic">"{trx.description}"</p>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            {trx.type === 'credit' ? (
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100"><ArrowUpRight size={14} /></div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shadow-inner border border-red-100"><ArrowDownRight size={14} /></div>
                            )}
                            <span className={cn("text-base font-black", trx.type === 'credit' ? "text-emerald-600" : "text-red-600")}>
                              {trx.type === 'credit' ? '+' : '-'}{currency.format(trx.amount)}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <span className={cn(
                           "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                           trx.status === 'reconciled' 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-orange-50 text-orange-600 border-orange-100"
                         )}>
                           {trx.status === 'reconciled' ? 'Conciliado' : 'Pendente'}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         {trx.status === 'pending' ? (
                           <Link 
                            to="/financeiro/conciliacao"
                            className="text-[9px] font-black text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-500/20 px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
                           >
                             CONCILIAR
                           </Link>
                         ) : (
                           <div className="text-emerald-500 bg-emerald-50 w-8 h-8 rounded-full flex items-center justify-center ml-auto border border-emerald-100 shadow-inner">
                              <CheckCircle2 size={16} />
                           </div>
                         )}
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