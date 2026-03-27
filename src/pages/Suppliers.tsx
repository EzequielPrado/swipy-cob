"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Building2, Trash2, Mail, Phone, Tag, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddSupplierModal from '@/components/suppliers/AddSupplierModal';

const Suppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.tax_id && s.tax_id.includes(searchTerm)) ||
      (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliers, searchTerm]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir fornecedor "${name}"?`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Fornecedor removido.");
      fetchSuppliers();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Building2 className="text-orange-500" size={32} />
              Fornecedores
            </h2>
            <p className="text-zinc-400 mt-1">Gerencie seus parceiros comerciais e cadeia de suprimentos.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> Novo Fornecedor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Total de Parceiros</p>
            <p className="text-3xl font-black text-zinc-100">{suppliers.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Categorias Ativas</p>
            <p className="text-3xl font-black text-zinc-100">{new Set(suppliers.map(s => s.category).filter(Boolean)).size}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, categoria ou CNPJ..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-2xl">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <Building2 size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum fornecedor encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Fornecedor</th>
                  <th className="px-8 py-5">Categoria</th>
                  <th className="px-8 py-5">Contato</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-orange-500 font-black">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{s.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{s.tax_id || 'Documento não informado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight bg-zinc-800 text-zinc-400 border border-zinc-700">
                         <Tag size={10} /> {s.category || 'Geral'}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-300 flex items-center gap-2"><Mail size={12} className="text-zinc-500" /> {s.email || '---'}</p>
                        <p className="text-xs text-zinc-300 flex items-center gap-2"><Phone size={12} className="text-zinc-500" /> {s.phone || '---'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDelete(s.id, s.name)}
                          disabled={deletingId === s.id}
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          {deletingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16}/>}
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

      <AddSupplierModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchSuppliers} 
      />
    </AppLayout>
  );
};

export default Suppliers;