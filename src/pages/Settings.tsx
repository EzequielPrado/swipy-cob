"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Landmark, Percent, ShieldCheck, Wallet } from 'lucide-react';

const Settings = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações Financeiras</h2>
          <p className="text-zinc-400 mt-1">Controle taxas, métodos de pagamento e políticas operacionais.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Wallet size={20} className="text-orange-500" /> Meios de Recebimento
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500 font-bold">PIX</div>
                  <div>
                    <p className="text-sm font-semibold">PIX Instantâneo</p>
                    <p className="text-xs text-zinc-500">Taxa: R$ 0,99 fixo</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded">ATIVO</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 font-bold">BOL</div>
                  <div>
                    <p className="text-sm font-semibold">Boleto Bancário</p>
                    <p className="text-xs text-zinc-500">Taxa: R$ 2,50 por liq.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded">ATIVO</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl opacity-50 grayscale">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 font-bold">CC</div>
                  <div>
                    <p className="text-sm font-semibold">Cartão de Crédito</p>
                    <p className="text-xs text-zinc-500">Taxa: 3.5% + R$ 0,50</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-zinc-400 border border-zinc-800 px-3 py-1 rounded hover:bg-zinc-800 transition-all">CONFIGURAR</button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8">
            <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Percent size={20} className="text-orange-500" /> Multas e Juros Padrão
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Multa por Atraso (%)</label>
                <div className="relative">
                  <input type="text" defaultValue="2.0" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Juros Mensal (%)</label>
                <div className="relative">
                  <input type="text" defaultValue="1.0" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-6">
              <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <ShieldCheck size={20} className="text-orange-500" /> Política de Bloqueio
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Bloqueio Automático</p>
                  <p className="text-xs text-zinc-500">Suspender acesso após X dias de atraso</p>
                </div>
                <select className="bg-zinc-800 border-none text-xs rounded-lg px-4 py-2 outline-none text-zinc-300">
                  <option>7 dias</option>
                  <option>10 dias</option>
                  <option>15 dias</option>
                  <option>Nunca</option>
                </select>
              </div>
            </div>

            <button className="w-full bg-orange-500 text-zinc-950 font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10">
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;