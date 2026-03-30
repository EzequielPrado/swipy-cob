"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Wrench, DollarSign, Tag, FileText } from 'lucide-react';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddServiceModal = ({ isOpen, onClose, onSuccess }: AddServiceModalProps) => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Serviços'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const priceNum = parseFloat(formData.price.replace(',', '.'));
      if (isNaN(priceNum)) throw new Error("Informe um valor válido");

      const { error } = await supabase.from('products').insert({
        user_id: effectiveUserId,
        name: formData.name,
        description: formData.description,
        price: priceNum,
        category: formData.category,
        stock_quantity: 0,
        is_produced: false,
        sku: `SRV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      });

      if (error) throw error;

      showSuccess('Serviço cadastrado com sucesso!');
      onSuccess();
      onClose();
      setFormData({ name: '', description: '', price: '', category: 'Serviços' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Wrench size={20} />
            </div>
            Novo Serviço no Catálogo
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Nome do Serviço</Label>
            <Input required className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Mão de Obra, Consultoria, Corte..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Preço Base (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={14} />
                <Input required placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 pl-8 rounded-xl font-black text-apple-black" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Categoria</Label>
              <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Descrição Curta</Label>
            <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "SALVAR SERVIÇO"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceModal;