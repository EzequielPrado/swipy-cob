"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Plus, Search, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const plans = [
  { id: '1', name: 'Plano Pro PJ', type: 'PJ', price: 'R$ 299,00', period: 'Mensal', status: 'ativo', clients: 450 },
  { id: '2', name: 'Starter Individual', type: 'PF', price: 'R$ 89,90', period: 'Mensal', status: 'ativo', clients: 120 },
  { id: '3', name: 'Enterprise Custom', type: 'PJ', price: 'Sob consulta', period: 'Anual', status: 'inativo', clients: 12 },
  { id: '4', name: 'Plano Basic', type: 'PF', price: 'R$ 49,90', period: 'Mensal', status: 'ativo', clients: 890 },
];

const Plans = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Planos & Produtos</h2>
            <p className="text-zinc-400 mt-1">Configure as ofertas e modelos de recorrência do seu negócio.</p>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <Plus size={18} />
            Criar novo plano
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar plano por nome..." 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <select className="bg-zinc-800 border-none text-sm rounded-lg px-4 py-2 outline-none text-zinc-300">
              <option>Todos os tipos</option>
              <option>PF</option>
              <option>PJ</option>
            </select>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nome do Plano</th>
                <th className="px-6 py-4 font-semibold">Público</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Ciclo</th>
                <th className="px-6 py-4 font-semibold">Ativos</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-zinc-100">{plan.name}</p>
                    <p className="text-xs text-zinc-500">ID: {plan.id}00X</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono">{plan.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-emerald-400">{plan.price}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{plan.period}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{plan.clients}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        plan.status === 'ativo' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
                      )} />
                      <span className="text-xs text-zinc-300 capitalize">{plan.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors"><Edit3 size={16}/></button>
                      <button className="p-2 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Plans;