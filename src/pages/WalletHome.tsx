"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import WithdrawModal from '@/components/dashboard/WithdrawModal';
import PixKeysModal from '@/components/wallet/PixKeysModal';
import html2canvas from 'html2canvas';
import FinancialAgenda from '@/components/financial/FinancialAgenda';
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowRightLeft,
  QrCode,
  Key,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  Eye,
  EyeOff,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Copy,
  Share2,
  Download,
  X,
  CheckCircle2,
  Filter,
  Send,
  Landmark,
  ArrowDownToLine,
  PlusCircle
} from 'lucide-react';

type Transaction = {
  id: string;
  type: 'IN' | 'OUT';
  value: number;
  valueBRL: number;
  description: string;
  customer: string;
  customerTaxId: string;
  date: string;
  endToEndId: string;
  correlationID: string;
  source: string;
};

type ActiveTab = 'home' | 'extrato' | 'calendario';

const WalletHome = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [balance, setBalance] = useState<{ available: number; blocked: number; total: number } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isPixKeysModalOpen, setIsPixKeysModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data: prof } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', user?.id)
        .single();

      setUserProfile(prof);
      const provider = prof?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'petta-wallet' : 'woovi-wallet';

      const balanceResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}?action=balance`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const balanceData = await balanceResponse.json();

      if (!balanceData.error && balanceData.balance) {
        setBalance({
          available: balanceData.balance.available / 100,
          blocked: balanceData.balance.blocked / 100,
          total: balanceData.balance.total / 100
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data: prof } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', user?.id)
        .single();

      const provider = prof?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'petta-wallet' : 'woovi-wallet';

      const txResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}?action=transactions&limit=100`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const txData = await txResponse.json();

      if (txData.transactions) {
        setTransactions(txData.transactions);
      }
    } catch (err: any) {
      console.error("Erro ao carregar transações:", err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchTransactions();
    }
  }, [user]);

  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatFullTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const downloadReceipt = useCallback(async () => {
    if (!receiptRef.current || !selectedTx) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });
      const link = document.createElement('a');
      link.download = `comprovante-swipy-${selectedTx.id.substring(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showSuccess('Comprovante baixado!');
    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
      window.print();
    }
  }, [selectedTx]);

  const copyTransactionId = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('ID copiado!');
  }, []);

  const shareReceipt = useCallback(async () => {
    if (!selectedTx) return;
    const isIn = selectedTx.type === 'IN';
    const text = `Comprovante Swipy\n${isIn ? 'Recebimento' : 'Transferência'} PIX\nValor: ${currencyFormatter.format(selectedTx.valueBRL)}\n${selectedTx.customer ? `${isIn ? 'De' : 'Para'}: ${selectedTx.customer}\n` : ''}Data: ${formatFullDate(selectedTx.date)} às ${formatFullTime(selectedTx.date)}\nID: ${selectedTx.endToEndId || selectedTx.correlationID || selectedTx.id}`;

    if (navigator.share) {
      try { await navigator.share({ title: 'Comprovante Swipy', text }); } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      showSuccess('Comprovante copiado!');
    }
  }, [selectedTx, currencyFormatter]);

  const providerName = userProfile?.preferred_provider === 'petta' ? 'Petta' : 'Woovi';

  // Quick action buttons
  const quickActions = [
    {
      icon: Send,
      label: 'Transferir',
      sublabel: 'Enviar Pix',
      color: 'from-emerald-500 to-emerald-600',
      shadowColor: 'shadow-emerald-500/25',
      onClick: () => setIsWithdrawModalOpen(true)
    },
    {
      icon: QrCode,
      label: 'Cobrar',
      sublabel: 'Gerar QR Code',
      color: 'from-orange-500 to-orange-600',
      shadowColor: 'shadow-orange-500/25',
      onClick: () => navigate('/financeiro/cobrancas')
    },
    {
      icon: Key,
      label: 'Chaves Pix',
      sublabel: 'Gerenciar',
      color: 'from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/25',
      onClick: () => setIsPixKeysModalOpen(true)
    },
    {
      icon: Receipt,
      label: 'Extrato',
      sublabel: 'Ver tudo',
      color: 'from-violet-500 to-violet-600',
      shadowColor: 'shadow-violet-500/25',
      onClick: () => setActiveTab('extrato')
    }
  ];

  const tabs = [
    { key: 'home' as ActiveTab, label: 'Início', icon: Wallet },
    { key: 'extrato' as ActiveTab, label: 'Extrato', icon: Receipt },
    { key: 'calendario' as ActiveTab, label: 'Calendário', icon: Calendar },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-0 pb-12 -mt-2">

        {/* HERO BALANCE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] p-6 lg:p-8 mb-6"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          }}
        >
          {/* Decorative */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-orange-500/15 to-transparent blur-2xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-500/10 to-transparent blur-3xl" />

          <div className="relative z-10">
            {/* Top row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Wallet size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">Conta {providerName}</p>
                  <p className="text-white text-sm font-bold">{profile?.company || 'Minha Empresa'}</p>
                </div>
              </div>
              <button
                onClick={() => { fetchWalletData(); fetchTransactions(); }}
                disabled={loading || txLoading}
                className="p-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all border border-white/10"
              >
                {(loading || txLoading)
                  ? <Loader2 size={16} className="animate-spin text-white" />
                  : <RefreshCcw size={16} className="text-white/70" />
                }
              </button>
            </div>

            {/* Balance */}
            <div className="mb-1">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">Saldo disponível</p>
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {loading && balance === null ? (
                    <Loader2 className="animate-spin text-orange-400" size={36} />
                  ) : (
                    <motion.p
                      key={balanceVisible ? 'visible' : 'hidden'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-4xl lg:text-5xl font-black text-white tracking-tighter"
                    >
                      {balanceVisible
                        ? (balance ? currencyFormatter.format(balance.available) : 'R$ 0,00')
                        : 'R$ •••••'
                      }
                    </motion.p>
                  )}
                </AnimatePresence>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                >
                  {balanceVisible ? <Eye size={16} className="text-white/60" /> : <EyeOff size={16} className="text-white/60" />}
                </button>
              </div>
            </div>

            {/* Sub balances */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Total geral</p>
                <p className="text-white/70 text-sm font-bold">
                  {balanceVisible ? (balance ? currencyFormatter.format(balance.total) : 'R$ 0,00') : '•••'}
                </p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Bloqueado</p>
                <p className="text-white/70 text-sm font-bold">
                  {balanceVisible ? (balance ? currencyFormatter.format(balance.blocked) : 'R$ 0,00') : '•••'}
                </p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Provedor</p>
                <p className="text-orange-400 text-sm font-bold">{providerName}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-4 gap-3 mb-6"
        >
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={cn(
                "w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-all group-hover:scale-105 group-active:scale-95",
                action.color,
                action.shadowColor
              )}>
                <action.icon size={22} className="text-white" />
              </div>
              <div className="text-center">
                <span className="text-[11px] lg:text-xs font-bold text-apple-dark block leading-tight">{action.label}</span>
                <span className="text-[9px] text-apple-muted hidden lg:block">{action.sublabel}</span>
              </div>
            </button>
          ))}
        </motion.div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1 bg-apple-offWhite border border-apple-border rounded-2xl p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
                activeTab === tab.key
                  ? "bg-apple-white text-apple-black shadow-sm border border-apple-border"
                  : "text-apple-muted hover:text-apple-dark"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* RECENT TRANSACTIONS */}
              <div className="bg-apple-white border border-apple-border rounded-[2rem] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-apple-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                      <Receipt size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-apple-black">Últimas Transações</h3>
                      <p className="text-[10px] text-apple-muted">Movimentações recentes via {providerName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('extrato')}
                    className="text-[10px] font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest flex items-center gap-1"
                  >
                    Ver tudo <ChevronRight size={12} />
                  </button>
                </div>

                <div className="divide-y divide-apple-border">
                  {txLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 lg:px-6 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-apple-offWhite" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-apple-offWhite rounded w-2/3" />
                          <div className="h-2.5 bg-apple-offWhite/60 rounded w-1/3" />
                        </div>
                        <div className="h-4 bg-apple-offWhite rounded w-20" />
                      </div>
                    ))
                  ) : recentTransactions.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 bg-apple-offWhite rounded-2xl flex items-center justify-center border border-apple-border">
                        <Receipt size={24} className="text-apple-muted" />
                      </div>
                      <p className="text-apple-dark font-bold text-sm">Nenhuma movimentação</p>
                      <p className="text-apple-muted text-xs mt-1 max-w-xs mx-auto">
                        Suas transações PIX aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    recentTransactions.map((tx, idx) => {
                      const isIn = tx.type === 'IN';
                      return (
                        <div
                          key={tx.id + idx}
                          onClick={() => setSelectedTx(tx)}
                          className="flex items-center gap-3 p-3.5 lg:px-6 hover:bg-apple-offWhite/50 transition-colors cursor-pointer group"
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                            isIn ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                          )}>
                            {isIn
                              ? <ArrowDownLeft size={16} className="text-emerald-500" />
                              : <ArrowUpRight size={16} className="text-red-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-apple-black truncate">{tx.customer || tx.description}</p>
                            <p className="text-[11px] text-apple-muted truncate mt-0.5">
                              {formatDate(tx.date)} • {formatTime(tx.date)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-sm font-bold tabular-nums", isIn ? 'text-emerald-600' : 'text-red-500')}>
                              {isIn ? '+' : '-'} {currencyFormatter.format(tx.valueBRL)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-apple-white border border-apple-border p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest">Entradas (30d)</p>
                  </div>
                  <p className="text-xl font-black text-emerald-600">
                    {balanceVisible
                      ? currencyFormatter.format(transactions.filter(t => t.type === 'IN').reduce((s, t) => s + t.valueBRL, 0))
                      : '•••'
                    }
                  </p>
                </div>
                <div className="bg-apple-white border border-apple-border p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={14} className="text-red-500" />
                    <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest">Saídas (30d)</p>
                  </div>
                  <p className="text-xl font-black text-red-500">
                    {balanceVisible
                      ? currencyFormatter.format(transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.valueBRL, 0))
                      : '•••'
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'extrato' && (
            <motion.div
              key="extrato"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FullStatement
                transactions={transactions}
                txLoading={txLoading}
                currencyFormatter={currencyFormatter}
                onSelectTx={setSelectedTx}
                formatDate={formatDate}
                formatTime={formatTime}
                providerName={providerName}
              />
            </motion.div>
          )}

          {activeTab === 'calendario' && (
            <motion.div
              key="calendario"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FinancialAgenda />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RECEIPT MODAL */}
      {selectedTx && (() => {
        const isIn = selectedTx.type === 'IN';
        const txId = selectedTx.endToEndId || selectedTx.correlationID || selectedTx.id;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedTx(null); }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTx(null)} />
            <div className="relative w-full max-w-[340px] my-auto">
              <button
                onClick={() => setSelectedTx(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div ref={receiptRef} style={{ maxWidth: '340px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '20px 20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #FF8C42 0%, #E07534 100%)' }}>
                  <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: '-40px', left: '-24px', width: '112px', height: '112px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                      <img src="/logo-swipy.png" alt="Swipy" crossOrigin="anonymous" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }} />
                      <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Swipy</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' as const, marginBottom: '4px' }}>
                      {isIn ? 'Recebimento PIX' : 'Envio PIX'}
                    </p>
                    <p style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {currencyFormatter.format(selectedTx.valueBRL)}
                    </p>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: '50px' }}>
                        <CheckCircle2 size={10} color="#ffffff" />
                        <span style={{ color: '#ffffff', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Confirmado</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 16px' }}>
                  {selectedTx.customer && (
                    <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '2px' }}>
                        {isIn ? 'De' : 'Para'}
                      </p>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#111' }}>{selectedTx.customer}</p>
                      {selectedTx.customerTaxId && (
                        <p style={{ fontSize: '9px', color: '#999', fontFamily: 'monospace', marginTop: '2px' }}>
                          {selectedTx.customerTaxId.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}
                        </p>
                      )}
                    </div>
                  )}
                  <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
                    <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '2px' }}>Descrição</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>{selectedTx.description}</p>
                  </div>
                  <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3', display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '2px' }}>Data</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>{formatFullDate(selectedTx.date)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '2px' }}>Hora</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>{formatFullTime(selectedTx.date)}</p>
                    </div>
                  </div>
                  {txId && (
                    <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '2px' }}>ID da Transação</p>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#888', wordBreak: 'break-all' as const, lineHeight: '1.3', flex: 1 }}>{txId}</p>
                        <button onClick={(e) => { e.stopPropagation(); copyTransactionId(txId); }} className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0">
                          <Copy size={11} color="#999" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '10px 0' }}>
                    <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '2px' }}>Tipo</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>
                      {selectedTx.source === 'charge' ? 'Cobrança PIX' : selectedTx.source === 'cashout' ? 'Saque PIX' : 'Transferência PIX'}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '10px 16px', background: '#FFF8F3', borderTop: '1px solid #FFE8D6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <img src="/logo-swipy.png" alt="Swipy" crossOrigin="anonymous" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '3px' }} />
                    <span style={{ fontSize: '8px', color: '#E07534', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Comprovante Swipy</span>
                  </div>
                  <p style={{ fontSize: '7px', color: '#D4A574', textAlign: 'center', marginTop: '2px' }}>
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={shareReceipt} className="flex-1 bg-white/10 backdrop-blur-sm text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/20 text-sm">
                  <Share2 size={14} /> Compartilhar
                </button>
                <button onClick={downloadReceipt} className="flex-1 bg-white text-gray-900 font-bold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-lg text-sm">
                  <Download size={14} /> Baixar PNG
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={() => { fetchWalletData(); fetchTransactions(); }}
        availableBalance={balance?.available || 0}
      />

      <PixKeysModal
        isOpen={isPixKeysModalOpen}
        onClose={() => setIsPixKeysModalOpen(false)}
      />
    </AppLayout>
  );
};

// ==========================================
// FULL STATEMENT SUB-COMPONENT
// ==========================================
type PeriodFilter = 'today' | '7d' | '30d' | 'all';
type TypeFilter = 'all' | 'IN' | 'OUT';

const FullStatement = ({
  transactions, txLoading, currencyFormatter, onSelectTx, formatDate, formatTime, providerName
}: {
  transactions: Transaction[]; txLoading: boolean; currencyFormatter: Intl.NumberFormat;
  onSelectTx: (tx: Transaction) => void; formatDate: (d: string) => string; formatTime: (d: string) => string;
  providerName: string;
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (periodFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (periodFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (periodFilter === '7d') cutoff.setDate(now.getDate() - 7);
      else if (periodFilter === '30d') cutoff.setDate(now.getDate() - 30);
      filtered = filtered.filter(tx => new Date(tx.date) >= cutoff);
    }
    if (typeFilter !== 'all') filtered = filtered.filter(tx => tx.type === typeFilter);
    return filtered;
  }, [transactions, periodFilter, typeFilter]);

  const filteredSummary = useMemo(() => {
    const totalIn = filteredTransactions.filter(t => t.type === 'IN').reduce((s, t) => s + t.valueBRL, 0);
    const totalOut = filteredTransactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.valueBRL, 0);
    return { totalIn, totalOut, net: totalIn - totalOut, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const periodOptions: { key: PeriodFilter; label: string }[] = [
    { key: 'today', label: 'Hoje' }, { key: '7d', label: '7 dias' }, { key: '30d', label: '30 dias' }, { key: 'all', label: 'Tudo' },
  ];

  const typeOptions: { key: TypeFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Todos', icon: <Filter size={14} /> },
    { key: 'IN', label: 'Entradas', icon: <ArrowDownLeft size={14} /> },
    { key: 'OUT', label: 'Saídas', icon: <ArrowUpRight size={14} /> },
  ];

  return (
    <div className="bg-apple-white border border-apple-border rounded-[2rem] shadow-sm overflow-hidden">
      <div className="p-5 lg:p-6 border-b border-apple-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-100">
              <Receipt size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-apple-black">Extrato Completo</h3>
              <p className="text-[11px] text-apple-muted">Conta {providerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-apple-muted" />
            <div className="flex bg-apple-offWhite rounded-xl border border-apple-border p-1 gap-1">
              {periodOptions.map(opt => (
                <button key={opt.key} onClick={() => setPeriodFilter(opt.key)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    periodFilter === opt.key ? 'bg-apple-white text-apple-black shadow-sm border border-apple-border' : 'text-apple-muted hover:text-apple-dark'
                  )}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {typeOptions.map(opt => (
            <button key={opt.key} onClick={() => setTypeFilter(opt.key)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                typeFilter === opt.key ? 'bg-apple-black text-white border-apple-black' : 'bg-apple-white text-apple-muted border-apple-border hover:text-apple-dark'
              )}>{opt.icon}{opt.label}</button>
          ))}
        </div>
      </div>

      {!txLoading && filteredSummary.count > 0 && (
        <div className="grid grid-cols-3 border-b border-apple-border">
          <div className="p-4 text-center border-r border-apple-border">
            <div className="flex items-center justify-center gap-1.5 mb-1"><TrendingUp size={12} className="text-emerald-500" /><p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest">Entradas</p></div>
            <p className="text-lg font-bold text-emerald-600">{currencyFormatter.format(filteredSummary.totalIn)}</p>
          </div>
          <div className="p-4 text-center border-r border-apple-border">
            <div className="flex items-center justify-center gap-1.5 mb-1"><TrendingDown size={12} className="text-red-500" /><p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest">Saídas</p></div>
            <p className="text-lg font-bold text-red-500">{currencyFormatter.format(filteredSummary.totalOut)}</p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest">Saldo</p></div>
            <p className={cn("text-lg font-bold", filteredSummary.net >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {filteredSummary.net >= 0 ? '+' : ''}{currencyFormatter.format(filteredSummary.net)}
            </p>
          </div>
        </div>
      )}

      <div className="divide-y divide-apple-border">
        {txLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 lg:px-6 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-apple-offWhite" /><div className="flex-1 space-y-2"><div className="h-3.5 bg-apple-offWhite rounded w-2/3" /><div className="h-2.5 bg-apple-offWhite/60 rounded w-1/3" /></div><div className="h-4 bg-apple-offWhite rounded w-20" />
            </div>
          ))
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-apple-offWhite rounded-2xl flex items-center justify-center border border-apple-border"><Receipt size={28} className="text-apple-muted" /></div>
            <p className="text-apple-dark font-bold text-sm">Nenhuma movimentação</p>
            <p className="text-apple-muted text-xs mt-1">Não encontramos transações neste período.</p>
          </div>
        ) : (
          filteredTransactions.map((tx, idx) => {
            const isIn = tx.type === 'IN';
            return (
              <div key={tx.id + idx} onClick={() => onSelectTx(tx)} className="flex items-center gap-3 p-3.5 lg:px-6 hover:bg-apple-offWhite/50 transition-colors cursor-pointer">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isIn ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100')}>
                  {isIn ? <ArrowDownLeft size={16} className="text-emerald-500" /> : <ArrowUpRight size={16} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-apple-black truncate">{tx.customer || tx.description}</p>
                  <p className="text-xs text-apple-muted truncate mt-0.5">{tx.customer ? tx.description : (tx.source === 'charge' ? 'Cobrança PIX' : tx.source === 'cashout' ? 'Saque' : 'PIX')}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[11px] text-apple-muted font-medium">{formatDate(tx.date)}</p>
                  <p className="text-[10px] text-apple-muted/60">{formatTime(tx.date)}</p>
                </div>
                <div className="text-right shrink-0 min-w-[90px]">
                  <p className={cn("text-sm font-bold tabular-nums", isIn ? 'text-emerald-600' : 'text-red-500')}>
                    {isIn ? '+' : '-'} {currencyFormatter.format(tx.valueBRL)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!txLoading && filteredTransactions.length > 0 && (
        <div className="p-3 border-t border-apple-border bg-apple-offWhite/50">
          <p className="text-[10px] text-apple-muted text-center font-bold uppercase tracking-widest">
            {filteredSummary.count} movimentação{filteredSummary.count !== 1 ? 'ões' : ''} encontrada{filteredSummary.count !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletHome;
