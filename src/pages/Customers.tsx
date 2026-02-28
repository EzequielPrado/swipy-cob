"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Search, Filter, MoreHorizontal, UserX, Mail, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const customers = [
  { id: '1', name: 'Ricardo Almeira', doc: '123.456.789-00', plan: 'Plano Pro', status: 'em dia', nextDue: '15/10/2023' },
  { id: '2', name: 'Software House LTDA', doc: '44.123.456/0001-99', plan: 'Enterprise', status: 'atrasado', nextDue: '01/10/2023' },
  { id: '3', name: 'Beatriz Costa', doc: '987.654.321-11', plan: 'Starter', status: 'em dia', nextDue: '20/10/2023' },
  { id: '4', name: 'Logistics Express', doc: '55.999.888/0001-11', plan: 'Enterprise', status: 'cancelado', nextDue: '-' },
  { id: '5', name: 'Carlos Eduardo', doc: '111.222.333-44', plan: 'Plano Pro', status: 'em dia', nextDue: '12/10/2023' },
];

const Customers = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
            <p className="text-zinc-400 mt-1">Gerencie sua base de assinantes e acompanhe a saúde financeira individual.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg transition-all border border-zinc-700">Exportar CSV</button>
            <button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all">Novo Cliente</button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF ou CNPJ..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 flex items-center gap-2 hover:bg-zinc-800 transition-all">
              <Filter size={16} /> Status: Todos
            </button>
            <button className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 flex items-center gap-2 hover:bg-zinc-800 transition-all">
              Plano: Todos
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-6 py-5">Cliente</th>
                <th className="px-6 py-5">CPF / CNPJ</th>
                <th className="px-6 py-5">Plano</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Próximo Vencimento</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                        {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-sm font-semibold text-zinc-100">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{customer.doc}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-normal">{customer.plan}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      customer.status === 'em dia' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      customer.status === 'atrasado' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                      "bg-zinc-800 text-zinc-500 border border-zinc-700"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        customer.status === 'em dia' ? "bg-emerald-400" :
                        customer.status === 'atrasado' ? "bg-red-400" : "bg-zinc-500"
                      )} />
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{customer.nextDue}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Enviar Cobrança" className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"><Mail size={16}/></button>
                      <button title="Ver Histórico" className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"><FileText size={16}/></button>
                      <button title="Bloquear Acesso" className="p-2 text-zinc-500 hover:text-red-400 transition-colors"><UserX size={16}/></button>
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

export default Customers;