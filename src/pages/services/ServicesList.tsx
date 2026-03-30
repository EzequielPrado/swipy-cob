"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Trash2, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddProductModal from '@/components/inventory/AddProductModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ServicesList = () => {
  const { effectiveUserId } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchServices = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    // Para identificar serviços, filtramos produtos onde is_produced = false e idealmente a categoria seja ligada a serviços,
    // mas como o AddProductModal define Serviços como padrão quando itemType === 'service', buscaremos tudo que tem estoque 0 e não é produzido (ou categoria Serviços).
    // Para ser mais seguro, buscamos itens onde categoria = 'Serviços' ou category ILIKE '%serviço%'
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', effectiveUserId)
      .ilike('category', '%serviço%')
      .order('created_at', { ascending: false });

    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [effectiveUserId]);

  const categories = useMemo(() => {
    const cats = services.map(s => s.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.sku && s.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = selectedCategory === 'all' || s.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [services, searchTerm, selectedCategory]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir o serviço "${name}"?`)) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      showSuccess('Serviço excluído');
      fetchServices();
    } catch (err: any) { showError(err.message); }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
              <Wrench className="text-orange-500" size={32} /> Catálogo de Serviços
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão de serviços prestados e precificação.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm">
            <Plus size={18} /> NOVO SERVIÇO
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-apple-white p-2 rounded-[2rem] border border-apple-border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou código..." className="w-full bg-transparent border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-0 outline-none text-apple-black" />
          </div>
          <div className="w-full md:w-auto flex items-center gap-2 pr-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px] bg-apple-offWhite border-apple-border h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border text-apple-black"><SelectItem value="all">Todas</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : filteredServices.length === 0 ? (
             <div className="text-center py-20 text-apple-muted font-bold italic"><p>Nenhum serviço localizado no catálogo.</p></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Serviço</th><th className="px-8 py-5">Categoria</th><th className="px-8 py-5">Preço Cobrado</th><th className="px-8 py-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filteredServices.map((s) => (
                  <tr key={s.id} className="hover:bg-apple-light transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black">{s.name}</p>
                      <p className="text-[10px] text-apple-muted font-bold font-mono uppercase mt-0.5">CÓDIGO: {s.sku}</p>
                    </td>
                    <td className="px-8 py-5"><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-apple-offWhite border border-apple-border text-apple-dark">{s.category}</span></td>
                    <td className="px-8 py-5 text-sm font-black text-apple-black">{currency.format(s.price)}</td>
                    <td className="px-8 py-5 text-right"><button onClick={() => handleDelete(s.id, s.name)} className="p-2 text-apple-muted hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Reutiliza o AddProductModal, mas como ele tem o switch de tipo de item, o usuário seleciona Serviço. */}
      <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchServices} />
    </AppLayout>
  );
};

export default ServicesList;