"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { FileText, Plus, Search, Loader2, ExternalLink, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';

const Fiscal = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Busca os logs de sistema que contêm a mensagem "Fatura Fiscal emitida"
      // e faz o join com a tabela de charges para pegar o valor e o nome do cliente
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          *,
          charges!inner (
            amount,
            user_id,
            customers (
              name
            )
          )
        `)
        .eq('type', 'system')
        .ilike('message', '%Fatura Fiscal emitida%')
        .eq('charges.user_id', user.id) // Garante que só puxa as da empresa atual
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  // Filtra as faturas na tela (por nome do cliente)
  const filtered = invoices.filter(inv => 
    inv.charges?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extrai o link da mensagem salva no log
  const extractUrl = (msg: string) => {
    const parts = msg.split('Link: ');
    return parts.length > 1 ? parts[1].trim() : '#';
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="text-orange-500" size={32} />
              Módulo Fiscal
            </h2>
            <p className="text-zinc-400 mt-1">Acompanhe as faturas e notas oficiais emitidas pela Woovi.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> Emitir Fatura
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex items-center gap-4">
             <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                <CheckCircle2 size={24} />
             </div>
             <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Emitidas</p>
                <p className="text-2xl font-bold text-zinc-100">{invoices.length}</p>
             </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <ShieldCheck size={24} />
             </div>
             <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Integração</p>
                <p className="text-lg font-bold text-zinc-100 uppercase tracking-tight">Woovi Invoicing</p>
             </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/30">
             <h3 className="font-bold text-zinc-100">Histórico de Documentos</h3>
          </div>
          
          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filtered.length === 0 ? (
             <div className="text-center py-20 text-zinc-500">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma fatura encontrada.</p>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Fatura / Cliente</th>
                  <th className="px-8 py-5">Emissão</th>
                  <th className="px-8 py-5">Valor Original</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-100">Fatura de Serviço</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{inv.charges?.customers?.name || 'Cliente Geral'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Calendar size={14} />
                        {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-zinc-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.charges?.amount || 0)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a 
                          href={extractUrl(inv.message)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                        >
                          <ExternalLink size={14} /> Ver PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <IssueInvoiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchInvoices} 
      />
    </AppLayout>
  );
};

export default Fiscal;