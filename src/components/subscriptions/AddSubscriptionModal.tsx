"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, DollarSign, Calendar, RefreshCcw, FileText } from 'lucide-react';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddSubscriptionModal = ({ isOpen, onClose, onSuccess }: AddSubscriptionModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    description: '',
    generationDay: '1',
    dueDay: '5'
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchCustomers();
    }
  }, [isOpen, user]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('user_id', user?.id)
      .eq('status', 'em dia')
      .order('name');
    
    if (data) setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      showError("Selecione um cliente");
      return;
    }
    
    setLoading(true);

    try {
      if (!user) throw new Error("Não autenticado");

      const amountVal = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amountVal) || amountVal <= 0) throw new Error("Valor inválido");

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        customer_id: formData.customerId,
        amount: amountVal,
        description: formData.description,
        generation_day: parseInt(formData.generationDay),
        due_day: parseInt(formData.dueDay),
        status: 'active'
      });

      if (error) throw error;

      showSuccess('Recorrência configurada com sucesso!');
      onSuccess();
      onClose();
      setFormData({ customerId: '', amount: '', description: '', generationDay: '1', dueDay: '5' });
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
            <RefreshCcw className="text-orange-500" size={20} />
            Nova Assinatura
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select 
              value={formData.customerId}
              onValueChange={(val) => setFormData({...formData, customerId: val})}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição da Assinatura</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <Input 
                placeholder="Ex: Honorários Contábeis, Mensalidade SaaS"
                className="bg-zinc-950 border-zinc-800 h-11 pl-9"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <p className="text-[10px] text-zinc-500">Este texto aparecerá na fatura do cliente todos os meses.</p>
          </div>

          <div className="space-y-2">
            <Label>Valor Recorrente (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <Input 
                required
                placeholder="0,00"
                className="bg-zinc-950 border-zinc-800 h-11 pl-9"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
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
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Criar Assinatura
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubscriptionModal;