"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  ArrowRightLeft, Search, Loader2, CheckCircle2, 
  ArrowUpCircle, ArrowDownCircle, Link as LinkIcon,
  XCircle, Filter, Calendar
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const Reconciliation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [accRes, trxRes] = await Promise.all([
        supabase.from('bank_accounts').select('id, name').eq('user_id', user.id),
        supabase.from('bank_transactions')
          .select('*, bank_accounts(name)')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('date', { ascending: false })
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (trxRes.data) setTransactions(trxRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAutoMatch = (trx: any) => {
    // Aqui no futuro implementaremos a lógica de buscar despesas/cobranças 
    // com o mesmo valor e data aproximada.
    showSuccess("Buscando sugestões de conciliação...");
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <ArrowRightLeft className="text-orange-500" size={32} /> Conciliação Bancária
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Vincule os lançamentos do seu banco com o sistema Swipy.</p>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-apple-muted">Filtrar Conta:</span>
              <select 
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-apple-white border border-apple-border rounded-xl px-4 py-2 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none"
              >
                <option value="all">Todas as Contas</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
               {transactions.length} LANÇAMENTOS PENDENTES
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Data / Banco</th>
                  <th className="px-8 py-5">Descrição no Extrato</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5 text-right">Ação de Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-apple-muted italic">Tudo conciliado por aqui! Importe um novo extrato para começar.</td></tr>
                ) : (
                  transactions
                    .filter(t => selectedAccountId === 'all' || t.bank_account_id === selectedAccountId)
                    .map((trx) => (
                    <tr key={trx.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-apple-black">{new Date(trx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                         <p className="text-[9px] text-apple-muted font-bold uppercase tracking-tighter">{trx.bank_accounts?.name}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-apple-dark italic">"{trx.description}"</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           {trx.type === 'credit' ? (
                             <span className="text-base font-black text-emerald-600">+{currency.format(trx.amount)}</span>
                           ) : (
                             <span className="text-base font-black text-red-600">-{currency.format(trx.amount)}</span>
                           )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleAutoMatch(trx)}
                              className="bg-apple-offWhite hover:bg-orange-500 hover:text-white border border-apple-border px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <LinkIcon size={12} /> Vincular Lançamento
                            </button>
                            <button className="p-2 text-apple-muted hover:text-red-500 transition-all"><XCircle size={18} /></button>
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

export default Reconciliation;