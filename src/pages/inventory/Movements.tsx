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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black">Movimentações</h2>
            <p className="text-apple-muted mt-1 font-medium">Histórico completo de entradas e saídas de produtos.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95"
          >
            <ArrowRightLeft size={18} /> NOVO LANÇAMENTO
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Produto, SKU ou observação..." 
            className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm text-apple-black"
          />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-orange-500">
              <Loader2 className="animate-spin" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando log...</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-apple-muted opacity-60 italic">
              <History size={48} className="mb-4 opacity-20" />
              <p>Nenhuma movimentação encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-6">Data / Hora</th>
                    <th className="px-8 py-6">Produto</th>
                    <th className="px-8 py-6">Tipo</th>
                    <th className="px-8 py-6">Quantidade</th>
                    <th className="px-8 py-6">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-apple-black">{new Date(mov.created_at).toLocaleDateString('pt-BR')}</p>
                        <p className="text-[10px] text-apple-muted font-bold mt-0.5">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-apple-black group-hover:text-orange-500 transition-colors">{mov.products?.name || 'Produto Removido'}</p>
                        <p className="text-[10px] text-apple-muted font-mono mt-0.5 font-bold uppercase">SKU: {mov.products?.sku}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          mov.type === 'in' 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-red-50 text-red-600 border-red-100"
                        )}>
                          {mov.type === 'in' ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                          {mov.type === 'in' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "text-base font-black",
                          mov.type === 'in' ? "text-emerald-600" : "text-red-600"
                        )}>
                          {mov.type === 'in' ? '+' : '-'}{mov.quantity} <span className="text-[10px] uppercase font-bold text-apple-muted">un.</span>
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs text-apple-muted font-medium max-w-xs truncate italic" title={mov.notes}>
                          {mov.notes || '---'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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