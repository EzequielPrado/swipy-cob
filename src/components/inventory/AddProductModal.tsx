"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Package, DollarSign } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProductModal = ({ isOpen, onClose, onSuccess }: AddProductModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    category: '',
    stock_quantity: '0'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const priceNum = parseFloat(formData.price.replace(',', '.'));
      if (isNaN(priceNum)) throw new Error("Valor inválido");

      const { error } = await supabase.from('products').insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        price: priceNum,
        sku: formData.sku,
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity) || 0
      });

      if (error) throw error;

      showSuccess('Produto cadastrado com sucesso!');
      onSuccess();
      onClose();
      setFormData({ name: '', description: '', price: '', sku: '', category: '', stock_quantity: '0' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="text-orange-500" size={20} />
            Novo Produto / Serviço
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Nome do Produto ou Serviço</Label>
            <Input 
              required
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Consultoria, Teclado Mecânico..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço de Venda (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <Input 
                  required
                  placeholder="0,00"
                  className="bg-zinc-950 border-zinc-800 h-11 pl-9"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade em Estoque</Label>
              <Input 
                type="number"
                min="0"
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código / SKU</Label>
              <Input 
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                placeholder="Ex: PROD-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input 
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Ex: Serviços, Eletrônicos..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (Opcional)</Label>
            <Input 
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Cadastrar Produto
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;