"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, DollarSign, Calendar } from 'lucide-react';

interface AddChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddChargeModal = ({ isOpen, onClose, onSuccess }: AddChargeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    method: 'pix',
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setCustomers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      showError("Selecione um cliente");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chama a Edge Function que criamos anteriormente
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          amount: parseFloat(formData.amount.replace(',', '.')),
          method: formData.method,
          dueDate: formData.dueDate,
          userId: user.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao criar cobrança");

      showSuccess('Cobrança gerada com sucesso na Woovi!');
      onSuccess();
      onClose();
      // Limpar formulário
      setFormData({
        customerId: '',
        amount: '',
        method: 'pix',
        dueDate: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Cobrança</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente</Label>
            <Select 
              onValueChange={(val) => setFormData({...formData, customerId: val})}
              value={formData.customerId}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <Input 
                  id="amount" 
                  required
                  placeholder="0,00"
                  className="bg-zinc-950 border-zinc-800 h-11 pl-9"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <Select 
                onValueChange={(val) => setFormData({...formData, method: val})}
                value={formData.method}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <Input 
                id="dueDate" 
                type="date"
                required
                className="bg-zinc-950 border-zinc-800 h-11 pl-9"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Gerar Cobrança
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddChargeModal;