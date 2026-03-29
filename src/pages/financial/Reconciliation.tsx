"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  ArrowRightLeft, Search, Loader2, CheckCircle2, 
  ArrowUpCircle, ArrowDownCircle, Link as LinkIcon,
  XCircle, Filter, Calendar, Info, Building2, User
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const Reconciliation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [activeTrx, setActiveTrx] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);

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

  const openMatchFinder = async (trx: any) => {
    setActiveTrx(trx);
    setCandidates([]);
    setIsMatchOpen(true);
    setMatching(true);

    try {
      if (trx.type === 'credit') {
        const { data } = await supabase
          .from('charges')
          .select('id, amount, due_date, description, customers(name)')
          .eq('user_id', user?.id)
          .eq('status', 'pendente')
          .eq('amount', trx.amount);
        
        // Correção TS: Cast any para iterador 'c' para permitir acesso a joins que TS interpreta como arrays
        if (data) setCandidates(data.map((c: any) => ({ ...c, type: 'charge', name: c.customers?.name || 'Venda Avulsa' })));
      } else {
        const { data } = await supabase
          .from('expenses')
          .select('id, amount, due_date, description')
          .eq('user_id', user?.id)
          .eq('status', 'pendente')
          .eq('amount', trx.amount);
        if (data) setCandidates(data.map(e => ({ ...e, type: 'expense', name: e.description })));
      }
    } catch (err) { console.error(err); } finally { setMatching(false); }
  };

  const confirmMatch = async (candidate: any) => {
    setMatching(true);
    try {
      const table = candidate.type === 'charge' ? 'charges' : 'expenses';
      const { error: sysError } = await supabase
        .from(table)
        .update({ status: 'pago', bank_account_id: activeTrx.bank_account_id })
        .eq('id', candidate.id);
      
      if (sysError) throw sysError;

      await supabase.from('bank_transactions').update({ status: 'reconciled' }).eq('id', activeTrx.id);

      showSuccess("Lançamento conciliado!");
      setIsMatchOpen(false);
      fetchData();
    } catch (err: any) { showError(err.message); } finally { setMatching(false); }
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
              <span className="text-[10px] font-black uppercase text-apple-muted">Conta:</span>
              <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="bg-apple-white border-apple-border rounded-xl px-4 py-2 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none shadow-sm">
                <option value="all">Todas</option>
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
                  <th className="px-8 py-5 text-right">Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-apple-muted italic">Tudo conciliado! Importe um novo extrato em Contas Bancárias.</td></tr>
                ) : (
                  transactions
                    .filter(t => selectedAccountId === 'all' || t.bank_account_id === selectedAccountId)
                    .map((trx) => (
                    <tr key={trx.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-apple-black">{new Date(trx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                         <p className="text-[9px] text-apple-muted font-bold uppercase tracking-tighter">{trx.bank_accounts?.name}</p>
                      </td>
                      <td className="px-8 py-5"><p className="text-sm font-bold text-apple-dark italic">"{trx.description}"</p></td>
                      <td className="px-8 py-5">
                         {trx.type === 'credit' ? (
                           <span className="text-base font-black text-emerald-600">+{currency.format(trx.amount)}</span>
                         ) : (
                           <span className="text-base font-black text-red-600">-{currency.format(trx.amount)}</span>
                         )}
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => openMatchFinder(trx)} className="bg-apple-black hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ml-auto active:scale-95">
                           <LinkIcon size={12} /> BUSCAR MATCH
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isMatchOpen} onOpenChange={setIsMatchOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black">Lançamentos Sugeridos</DialogTitle>
            {activeTrx && <p className="text-xs text-apple-muted font-bold mt-2">Buscando correspondência para <span className="text-orange-500">{currency.format(activeTrx.amount)}</span></p>}
          </DialogHeader>
          
          <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
             {matching ? (
               <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" /></div>
             ) : candidates.length === 0 ? (
               <div className="text-center py-12">
                  <Info className="mx-auto text-apple-muted mb-4 opacity-20" size={40} />
                  <p className="text-sm font-bold text-apple-muted italic">Nenhum lançamento com valor EXATO encontrado no sistema.</p>
                  <button className="mt-6 text-[10px] font-black text-orange-600 uppercase tracking-widest border border-orange-200 px-4 py-2 rounded-xl">Criar Lançamento Rápido</button>
               </div>
             ) : (
               <div className="space-y-3">
                  {candidates.map((cand) => (
                    <div key={cand.id} className="p-5 bg-apple-offWhite border border-apple-border rounded-2xl flex items-center justify-between group hover:border-orange-500 transition-all">
                       <div>
                          <p className="text-sm font-black text-apple-black">{cand.name}</p>
                          <p className="text-[10px] text-apple-muted font-bold uppercase mt-1">Previsão: {new Date(cand.due_date).toLocaleDateString('pt-BR')}</p>
                       </div>
                       <button onClick={() => confirmMatch(cand)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase px-4 py-2.5 rounded-xl shadow-lg active:scale-95">VINCULAR</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
          <div className="p-6 bg-apple-offWhite border-t border-apple-border text-center text-[9px] text-apple-muted font-bold uppercase tracking-widest">
            A conciliação garante o controle real do seu fluxo de caixa.
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Reconciliation;