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
  Loader2, 
  RefreshCcw, 
  ArrowRightLeft, 
  QrCode
} from 'lucide-react';

const SwipyAccount = () => {
  const { user } = useAuth();
  
  const [balance, setBalance] = useState<{available: number, blocked: number, total: number} | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Busca saldo da API
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
            Sincronizar Saldos
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