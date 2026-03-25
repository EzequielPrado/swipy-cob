"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ArrowRightLeft, Package } from 'lucide-react';

interface AddMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddMovementModal = ({ isOpen, onClose, onSuccess }: AddMovementModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    type: 'in',
    quantity: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchProducts();
    }
  }, [isOpen, user]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_quantity, sku')
      .eq('user_id', user?.id)
      .order('name');
    
    if (data) setProducts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
      showError("Selecione um produto");
      return;
    }
    
    setLoading(true);

    try {
      const qty = parseInt(formData.quantity);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantidade inválida");

      const product = products.find(p => p.id === formData.productId);
      if (!product) throw new Error("Produto não encontrado");

      let newStock = product.stock_quantity || 0;
      
      if (formData.type === 'in') {
        newStock += qty;
      } else {
        if (qty > newStock) {
          throw new Error(`Estoque insuficiente. Saldo atual: ${newStock}`);
        }
        newStock -= qty;
      }

      // 1. Inserir no histórico
      const { error: movError } = await supabase.from('inventory_movements').insert({
        user_id: user?.id,
        product_id: formData.productId,
        type: formData.type,
        quantity: qty,
        notes: formData.notes || (formData.type === 'in' ? 'Entrada manual' : 'Saída manual')
      });

      if (movError) throw movError;

      // 2. Atualizar saldo do produto
      const { error: prodError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id);

      if (prodError) throw prodError;

      showSuccess('Movimentação registrada com sucesso!');
      onSuccess();
      onClose();
      setFormData({ productId: '', type: 'in', quantity: '', notes: '' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ArrowRightLeft className="text-orange-500" size={20} />
            Nova Movimentação
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <Select 
              value={formData.productId}
              onValueChange={(val) => setFormData({...formData, productId: val})}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-zinc-500 text-xs ml-2">({p.stock_quantity} un)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select 
                value={formData.type}
                onValueChange={(val) => setFormData({...formData, type: val})}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="in">Entrada (+)</SelectItem>
                  <SelectItem value="out">Saída (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input 
                required
                type="number"
                min="1"
                placeholder="Ex: 10"
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observação (Opcional)</Label>
            <Input 
              placeholder="Ex: Compra de fornecedor, perda, etc."
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Confirmar Lançamento
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMovementModal;