"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import WithdrawModal from '@/components/dashboard/WithdrawModal';
import html2canvas from 'html2canvas';
import { 
  Wallet, 
  ArrowDownToLine, 
  Loader2, 
  RefreshCcw, 
  ArrowRightLeft, 
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  Download,
  CheckCircle2,
  Copy,
  Share2
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

type Summary = {
  totalIn: number;
  totalOut: number;
  net: number;
  count: number;
};

type PeriodFilter = 'today' | '7d' | '30d' | 'all';
type TypeFilter = 'all' | 'IN' | 'OUT';

const SwipyAccount = () => {
  const { user } = useAuth();
  
  const [balance, setBalance] = useState<{available: number, blocked: number, total: number} | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const txResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=transactions&limit=100`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const txData = await txResponse.json();
      
      if (txData.transactions) {
        setTransactions(txData.transactions);
        setSummary(txData.summary || null);
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

  // Filtrar transações por período e tipo
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filtro por período
    if (periodFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      
      if (periodFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (periodFilter === '7d') {
        cutoff.setDate(now.getDate() - 7);
      } else if (periodFilter === '30d') {
        cutoff.setDate(now.getDate() - 30);
      }
      
      filtered = filtered.filter(tx => new Date(tx.date) >= cutoff);
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    return filtered;
  }, [transactions, periodFilter, typeFilter]);

  // Recalcular totais filtrados
  const filteredSummary = useMemo(() => {
    const totalIn = filteredTransactions.filter(t => t.type === 'IN').reduce((s, t) => s + t.valueBRL, 0);
    const totalOut = filteredTransactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.valueBRL, 0);
    return { totalIn, totalOut, net: totalIn - totalOut, count: filteredTransactions.length };
  }, [filteredTransactions]);

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
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
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
      try {
        await navigator.share({ title: 'Comprovante Swipy', text });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      showSuccess('Comprovante copiado!');
    }
  }, [selectedTx, currencyFormatter]);

  const periodOptions: { key: PeriodFilter; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'all', label: 'Tudo' },
  ];

  const typeOptions: { key: TypeFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Todos', icon: <Filter size={14} /> },
    { key: 'IN', label: 'Entradas', icon: <ArrowDownLeft size={14} /> },
    { key: 'OUT', label: 'Saídas', icon: <ArrowUpRight size={14} /> },
  ];

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
            onClick={() => { fetchWalletData(); fetchTransactions(); }}
            disabled={loading || txLoading}
            className="w-full md:w-auto bg-apple-white border border-apple-border text-apple-dark font-semibold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-apple-light shadow-sm disabled:opacity-50"
          >
            {(loading || txLoading) ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            Sincronizar
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

        {/* SEÇÃO DE EXTRATO */}
        <div className="bg-apple-white border border-apple-border rounded-[2rem] shadow-sm overflow-hidden">
          
          {/* Header do Extrato */}
          <div className="p-6 lg:p-8 border-b border-apple-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-100">
                  <Receipt size={20} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-apple-black">Extrato</h3>
                  <p className="text-xs text-apple-muted font-medium">Movimentações da sua conta Woovi</p>
                </div>
              </div>

              {/* Filtros de Período */}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-apple-muted" />
                <div className="flex bg-apple-offWhite rounded-xl border border-apple-border p-1 gap-1">
                  {periodOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setPeriodFilter(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        periodFilter === opt.key 
                          ? 'bg-apple-white text-apple-black shadow-sm border border-apple-border' 
                          : 'text-apple-muted hover:text-apple-dark'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtros de Tipo */}
            <div className="flex items-center gap-2 mt-4">
              {typeOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTypeFilter(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    typeFilter === opt.key 
                      ? 'bg-apple-black text-white border-apple-black' 
                      : 'bg-apple-white text-apple-muted border-apple-border hover:text-apple-dark'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barra de Totais */}
          {!txLoading && filteredSummary.count > 0 && (
            <div className="grid grid-cols-3 border-b border-apple-border">
              <div className="p-4 lg:p-6 text-center border-r border-apple-border">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest">Entradas</p>
                </div>
                <p className="text-lg lg:text-xl font-bold text-emerald-600">{currencyFormatter.format(filteredSummary.totalIn)}</p>
              </div>
              <div className="p-4 lg:p-6 text-center border-r border-apple-border">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingDown size={12} className="text-red-500" />
                  <p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest">Saídas</p>
                </div>
                <p className="text-lg lg:text-xl font-bold text-red-500">{currencyFormatter.format(filteredSummary.totalOut)}</p>
              </div>
              <div className="p-4 lg:p-6 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest">Saldo Período</p>
                </div>
                <p className={`text-lg lg:text-xl font-bold ${filteredSummary.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {filteredSummary.net >= 0 ? '+' : ''}{currencyFormatter.format(filteredSummary.net)}
                </p>
              </div>
            </div>
          )}

          {/* Lista de Transações */}
          <div className="divide-y divide-apple-border">
            {txLoading ? (
              // Skeleton Loading
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 lg:px-8 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-apple-offWhite"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-apple-offWhite rounded w-2/3"></div>
                    <div className="h-2.5 bg-apple-offWhite/60 rounded w-1/3"></div>
                  </div>
                  <div className="h-4 bg-apple-offWhite rounded w-20"></div>
                </div>
              ))
            ) : filteredTransactions.length === 0 ? (
              // Empty State
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-apple-offWhite rounded-2xl flex items-center justify-center border border-apple-border">
                  <Receipt size={28} className="text-apple-muted" />
                </div>
                <p className="text-apple-dark font-bold text-sm">Nenhuma movimentação</p>
                <p className="text-apple-muted text-xs mt-1 max-w-xs mx-auto">
                  {periodFilter !== 'all' 
                    ? 'Não encontramos transações neste período. Tente ampliar o filtro.'
                    : 'Suas transações PIX aparecerão aqui quando começarem a chegar.'}
                </p>
              </div>
            ) : (
              // Lista de Transações
              filteredTransactions.map((tx, idx) => {
                const isIn = tx.type === 'IN';
                return (
                  <div 
                    key={tx.id + idx}
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center gap-4 p-4 lg:px-8 hover:bg-apple-offWhite/50 transition-colors group cursor-pointer"
                  >
                    {/* Ícone */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIn 
                        ? 'bg-emerald-50 border border-emerald-100' 
                        : 'bg-red-50 border border-red-100'
                    }`}>
                      {isIn 
                        ? <ArrowDownLeft size={18} className="text-emerald-500" /> 
                        : <ArrowUpRight size={18} className="text-red-500" />
                      }
                    </div>

                    {/* Detalhes */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-apple-black truncate">
                        {tx.customer || tx.description}
                      </p>
                      <p className="text-xs text-apple-muted truncate mt-0.5">
                        {tx.customer ? tx.description : (tx.source === 'charge' ? 'Cobrança PIX' : tx.source === 'cashout' ? 'Saque' : 'PIX')}
                        {tx.endToEndId && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 font-mono text-[10px]">
                            {tx.endToEndId.substring(0, 20)}…
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Data */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[11px] text-apple-muted font-medium">{formatDate(tx.date)}</p>
                      <p className="text-[10px] text-apple-muted/60">{formatTime(tx.date)}</p>
                    </div>

                    {/* Valor */}
                    <div className="text-right shrink-0 min-w-[100px]">
                      <p className={`text-sm font-bold tabular-nums ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isIn ? '+' : '-'} {currencyFormatter.format(tx.valueBRL)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer do Extrato */}
          {!txLoading && filteredTransactions.length > 0 && (
            <div className="p-4 lg:px-8 border-t border-apple-border bg-apple-offWhite/50">
              <p className="text-[10px] text-apple-muted text-center font-bold uppercase tracking-widest">
                {filteredSummary.count} movimentação{filteredSummary.count !== 1 ? 'ões' : ''} encontrada{filteredSummary.count !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL COMPROVANTE */}
      {selectedTx && (() => {
        const isIn = selectedTx.type === 'IN';
        const txId = selectedTx.endToEndId || selectedTx.correlationID || selectedTx.id;
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedTx(null); }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTx(null)} />
            
            {/* Receipt Card */}
            <div className="relative w-full max-w-[340px] my-auto">
              {/* Close button */}
              <button 
                onClick={() => setSelectedTx(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div ref={receiptRef} style={{ maxWidth: '340px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                {/* Header Swipy Orange */}
                <div style={{ padding: '20px 20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #FF8C42 0%, #E07534 100%)' }}>
                  <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: '-40px', left: '-24px', width: '112px', height: '112px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                  
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                      <img src="/logo-swipy.png" alt="Swipy" crossOrigin="anonymous" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }} />
                      <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Swipy</span>
                    </div>
                    
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {isIn ? 'Recebimento PIX' : 'Envio PIX'}
                    </p>
                    <p style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {currencyFormatter.format(selectedTx.valueBRL)}
                    </p>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: '50px' }}>
                        <CheckCircle2 size={10} color="#ffffff" />
                        <span style={{ color: '#ffffff', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Confirmado</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhes */}
                <div style={{ padding: '8px 16px' }}>
                  {selectedTx.customer && (
                    <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
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
                    <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Descrição</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>{selectedTx.description}</p>
                  </div>

                  <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3', display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Data</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>{formatFullDate(selectedTx.date)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Hora</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>{formatFullTime(selectedTx.date)}</p>
                    </div>
                  </div>

                  {txId && (
                    <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
                      <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>ID da Transação</p>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#888', wordBreak: 'break-all', lineHeight: '1.3', flex: 1 }}>{txId}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyTransactionId(txId); }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                        >
                          <Copy size={11} color="#999" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '10px 0' }}>
                    <p style={{ fontSize: '8px', color: '#FF8C42', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Tipo</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#222' }}>
                      {selectedTx.source === 'charge' ? 'Cobrança PIX' : selectedTx.source === 'cashout' ? 'Saque PIX' : 'Transferência PIX'}
                    </p>
                  </div>
                </div>

                {/* Footer Swipy */}
                <div style={{ padding: '10px 16px', background: '#FFF8F3', borderTop: '1px solid #FFE8D6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <img src="/logo-swipy.png" alt="Swipy" crossOrigin="anonymous" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '3px' }} />
                    <span style={{ fontSize: '8px', color: '#E07534', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Comprovante Swipy</span>
                  </div>
                  <p style={{ fontSize: '7px', color: '#D4A574', textAlign: 'center', marginTop: '2px' }}>
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={shareReceipt}
                  className="flex-1 bg-white/10 backdrop-blur-sm text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/20 text-sm"
                >
                  <Share2 size={14} />
                  Compartilhar
                </button>
                <button
                  onClick={downloadReceipt}
                  className="flex-1 bg-white text-gray-900 font-bold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  <Download size={14} />
                  Baixar PNG
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
    </AppLayout>
  );
};

export default SwipyAccount;