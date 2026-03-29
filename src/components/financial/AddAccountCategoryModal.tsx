"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Layers, ArrowUpCircle, ArrowDownCircle, Hash } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AddAccountCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAccountCategoryModal = ({ isOpen, onClose, onSuccess }: AddAccountCategoryModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    code: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('chart_of_accounts').insert({
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        code: formData.code,
        is_active: true
      });

      if (error) throw error;

      showSuccess('Categoria adicionada ao plano!');
      onSuccess();
      onClose();
      setFormData({ name: '', type: 'expense', code: '' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Layers size={20} />
            </div>
            Nova Categoria
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase text-apple-muted tracking-widest ml-1">Natureza da Conta</Label>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'revenue'})}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-2xl border font-bold transition-all",
                    formData.type === 'revenue' ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "bg-apple-offWhite border-apple-border text-apple-muted"
                  )}
                >
                   <ArrowUpCircle size={20} /> <span className="text-[10px] uppercase">Receita</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'expense'})}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-2xl border font-bold transition-all",
                    formData.type === 'expense' ? "bg-red-50 border-red-500 text-red-600" : "bg-apple-offWhite border-apple-border text-apple-muted"
                  )}
                >
                   <ArrowDownCircle size={20} /> <span className="text-[10px] uppercase">Despesa</span>
                </button>
             </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark">Nome da Categoria</Label>
            <Input required className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Aluguel, Venda de Produtos..." />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark flex items-center gap-2"><Hash size={14} className="text-orange-500" /> Código Contábil (Opcional)</Label>
            <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="Ex: 1.1.01" />
          </div>

          <DialogFooter className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "SALVAR CATEGORIA"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountCategoryModal;