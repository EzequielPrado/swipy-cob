"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Trash2, Wrench, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddServiceModal from '@/components/services/AddServiceModal';

const ServicesList = () => {
  const { effectiveUserId } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchServices = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', effectiveUserId)
      .ilike('category', '%serviço%')
      .order('created_at', { ascending: false });

    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [effectiveUserId]);

  const filteredServices = useMemo(() => {
    return services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [services, searchTerm]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir o serviço "${name}"?`)) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      showSuccess('Serviço removido!');
      fetchServices();
    } catch (err: any) { showError(err.message); }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Layers className="text-orange-500" size={32} /> Catálogo de Serviços
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Cadastre aqui o que sua empresa faz (Mão de obra, consultoria, etc).</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95">
            <Plus size={20} /> NOVO SERVIÇO
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Buscar serviço no catálogo..." 
            className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : filteredServices.length === 0 ? (
             <div className="text-center py-24 text-apple-muted opacity-30 italic"><Wrench size={48} className="mx-auto mb-4" /><p>Nenhum serviço cadastrado.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-6">Código / Serviço</th>
                    <th className="px-8 py-6">Categoria</th>
                    <th className="px-8 py-6 text-right">Preço de Venda</th>
                    <th className="px-8 py-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-[10px] font-black text-orange-500 font-mono uppercase mb-0.5">#{s.sku}</p>
                        <p className="text-sm font-bold text-apple-black group-hover:text-orange-600 transition-colors">{s.name}</p>
                      </td>
                      <td className="px-8 py-5">
                         <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-apple-offWhite border border-apple-border text-apple-dark">
                           {s.category}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right text-base font-black text-apple-black">
                        {currency.format(s.price)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => handleDelete(s.id, s.name)} className="p-3 text-apple-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <AddServiceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchServices} />
    </AppLayout>
  );
};

export default ServicesList;