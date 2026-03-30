"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, FileText, Copy, ExternalLink, Trash2, CheckCircle2, Edit3, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Link, useNavigate } from 'react-router-dom';

const ServiceQuotes = () => {
  const { effectiveUserId } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQuotes = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customers(name)')
      .eq('user_id', effectiveUserId)
      .eq('quote_type', 'service') // Filtro específico para Orçamentos de Serviço
      .in('status', ['draft', 'approved']) 
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuotes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [effectiveUserId]);

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/orcamento/${id}`;
    navigator.clipboard.writeText(link);
    showSuccess("Link público copiado com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este orçamento de serviço?")) return;
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
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
               <FileText className="text-orange-500" size={32} /> Orçamentos de Serviços
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Crie propostas de serviços e envie para aprovação online.</p>
          </div>
          <Link 
            to="/servicos/orcamentos/novo"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} /> Novo Orçamento
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou ID..." 
            className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-apple-muted">
              <Wrench size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Nenhum orçamento de serviço encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Data / ID</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Valor Total</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-apple-light transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black">{new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                      <p className="text-[10px] text-apple-muted font-mono mt-0.5 uppercase font-bold">#{quote.id.split('-')[0]}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black">{quote.customers?.name || 'Cliente Removido'}</p>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-orange-600">
                      {currencyFormatter.format(quote.total_amount)}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                        quote.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-orange-50 text-orange-600 border-orange-100"
                      )}>
                        {quote.status === 'approved' ? <CheckCircle2 size={12} /> : <FileText size={12} />}
                        {quote.status === 'approved' ? 'Aprovado' : 'Em Aberto'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => window.open(`/orcamento/${quote.id}`, '_blank')}
                          className="p-2.5 text-apple-muted hover:text-blue-500 transition-colors"
                          title="Visualizar Público"
                        >
                          <ExternalLink size={16}/>
                        </button>
                        <button 
                          onClick={() => copyLink(quote.id)}
                          className="p-2.5 text-apple-muted hover:text-emerald-500 transition-colors"
                          title="Copiar Link Cliente"
                        >
                          <Copy size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(quote.id)}
                          className="p-2.5 text-apple-muted hover:text-red-500 transition-colors"
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

export default ServiceQuotes;