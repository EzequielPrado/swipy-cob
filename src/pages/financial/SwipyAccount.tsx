"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';
import WithdrawModal from '@/components/dashboard/WithdrawModal';
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Loader2, 
  RefreshCcw, 
  ArrowRightLeft, 
  QrCode,
  ListOrdered
} from 'lucide-react';
import { cn } from "@/lib/utils";

const SwipyAccount = () => {
  const { user, effectiveUserId } = useAuth();
  
  const [balance, setBalance] = useState<{available: number, blocked: number, total: number} | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Busca saldo da API
      const balanceResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const balanceData = await balanceResponse.json();
      
      if (!balanceData.error && balanceData.balance) {
        setBalance({
          available: balanceData.balance.available / 100,
          blocked: balanceData.balance.blocked / 100,
          total: balanceData.balance.total / 100
        });
      } else {
        showError(balanceData.message || "Erro ao carregar saldo.");
      }

      // 2. Busca transações da API (Woovi Charges e Cashouts)
      const trxResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=transactions`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const trxData = await trxResponse.json();
      
      let apiTransactions: any[] = [];
      if (!trxData.error) {
        if (trxData.transactions) apiTransactions = trxData.transactions;
        else if (Array.isArray(trxData)) apiTransactions = trxData;
      }

      // 3. Busca transações locais (Transferências Internas)
      let localTransactions: any[] = [];
      const targetUserId = effectiveUserId || user?.id;
      
      if (targetUserId) {
        const { data: swipyAcc } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('type', 'swipy')
          .maybeSingle();

        if (swipyAcc) {
          const { data: bTrx } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('bank_account_id', swipyAcc.id);
            
          if (bTrx) {
            localTransactions = bTrx.map(t => ({
              id: t.id,
              correlationID: t.description,
              value: t.type === 'credit' ? t.amount * 100 : -(t.amount * 100),
              time: t.date.includes('T') ? t.date : `${t.date}T12:00:00Z`, 
              type: t.type === 'credit' ? 'IN' : 'OUT',
              isLocal: true
            }));
          }
        }
      }

      // 4. Mescla e ordena por data decrescente
      const allTransactions = [...apiTransactions, ...localTransactions].sort((a, b) => {
        const timeA = new Date(a.time || a.createdAt).getTime();
        const timeB = new Date(b.time || b.createdAt).getTime();
        return timeB - timeA;
      });

      setTransactions(allTransactions);
      
    } catch (err: any) {
      showError("Falha de conexão com a carteira digital.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-apple-black">
              <Wallet className="text-emerald-500" size={32} />
              Swipy Conta
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Sua conta digital integrada para recebimentos e pagamentos.</p>
          </div>
          <button 
            onClick={fetchWalletData}
            disabled={loading}
            className="w-full md:w-auto bg-apple-white border border-apple-border text-apple-dark font-semibold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-apple-light shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            Sincronizar Extrato
          </button>
        </div>

        {/* CARDS DE SALDO GIGANTES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-apple-white border border-apple-border rounded-[2rem] p-8 lg:p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <Wallet size={150} />
            </div>
            
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Saldo Disponível para Saque
            </p>
            <div className="flex items-baseline gap-2 mb-8">
              {loading && balance === null ? (
                <Loader2 className="animate-spin text-emerald-500" size={40} />
              ) : (
                <>
                  <p className="text-5xl lg:text-6xl font-black text-apple-black tracking-tighter">
                    {balance ? currencyFormatter.format(balance.available) : "R$ 0,00"}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-4 relative z-10">
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2"
              >
                <ArrowRightLeft size={18} /> Transferir (Pix)
              </button>
              <button className="bg-apple-offWhite text-apple-black font-bold px-6 py-3 rounded-xl hover:bg-apple-light transition-all border border-apple-border flex items-center gap-2">
                <QrCode size={18} /> Receber
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm">
              <p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest mb-1">Saldo Total (Geral)</p>
              <p className="text-3xl font-bold text-apple-black">
                {loading && balance === null ? "..." : balance ? currencyFormatter.format(balance.total) : "R$ 0,00"}
              </p>
            </div>
            <div className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm border-l-red-400">
              <div className="flex items-center gap-2 text-apple-muted mb-1">
                <ArrowDownToLine size={14} />
                <p className="text-[10px] uppercase font-bold tracking-widest">Saldo Bloqueado</p>
              </div>
              <p className="text-2xl font-bold text-apple-dark">
                {loading && balance === null ? "..." : balance ? currencyFormatter.format(balance.blocked) : "R$ 0,00"}
              </p>
              <p className="text-[10px] text-apple-muted mt-2 leading-relaxed">Valores de transações recentes aguardando liquidação da CIP/Bacen.</p>
            </div>
          </div>
        </div>

        {/* EXTRATO NA TELA */}
        <div className="bg-apple-white border border-apple-border rounded-3xl overflow-hidden shadow-sm mt-4">
          <div className="p-6 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
            <h3 className="text-lg font-bold text-apple-black flex items-center gap-2">
              <ListOrdered className="text-emerald-500" size={20} />
              Extrato Consolidado (30 dias)
            </h3>
          </div>
          
          <div className="p-2 overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-emerald-500 gap-4">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm font-medium">Sincronizando transações...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-20 text-apple-muted">
                <ListOrdered size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma movimentação encontrada nos últimos 30 dias.</p>
              </div>
            ) : (
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-6 py-4">Data / Hora</th>
                    <th className="px-6 py-4">Detalhes da Transação</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {transactions.map((t, idx) => {
                    const txDate = t.time || t.createdAt;
                    const isIncoming = t.value > 0 || t.type === 'CHARGE' || t.type === 'IN';
                    const valueInReais = Math.abs((t.value || t.amount || 0) / 100);
                    
                    return (
                      <tr key={t.id || idx} className="hover:bg-apple-light transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-apple-dark">
                            {new Date(txDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-apple-muted font-mono mt-0.5">
                            {new Date(txDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                              isIncoming ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                            )}>
                              {isIncoming ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-apple-black">
                                {t.isLocal 
                                  ? (isIncoming ? 'Entrada / Transferência' : 'Saída / Transferência') 
                                  : (isIncoming ? 'Cobrança Recebida' : 'Saída / Saque / Tarifa')}
                              </p>
                              <p className="text-[10px] text-apple-muted mt-0.5 truncate max-w-xs" title={t.correlationID || t.id}>
                                {t.correlationID || t.id || 'Transação Padrão'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={cn("text-base font-bold", isIncoming ? "text-emerald-600" : "text-apple-black")}>
                            {isIncoming ? '+' : '-'} {currencyFormatter.format(valueInReais)}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <WithdrawModal 
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={fetchWalletData} 
        availableBalance={balance?.available || 0} 
      />
    </AppLayout>
  );
};

export default SwipyAccount;