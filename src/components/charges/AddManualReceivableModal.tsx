"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Landmark, User, DollarSign, Calendar, FileText } from 'lucide-react';

interface AddManualReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddManualReceivableModal = ({ isOpen, onClose, onSuccess }: AddManualReceivableModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    accountId: '',
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchData();
    }
  }, [isOpen, user]);

  const fetchData = async () => {
    const [custRes, accRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', user?.id).order('name'),
      supabase.from('bank_accounts').select('id, name').eq('user_id', user?.id).order('name')
    ]);
    
    if (custRes.data) setCustomers(custRes.data);
    if (accRes.data) setAccounts(accRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return showError("Selecione um cliente");
    
    setLoading(true);
    try {
      const amountNum = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amountNum)) throw new Error("Valor inválido");

      const { error } = await supabase.from('charges').insert({
        user_id: user?.id,
        customer_id: formData.customerId,
        bank_account_id: formData.accountId || null,
        amount: amountNum,
        description: formData.description,
        due_date: formData.dueDate,
        status: 'pendente',
        method: 'manual' // Identificador de que não é Woovi
      });

      if (error) throw error;

      showSuccess("Recebível cadastrado com sucesso!");
      onSuccess();
      onClose();
      setFormData({ customerId: '', accountId: '', amount: '', description: '', dueDate: new Date().toISOString().split('T')[0] });
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
            <DollarSign className="text-emerald-500" size={20} />
            Lançar Recebimento Manual
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User size={14} className="text-zinc-500" /> Cliente / Pagador</Label>
            <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><FileText size={14} className="text-zinc-500" /> Descrição / Referência</Label>
            <Input 
              placeholder="Ex: Venda de Balcão, Acordo extra..."
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input 
                required
                placeholder="0,00"
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input 
                type="date"
                required
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Landmark size={14} className="text-zinc-500" /> Conta de Destino (Opcional)</Label>
            <Select value={formData.accountId} onValueChange={v => setFormData({...formData, accountId: v})}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11"><SelectValue placeholder="Onde o dinheiro vai cair?" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Registrar Recebível"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddManualReceivableModal;