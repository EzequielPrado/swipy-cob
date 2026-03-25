"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { FileText, Plus, Search, Loader2, ExternalLink, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';

const Fiscal = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    // Buscamos nos logs os registros de emissão de invoice (onde o link da Woovi foi salvo)
    const { data } = await supabase
      .from('notification_logs')
      .select('*, charges(amount, customers(name))')
      .eq('type', 'system')
      .ilike('message', '%Fatura Fiscal emitida%')
      .order('created_at', { ascending: false });

    if (data) setInvoices(data);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchInvoices();
  }, [user]);

  const extractUrl = (msg: string) => msg.split('Link: ')[1] || '#';

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="text-blue-500" size={32} />
              Módulo Fiscal
            </h2>
            <p className="text-zinc-400 mt-1">Gestão de Invoices e Documentos de Cobrança.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} /> Emitir Fatura
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
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

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl min-h-[400px]">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/30">
             <h3 className="font-bold text-zinc-100">Histórico de Documentos</h3>
          </div>
          
          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
          ) : invoices.length === 0 ? (
             <div className="text-center py-20 text-zinc-500">Nenhuma fatura emitida neste módulo.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Emissão</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Valor Original</th>
                  <th className="px-8 py-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5">
                       <p className="text-sm font-bold text-zinc-200">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</p>
                       <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Protocolo API</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-bold text-zinc-100">{inv.charges?.customers?.name || 'Cliente Geral'}</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-bold text-zinc-100">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.charges?.amount || 0)}
                       </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <a 
                        href={extractUrl(inv.message)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-blue-400 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                       >
                         <ExternalLink size={14} /> ABRIR PDF
                       </a>
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