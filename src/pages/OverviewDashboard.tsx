"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { LayoutDashboard, TrendingUp, Package, Users, ShoppingCart, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';

const OverviewDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: 0,
    skus: 0,
    stockValue: 0,
    lowStockItems: [] as any[]
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // 1. Buscar MRR (Recorrência de Assinaturas Ativas)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'active');
          
        const totalMrr = subs?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
        
        // 2. Buscar Estoque (Quantidade de SKUs e Valor Total de Custo)
        const { data: products } = await supabase
          .from('products')
          .select('id, name, stock_quantity, cost_price, sku')
          .eq('user_id', user.id)
          .order('stock_quantity', { ascending: true });
          
        let totalSkus = 0;
        let totalStockValue = 0;
        let lowStock: any[] = [];
        
        if (products) {
          totalSkus = products.length;
          totalStockValue = products.reduce((acc, curr) => {
            const qty = curr.stock_quantity || 0;
            const cost = Number(curr.cost_price || 0);
            return acc + (qty * cost);
          }, 0);
          
          // Filtra produtos com estoque crítico (<= 5)
          lowStock = products.filter(p => (p.stock_quantity || 0) <= 5).slice(0, 5);
        }
        
        setStats({
          mrr: totalMrr,
          skus: totalSkus,
          stockValue: totalStockValue,
          lowStockItems: lowStock
        });
      } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });

  return (
    <AppLayout>
      <div className="space-y-8 pb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visão Geral da Empresa</h2>
          <p className="text-zinc-400 mt-1">Bem-vindo ao centro de controle da sua empresa.</p>
        </div>

        {/* 4 Blocos Principais (Nova Ordem solicitada) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1: VENDAS HOJE */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between opacity-70">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-500" /> Vendas Hoje
              </h3>
              <p className="text-3xl font-bold text-zinc-100">--</p>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Aguardando módulo de Vendas</p>
          </div>

          {/* 2: RESUMO DE ESTOQUE */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package size={16} className="text-orange-500" /> Resumo de Estoque
              </h3>
              {loading ? (
                <Loader2 className="animate-spin text-zinc-500" size={24} />
              ) : (
                <>
                  <p className="text-3xl font-bold text-zinc-100">
                    {stats.skus} <span className="text-sm font-normal text-zinc-500">SKUs</span>
                  </p>
                  <p className="text-sm font-bold text-orange-400 mt-1">
                    {currencyFormatter.format(stats.stockValue)} <span className="text-[10px] text-zinc-500 font-normal ml-1">em custo total</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 3: ALERTA DE ESTOQUE (Contagem) */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Alerta de Estoque
              </h3>
              {loading ? (
                <Loader2 className="animate-spin text-zinc-500" size={24} />
              ) : (
                <p className="text-3xl font-bold text-red-400">
                  {stats.lowStockItems.length} <span className="text-sm font-normal text-zinc-500">itens críticos</span>
                </p>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Produtos com 5 ou menos unidades</p>
          </div>

          {/* 4: ANIVERSARIANTES */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between opacity-70">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={16} className="text-purple-500" /> Aniversariantes
              </h3>
              <p className="text-3xl font-bold text-zinc-100">--</p>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Aguardando módulo de RH</p>
          </div>

        </div>

        {/* Linha Inferior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          
          {/* Coluna Esquerda: Lista Detalhada de Alertas */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Detalhes: Estoque Crítico
              </h3>
              
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-zinc-600" size={20} /></div>
              ) : stats.lowStockItems.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
                  <p className="text-xs text-zinc-500 italic">Nenhum produto em nível crítico.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.lowStockItems.map(item => (
                    <div key={item.id} className="bg-zinc-950 border border-red-500/20 p-3 rounded-xl flex justify-between items-center">
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-bold text-zinc-200 truncate">{item.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.sku || 'Sem SKU'}</p>
                      </div>
                      <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-bold shrink-0">
                        {item.stock_quantity} un
                      </div>
                    </div>
                  ))}
                  <Link to="/estoque/produtos" className="block text-center text-[10px] text-red-400 font-bold uppercase hover:underline mt-4">
                    Gerenciar Estoque Completo
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: MRR e CTA */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Bloco de MRR Realocado */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> Receita Recorrente (MRR)
                </h3>
                {loading ? (
                  <Loader2 className="animate-spin text-emerald-500 mt-2" size={28} />
                ) : (
                  <p className="text-4xl font-black text-zinc-100 mt-1">{currencyFormatter.format(stats.mrr)}</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">Soma de todas as assinaturas ativas.</p>
              </div>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shrink-0 shadow-inner">
                <TrendingUp size={32} />
              </div>
            </div>

            {/* Aviso de Transição */}
            <div className="flex-1 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                <LayoutDashboard size={120} />
              </div>
              
              <h3 className="text-2xl font-bold text-orange-500 mb-3 relative z-10">O ERP está crescendo!</h3>
              <p className="text-zinc-400 max-w-lg mb-8 text-sm leading-relaxed relative z-10">
                A sua antiga visão geral financeira (Cobranças pendentes, Projeções e Carteira Woovi) agora vive em <strong>Financeiro {'>'} Dashboard Financeiro</strong>. Em breve daremos vida aos blocos de Vendas e RH acima.
              </p>
              
              <div className="relative z-10">
                <Link 
                  to="/financeiro/dashboard" 
                  className="inline-flex bg-orange-500 text-zinc-950 font-bold px-6 py-3.5 rounded-xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/10 items-center gap-2 active:scale-95"
                >
                  Ver Dashboard Financeiro <ArrowRight size={18} />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default OverviewDashboard;