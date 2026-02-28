"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Copy, Download, Share2, History, AlertTriangle, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const Charges = () => {
  const navigate = useNavigate();
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCharges = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('charges')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCharges(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copiado para a área de transferência!");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Cobranças</h2>
            <p className="text-zinc-400 mt-1">Gerencie faturas e acompanhe recebimentos reais da Woovi.</p>
          </div>
          <button className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <Plus size={18} /> Nova Cobrança Avulsa
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Cliente</th>
                  <th className="px-6 py-5">Valor</th>
                  <th className="px-6 py-5">Vencimento</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">Nenhuma cobrança encontrada.</td>
                  </tr>
                ) : (
                  charges.map((charge) => (
                    <tr 
                      key={charge.id} 
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/cobrancas/${charge.id}`)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-zinc-100">{charge.customers?.name || 'Cliente removido'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-zinc-200">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-400">
                          {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight",
                          charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400" :
                          charge.status === 'atrasado' ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"
                        )}>
                          {charge.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {charge.payment_link && (
                            <button onClick={() => copyToClipboard(charge.payment_link)} title="Copiar Link" className="p-2 text-zinc-500 hover:text-orange-400 transition-colors">
                              <Copy size={16}/>
                            </button>
                          )}
                          <button title="Enviar" className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"><Share2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Charges;