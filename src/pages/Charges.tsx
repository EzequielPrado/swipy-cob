"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Copy, Download, Share2, History, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const charges = [
  { id: 'INV-001', client: 'Tech Solutions LTDA', value: 'R$ 1.250,00', due: '12/10/2023', status: 'pago', method: 'PIX' },
  { id: 'INV-002', client: 'Ana Paula Silva', value: 'R$ 450,00', due: '01/10/2023', status: 'atrasado', method: 'Boleto' },
  { id: 'INV-003', client: 'Global Connect', value: 'R$ 8.900,00', due: '15/10/2023', status: 'pendente', method: 'Cartão' },
  { id: 'INV-004', client: 'Studio Design', value: 'R$ 320,00', status: 'pago', date: '05/10/2023', method: 'PIX' },
  { id: 'INV-005', client: 'Marta Ferreira', value: 'R$ 1.100,00', due: '28/09/2023', status: 'atrasado', method: 'Boleto' },
];

const Charges = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Cobranças</h2>
            <p className="text-zinc-400 mt-1">Gerencie faturas, acompanhe recebimentos e trate inadimplências.</p>
          </div>
          <button className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            Nova Cobrança Avulsa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
            <p className="text-zinc-400 text-sm">Recebido (Este mês)</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">R$ 52.400,00</p>
          </div>
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-400 text-sm">Aguardando Pagamento</p>
            <p className="text-2xl font-bold text-zinc-200 mt-1">R$ 12.310,00</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <p className="text-zinc-400 text-sm">Vencido / Atrasado</p>
            <p className="text-2xl font-bold text-red-400 mt-1">R$ 4.150,00</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por cliente ou código da fatura..." 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>
            <button className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">Filtrar por data</button>
          </div>

          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-6 py-5">Código</th>
                <th className="px-6 py-5">Cliente</th>
                <th className="px-6 py-5">Valor</th>
                <th className="px-6 py-5">Vencimento</th>
                <th className="px-6 py-5">Método</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {charges.map((charge) => (
                <tr 
                  key={charge.id} 
                  className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/cobrancas/${charge.id}`)}
                >
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500 group-hover:text-orange-400 transition-colors">{charge.id}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-zinc-100">{charge.client}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-200">{charge.value}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">{charge.due}</span>
                      {charge.status === 'atrasado' && <AlertTriangle size={14} className="text-red-400" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{charge.method}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight",
                      charge.status === 'pago' ? "bg-orange-500/10 text-orange-400" :
                      charge.status === 'atrasado' ? "bg-red-500/10 text-red-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {charge.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button title="Copiar PIX" className="p-2 text-zinc-500 hover:text-orange-400 transition-colors"><Copy size={16}/></button>
                      <button title="Baixar Boleto" className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors"><Download size={16}/></button>
                      <button title="Enviar Link" className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"><Share2 size={16}/></button>
                      <button title="Renegociar" className="p-2 text-zinc-500 hover:text-orange-400 transition-colors"><History size={16}/></button>
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

export default Charges;