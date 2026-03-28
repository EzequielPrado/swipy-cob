"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, History, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Percent, DollarSign } from 'lucide-react';
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
      .select('*')
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
  const taxPercent = Number(product.tax_percentage || 0);
  
  const taxAmount = price * (taxPercent / 100);
  const netRevenue = price - taxAmount;
  const margin = netRevenue - cost;
  const marginPercent = cost > 0 ? ((margin / cost) * 100).toFixed(1) : '100';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-black flex items-center gap-3 mb-1">
                <Package className="text-orange-500" size={24} />
                {product.name}
              </DialogTitle>
              <p className="text-xs text-apple-muted font-mono tracking-widest uppercase font-bold">SKU: {product.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Estoque Atual</p>
              <p className={cn("text-2xl font-black", product.stock_quantity > 0 ? "text-emerald-600" : "text-apple-muted")}>
                {product.stock_quantity} <span className="text-sm font-normal">un</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-apple-border border-b border-apple-border bg-white">
          <div className="p-6">
            <p className="text-[9px] text-apple-muted uppercase font-black tracking-widest mb-1">Preço Venda</p>
            <p className="text-lg font-black text-apple-black">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
            </p>
          </div>
          <div className="p-6">
            <p className="text-[9px] text-red-500 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
               <Percent size={10} /> Impostos
            </p>
            <p className="text-lg font-black text-red-500">
               {taxPercent}%
               <span className="text-[10px] block font-medium opacity-60">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxAmount)}</span>
            </p>
          </div>
          <div className="p-6">
            <p className="text-[9px] text-apple-muted uppercase font-black tracking-widest mb-1">Custo Un.</p>
            <p className="text-lg font-black text-apple-dark">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost)}
            </p>
          </div>
          <div className="p-6 bg-emerald-50">
            <p className="text-[9px] text-emerald-600 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp size={10} /> Margem Real
            </p>
            <p className="text-lg font-black text-emerald-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(margin)} 
              <span className="text-[10px] block font-medium opacity-60">({marginPercent}%)</span>
            </p>
          </div>
        </div>

        <div className="p-8">
          <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <History size={16} className="text-orange-500" /> Histórico de Lançamentos
          </h4>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-apple-muted text-sm font-medium italic">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-4 space-y-3">
              {movements.map((mov) => (
                <div key={mov.id} className="bg-apple-offWhite border border-apple-border p-4 rounded-2xl flex items-center justify-between group hover:border-apple-dark transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                      mov.type === 'in' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {mov.type === 'in' ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-apple-black">
                        {mov.type === 'in' ? 'Entrada' : 'Saída'} de {mov.quantity} un
                      </p>
                      <p className="text-[10px] text-apple-muted font-bold mt-0.5 uppercase tracking-tight">{mov.notes || 'Sem observação'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-apple-dark">{new Date(mov.created_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[9px] text-apple-muted font-bold mt-0.5">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
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