"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, FileText, Copy, ExternalLink, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Link, useNavigate } from 'react-router-dom';

const Quotes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQuotes = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customers(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuotes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [user]);

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/orcamento/${id}`;
    navigator.clipboard.writeText(link);
    showSuccess("Link público copiado com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este orçamento?")) return;
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Orçamento removido.");
      fetchQuotes();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const filteredQuotes = quotes.filter(q => 
    q.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.id.includes(searchTerm)
  );

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Orçamentos</h2>
            <p className="text-zinc-400 mt-1">Crie propostas comerciais e envie para aprovação online.</p>
          </div>
          <Link 
            to="/vendas/orcamentos/novo"
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> Novo Orçamento
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou ID..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Nenhum orçamento encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Data / ID</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Valor Total</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-200">{new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">#{quote.id.split('-')[0]}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-100">{quote.customers?.name || 'Cliente Removido'}</p>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-orange-400">
                      {currencyFormatter.format(quote.total_amount)}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                        quote.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}>
                        {quote.status === 'approved' && <CheckCircle2 size={12} />}
                        {quote.status === 'approved' ? 'Aprovado' : 'Aguardando'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => window.open(`/orcamento/${quote.id}`, '_blank')}
                          className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"
                          title="Visualizar Público"
                        >
                          <ExternalLink size={16}/>
                        </button>
                        <button 
                          onClick={() => copyLink(quote.id)}
                          className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
                          title="Copiar Link Cliente"
                        >
                          <Copy size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(quote.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Quotes;