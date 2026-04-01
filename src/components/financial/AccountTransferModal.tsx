"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ArrowRightLeft, Landmark, DollarSign, Calendar, FileText } from 'lucide-react';

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AccountTransferModal = ({ isOpen, onClose, onSuccess }: AccountTransferModalProps) => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    originAccountId: '',
    destinationAccountId: '',
    amount: '',
    description: 'Transferência entre contas',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && effectiveUserId) {
      fetchAccounts();
    }
  }, [isOpen, effectiveUserId]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('bank_accounts')
      .select('id, name, balance')
      .eq('user_id', effectiveUserId)
      .order('name');
    
    if (data) setAccounts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.originAccountId || !formData.destinationAccountId) {
      return showError("Selecione as contas de origem e destino.");
    }
    
    if (formData.originAccountId === formData.destinationAccountId) {
      return showError("A conta de destino deve ser diferente da conta de origem.");
    }

    const amountNum = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      return showError("Insira um valor válido.");
    }

    setLoading(true);
    try {
      // 1. Buscar saldos atuais para garantir precisão
      const { data: currentAccounts, error: fetchError } = await supabase
        .from('bank_accounts')
        .select('id, balance')
        .in('id', [formData.originAccountId, formData.destinationAccountId]);

      if (fetchError || !currentAccounts || currentAccounts.length < 2) {
        throw new Error("Erro ao acessar dados das contas.");
      }

      const originAcc = currentAccounts.find(a => a.id === formData.originAccountId);
      const destAcc = currentAccounts.find(a => a.id === formData.destinationAccountId);

      // 2. Atualizar saldos
      const updateOrigin = supabase.from('bank_accounts')
        .update({ balance: Number(originAcc.balance || 0) - amountNum })
        .eq('id', formData.originAccountId);

      const updateDest = supabase.from('bank_accounts')
        .update({ balance: Number(destAcc.balance || 0) + amountNum })
        .eq('id', formData.destinationAccountId);

      // 3. Criar transações de extrato
      const insertDebit = supabase.from('bank_transactions').insert({
        user_id: effectiveUserId,
        bank_account_id: formData.originAccountId,
        amount: amountNum,
        type: 'debit',
        description: `TRANSFERÊNCIA ENVIADA: ${formData.description}`,
        date: formData.date,
        status: 'reconciled'
      });

      const insertCredit = supabase.from('bank_transactions').insert({
        user_id: effectiveUserId,
        bank_account_id: formData.destinationAccountId,
        amount: amountNum,
        type: 'credit',
        description: `TRANSFERÊNCIA RECEBIDA: ${formData.description}`,
        date: formData.date,
        status: 'reconciled'
      });

      const results = await Promise.all([updateOrigin, updateDest, insertDebit, insertCredit]);
      
      const hasError = results.some(r => r.error);
      if (hasError) throw new Error("Erro ao processar transferência no banco de dados.");

      showSuccess("Transferência realizada com sucesso!");
      onSuccess();
      onClose();
      setFormData({
        originAccountId: '',
        destinationAccountId: '',
        amount: '',
        description: 'Transferência entre contas',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <ArrowRightLeft size={20} />
            </div>
            Transferência entre Contas
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Conta de Origem (Saída)</Label>
            <Select value={formData.originAccountId} onValueChange={v => setFormData({...formData, originAccountId: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                <SelectValue placeholder="Selecione a conta de origem" />
              </SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} (Saldo: R$ {Number(a.balance).toFixed(2)})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
             <div className="bg-apple-white p-2 rounded-full border border-apple-border shadow-sm">
                <ArrowRightLeft size={16} className="text-orange-500 rotate-90" />
             </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Conta de Destino (Entrada)</Label>
            <Select value={formData.destinationAccountId} onValueChange={v => setFormData({...formData, destinationAccountId: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                <SelectValue placeholder="Selecione a conta de destino" />
              </SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Valor (R$)</Label>
              <Input 
                required 
                placeholder="0,00" 
                className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-orange-500" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Data</Label>
              <Input 
                type="date" 
                required 
                className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Descrição / Observação</Label>
            <Input 
              placeholder="Ex: Transferência de Saldo, Aplicação..." 
              className="bg-apple-offWhite border-apple-border h-12 rounded-xl" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "REALIZAR TRANSFERÊNCIA"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountTransferModal;