"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Layers, Plus, Loader2, Trash2, ArrowUpCircle, ArrowDownCircle, Search, Info, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";
import AddAccountCategoryModal from '@/components/financial/AddAccountCategoryModal';

const ChartOfAccounts = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchChart = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('type', { ascending: false })
        .order('code', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChart(); }, [user]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"? Certifique-se que não existam lançamentos nela.`)) return;
    try {
      const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Categoria removida.");
      fetchChart();
    } catch (err: any) {
      showError("Não foi possível excluir. Talvez existam lançamentos usando esta categoria.");
    }
  };

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code?.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Layers className="text-orange-500" size={32} /> Plano de Contas
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Estrutura gerencial para classificação de receitas e despesas.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-lg shadow-orange-500/10 flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} /> NOVA CATEGORIA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-apple-white border border-apple-border p-7 rounded-[2.5rem] shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-100">
                <ArrowUpCircle size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Fontes de Receita</p>
                <p className="text-3xl font-black text-apple-black">{categories.filter(c => c.type === 'revenue').length}</p>
              </div>
           </div>
           <div className="bg-apple-white border border-apple-border p-7 rounded-[2.5rem] shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 border border-red-100">
                <ArrowDownCircle size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Centros de Custo</p>
                <p className="text-3xl font-black text-apple-black">{categories.filter(c => c.type === 'expense').length}</p>
              </div>
           </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar categoria ou código..." 
                className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
               <Info size={14} /> CLASSIFICAÇÃO GERENCIAL ATIVA
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Código</th>
                  <th className="px-8 py-5">Nome da Categoria</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-apple-muted italic">Nenhuma categoria cadastrada.</td></tr>
                ) : (
                  filtered.map((cat) => (
                    <tr key={cat.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5 font-mono text-xs font-black text-orange-500">
                        {cat.code || '---'}
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-apple-black">{cat.name}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           {cat.type === 'revenue' ? (
                             <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase">
                               <ArrowUpCircle size={14} /> Receita
                             </span>
                           ) : (
                             <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase">
                               <ArrowDownCircle size={14} /> Despesa
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600">
                           <CheckCircle2 size={12} /> Ativa
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button 
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-2.5 text-apple-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                         >
                           <Trash2 size={18} />
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddAccountCategoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchChart} 
      />
    </AppLayout>
  );
};

export default ChartOfAccounts;