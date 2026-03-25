"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { LayoutDashboard, TrendingUp, Package, Users, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const OverviewDashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-8 pb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visão Geral do ERP</h2>
          <p className="text-zinc-400 mt-1">Bem-vindo ao centro de controle da sua empresa.</p>
        </div>

        {/* Indicadores vazios aguardando os próximos módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingCart size={16} className="text-blue-500" /> Vendas Hoje
            </h3>
            <p className="text-3xl font-bold text-zinc-100">--</p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Aguardando módulo de Vendas</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Recebimentos
            </h3>
            <p className="text-3xl font-bold text-zinc-100">--</p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Aguardando conciliação bancária</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package size={16} className="text-orange-500" /> Alertas de Estoque
            </h3>
            <p className="text-3xl font-bold text-zinc-100">--</p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Aguardando módulo de Estoque</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={16} className="text-purple-500" /> Aniversariantes
            </h3>
            <p className="text-3xl font-bold text-zinc-100">--</p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Aguardando módulo de RH</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-[2.5rem] p-10 text-center mt-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <LayoutDashboard size={120} />
          </div>
          
          <h3 className="text-2xl font-bold text-orange-500 mb-3 relative z-10">A Evolução do Swipy Cob</h3>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-8 text-lg leading-relaxed relative z-10">
            O seu painel de cobranças agora está localizado em <strong>Financeiro > Dashboard Financeiro</strong> no menu lateral.
            Nossa plataforma está se transformando em um ERP completo para centralizar toda a sua operação.
          </p>
          
          <Link 
            to="/financeiro/dashboard" 
            className="inline-flex bg-orange-500 text-zinc-950 font-bold px-8 py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/10 items-center gap-2 relative z-10 active:scale-95"
          >
            Acessar Meu Financeiro <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default OverviewDashboard;