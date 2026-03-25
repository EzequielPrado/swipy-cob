"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, History, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const ProductDetailsModal = ({ isOpen, onClose, product }: ProductDetailsModalProps) => {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && product?.id) {
      fetchMovements();
    }
  }, [isOpen, product]);

  const fetchMovements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, profiles:user_id(full_name, company)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMovements(data);
    }
    setLoading(false);
  };

  if (!product) return null;

  const cost = Number(product.cost_price || 0);
  const price = Number(product.price || 0);
  const margin = price - cost;
  const marginPercent = cost > 0 ? ((margin / cost) * 100).toFixed(1) : '100';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/30">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 mb-1">
                <Package className="text-orange-500" size={24} />
                {product.name}
              </DialogTitle>
              <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">SKU: {product.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Estoque Atual</p>
              <p className={cn("text-2xl font-bold", product.stock_quantity > 0 ? "text-emerald-400" : "text-zinc-500")}>
                {product.stock_quantity} <span className="text-sm font-normal">un</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800">
          <div className="p-4 bg-zinc-950/50">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Custo</p>
            <p className="text-lg font-bold text-zinc-300">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost)}
            </p>
          </div>
          <div className="p-4 bg-zinc-950/50">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Preço Venda</p>
            <p className="text-lg font-bold text-orange-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
            </p>
          </div>
          <div className="p-4 bg-emerald-500/5">
            <p className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp size={10} /> Lucro (Margem)
            </p>
            <p className="text-lg font-bold text-emerald-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(margin)} 
              <span className="text-xs ml-1 opacity-70">({marginPercent}%)</span>
            </p>
          </div>
        </div>

        <div className="p-6">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <History size={14} /> Histórico de Lançamentos
          </h4>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-orange-500" size={24} />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm italic">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {movements.map((mov) => (
                <div key={mov.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      mov.type === 'in' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {mov.type === 'in' ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">
                        {mov.type === 'in' ? 'Entrada' : 'Saída'} de {mov.quantity} un
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{mov.notes || 'Sem observação'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400">{new Date(mov.created_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsModal;