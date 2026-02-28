"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, DollarSign, Settings2 } from 'lucide-react';

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription: any;
}

const EditSubscriptionModal = ({ isOpen, onClose, onSuccess, subscription }: EditSubscriptionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    generationDay: '',
    dueDay: '',
    status: ''
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        amount: subscription.amount.toString(),
        generationDay: subscription.generation_day.toString(),
        dueDay: subscription.due_day.toString(),
        status: subscription.status
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amountVal = parseFloat(formData.amount.replace(',', '.'));
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          amount: amountVal,
          generation_day: parseInt(formData.generationDay),
          due_day: parseInt(formData.dueDay),
          status: formData.status
        })
        .eq('id', subscription.id);

      if (error) throw error;

      showSuccess('Assinatura atualizada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings2 className="text-orange-500" size={20} />
            Editar Assinatura
          </DialogTitle>
          <p className="text-sm text-zinc-400">Cliente: {subscription?.customers?.name}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(val) => setFormData({...formData, status: val})}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <Input 
                  required
                  className="bg-zinc-950 border-zinc-800 h-11 pl-9"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dia da Geração</Label>
              <Select 
                value={formData.generationDay}
                onValueChange={(val) => setFormData({...formData, generationDay: val})}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {days.map((d) => (
                    <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dia do Vencimento</Label>
              <Select 
                value={formData.dueDay}
                onValueChange={(val) => setFormData({...formData, dueDay: val})}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {days.map((d) => (
                    <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-zinc-100 text-zinc-950 font-bold py-3 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Salvar Alterações
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSubscriptionModal;