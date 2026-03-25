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
  const { user } = useAuth();
  
  const [balance, setBalance] = useState<{available: number, blocked: number, total: number} | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle do Modal de Transferência (Saque PIX)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Busca os Saldos
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

      // 2. Busca o Extrato (Últimos 30 dias)
      const trxResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=transactions`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const trxData = await trxResponse.json();
      
      if (!trxData.error) {
        if (trxData.transactions) setTransactions(trxData.transactions);
        else if (Array.isArray(trxData)) setTransactions(trxData);
      }
      
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
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-500" size={32} />
              Swipy Conta
            </h2>
            <p className="text-zinc-400 mt-1">Sua conta digital integrada para recebimentos e pagamentos.</p>
          </div>
          <button 
            onClick={fetchWalletData}
            disabled={loading}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Atualizar
          </button>
        </div>

        {/* CARDS DE SALDO GIGANTES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-[2rem] p-8 lg:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <Wallet size={150} />
            </div>
            
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Saldo Disponível para Saque
            </p>
            <div className="flex items-baseline gap-2 mb-8">
              {loading ? (
                <Loader2 className="animate-spin text-emerald-500" size={40} />
              ) : (
                <>
                  <p className="text-5xl lg:text-6xl font-black text-zinc-100 tracking-tighter">
                    {balance ? currencyFormatter.format(balance.available) : "R$ 0,00"}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-4 relative z-10">
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="bg-emerald-500 text-zinc-950 font-bold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <ArrowRightLeft size={18} /> Transferir (Pix)
              </button>
              <button className="bg-zinc-800 text-zinc-100 font-bold px-6 py-3 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700 flex items-center gap-2">
                <QrCode size={18} /> Receber
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Saldo Total (Geral)</p>
              <p className="text-3xl font-bold text-zinc-300">
                {loading ? "..." : balance ? currencyFormatter.format(balance.total) : "R$ 0,00"}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl border-l-red-500/20">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <ArrowDownToLine size={14} />
                <p className="text-[10px] uppercase font-bold tracking-widest">Saldo Bloqueado</p>
              </div>
              <p className="text-2xl font-bold text-zinc-400">
                {loading ? "..." : balance ? currencyFormatter.format(balance.blocked) : "R$ 0,00"}
              </p>
              <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">Valores de transações recentes aguardando liquidação da CIP/Bacen.</p>
            </div>
          </div>
        </div>

        {/* EXTRATO NA TELA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl mt-4">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <ListOrdered className="text-emerald-500" size={20} />
              Extrato da Conta (30 dias)
            </h3>
          </div>
          
          <div className="p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-emerald-500 gap-4">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm font-medium">Sincronizando transações...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <ListOrdered size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma movimentação encontrada nos últimos 30 dias.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Data / Hora</th>
                    <th className="px-6 py-4">Detalhes da Transação</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {transactions.map((t, idx) => {
                    const isIncoming = t.value > 0 || t.type === 'CHARGE' || t.type === 'IN';
                    const valueInReais = Math.abs((t.value || t.amount || 0) / 100);
                    
                    return (
                      <tr key={t.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-300">
                            {new Date(t.createdAt || t.time).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {new Date(t.createdAt || t.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                              isIncoming ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                              {isIncoming ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-200">
                                {isIncoming ? 'Cobrança Recebida' : 'Saída / Saque / Tarifa'}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-xs" title={t.id || t.correlationID}>
                                Ref: {t.id || t.correlationID || 'Transação Padrão'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={cn("text-base font-bold", isIncoming ? "text-emerald-400" : "text-zinc-100")}>
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

      {/* Modal de Saque / Transferência PIX */}
      <WithdrawModal 
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={fetchWalletData} // Atualiza a página após o saque
        availableBalance={balance?.available || 0} // Protege contra saque maior que o disponível
      />

    </AppLayout>
  );
};

export default SwipyAccount;