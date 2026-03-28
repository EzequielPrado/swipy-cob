"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Package, DollarSign, Wand2, Factory, Hammer, Percent } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProductModal = ({ isOpen, onClose, onSuccess }: AddProductModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    tax_percentage: '0', // Novo campo
    sku: '',
    category: '',
    stock_quantity: '0',
    is_produced: false
  });

  const generateSKU = () => {
    const prefix = itemType === 'product' ? 'PRD' : 'SRV';
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${randomChars}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const priceNum = parseFloat(formData.price.replace(',', '.'));
      const costNum = parseFloat(formData.costPrice.replace(',', '.') || '0');
      const taxNum = parseFloat(formData.tax_percentage.replace(',', '.') || '0');
      
      if (isNaN(priceNum)) throw new Error("Preço de venda inválido");

      const finalSku = formData.sku.trim() || generateSKU();
      const stockQty = itemType === 'service' ? 0 : (parseInt(formData.stock_quantity) || 0);
      const isProduced = itemType === 'service' ? false : formData.is_produced;

      const { data: product, error } = await supabase.from('products').insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        price: priceNum,
        cost_price: costNum,
        tax_percentage: taxNum, // Salvando o imposto
        sku: finalSku,
        category: formData.category || (itemType === 'service' ? 'Serviços' : 'Geral'),
        stock_quantity: stockQty,
        is_produced: isProduced
      }).select().single();

      if (error) throw error;

      if (product && stockQty > 0) {
        await supabase.from('inventory_movements').insert({
          user_id: user.id,
          product_id: product.id,
          type: 'in',
          quantity: stockQty,
          notes: 'Estoque inicial (Cadastro manual)'
        });
      }

      showSuccess(`${itemType === 'product' ? 'Produto' : 'Serviço'} cadastrado!`);
      onSuccess();
      onClose();
      
      setFormData({ 
        name: '', description: '', price: '', costPrice: '', tax_percentage: '0', sku: '', 
        category: '', stock_quantity: '0', is_produced: false 
      });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              {itemType === 'product' ? <Package size={20} /> : <Hammer size={20} />}
            </div>
            Novo Item no Catálogo
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase text-apple-muted tracking-widest ml-1">Tipo de Oferta</Label>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setItemType('product')}
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-2xl border font-bold transition-all",
                    itemType === 'product' ? "bg-orange-50 border-orange-500 text-orange-600 shadow-sm" : "bg-apple-offWhite border-apple-border text-apple-muted"
                  )}
                >
                   <Package size={18} /> Produto Físico
                </button>
                <button 
                  type="button"
                  onClick={() => setItemType('service')}
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-2xl border font-bold transition-all",
                    itemType === 'service' ? "bg-blue-50 border-blue-500 text-blue-600 shadow-sm" : "bg-apple-offWhite border-apple-border text-apple-muted"
                  )}
                >
                   <Hammer size={18} /> Serviço / Digital
                </button>
             </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark">Nome do {itemType === 'product' ? 'Produto' : 'Serviço'}</Label>
            <Input required className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Consultoria, Teclado Mecânico..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-apple-dark">Preço de Venda (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
                <Input required placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 pl-10 rounded-xl font-black text-apple-black" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-apple-dark">Imposto Estimado (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                <Input placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 pl-10 rounded-xl font-black text-apple-black" value={formData.tax_percentage} onChange={(e) => setFormData({...formData, tax_percentage: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {itemType === 'product' ? (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-apple-dark">Estoque Inicial</Label>
                <Input type="number" min="0" className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})} />
              </div>
            ) : (
               <div className="space-y-2">
                <Label className="text-xs font-bold text-apple-dark">Categoria do Serviço</Label>
                <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Ex: Manutenção, Consultoria..." />
              </div>
            )}
            <div className="space-y-2">
                <Label className="text-xs font-bold text-apple-dark">Preço de Custo (Opcional)</Label>
                <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: e.target.value})} placeholder="0,00" />
            </div>
          </div>

          {itemType === 'product' && (
            <div className="flex items-center justify-between p-5 bg-orange-50 border border-orange-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <Factory className="text-orange-500" size={20} />
                <div>
                  <Label className="text-sm font-bold text-apple-black leading-none">Produção Industrial?</Label>
                  <p className="text-[10px] text-apple-muted mt-1 font-medium">Vendas deste item geram Ordens de Produção.</p>
                </div>
              </div>
              <Switch checked={formData.is_produced} onCheckedChange={(val) => setFormData({...formData, is_produced: val})} className="data-[state=checked]:bg-orange-500" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark">SKU / Código</Label>
            <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono text-xs" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})} placeholder="Auto-gerar" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark">Descrição Curta</Label>
            <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              SALVAR NO SISTEMA
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;