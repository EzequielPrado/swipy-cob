"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import AddMovementModal from '@/components/inventory/AddMovementModal';

const Movements = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchMovements = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name, sku)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMovements(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMovements();
  }, [user]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => 
      m.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [movements, searchTerm]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Movimentações</h2>
            <p className="text-zinc-400 mt-1">Histórico completo de entradas e saídas de produtos do estoque.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <ArrowRightLeft size={18} /> Novo Lançamento
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto, SKU ou observação..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <History size={48} className="mb-4 opacity-20" />
              <p>Nenhuma movimentação encontrada.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Data / Hora</th>
                  <th className="px-8 py-5">Produto</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Quantidade</th>
                  <th className="px-8 py-5">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-200">{new Date(mov.created_at).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-100">{mov.products?.name || 'Produto Removido'}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{mov.products?.sku}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                        mov.type === 'in' 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {mov.type === 'in' ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                        {mov.type === 'in' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "text-sm font-bold",
                        mov.type === 'in' ? "text-emerald-400" : "text-red-400"
                      )}>
                        {mov.type === 'in' ? '+' : '-'}{mov.quantity} un
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-zinc-400 max-w-xs truncate" title={mov.notes}>
                        {mov.notes || '---'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddMovementModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchMovements}
      />
    </AppLayout>
  );
};

export default Movements;