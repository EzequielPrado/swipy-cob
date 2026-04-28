"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ArrowRightLeft } from 'lucide-react';

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AccountTransferModal = ({ isOpen, onClose, onSuccess }: AccountTransferModalProps) => {
  const { user, profile } = useAuth(); // Usar o ID real logado para não bloquear no RLS

  const hashPin = async (plainPin: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(plainPin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    originAccountId: '',
    destinationAccountId: '',
    amount: '',
    description: 'Transferência entre contas',
    date: new Date().toISOString().split('T')[0],
    pin: ''
  });

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchAccounts();
    }
  }, [isOpen, user?.id]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('bank_accounts')
      .select('id, name, balance, type')
      .eq('user_id', user?.id)
      .order('name');
    
    if (data) setAccounts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.originAccountId || !formData.destinationAccountId) {
      return showError("Selecione as contas de origem e destino.");
    }
    
    if (formData.originAccountId === formData.destinationAccountId) {
      return showError("A conta de destino deve ser diferente da origem.");
    }

    const amountNum = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      return showError("Insira um valor numérico válido.");
    }

    if (!formData.pin || formData.pin.length !== 6) {
      return showError("Informe o PIN de segurança de 6 dígitos.");
    }

    setLoading(true);
    try {
      // Validar PIN
      const pinHash = await hashPin(formData.pin);
      if (profile?.transaction_pin && profile.transaction_pin !== pinHash) {
        throw new Error("PIN de segurança incorreto.");
      }
      // 1. Pegar dados das contas selecionadas
      const originAcc = accounts.find(a => a.id === formData.originAccountId);
      const destAcc = accounts.find(a => a.id === formData.destinationAccountId);

      if (!originAcc || !destAcc) throw new Error("Erro ao localizar as contas.");

      // 2. Atualizar Saldos (Apenas se a conta não for gerida por API/Woovi)
      if (originAcc.type !== 'swipy') {
        const { error: errOrigem } = await supabase.from('bank_accounts')
          .update({ balance: Number(originAcc.balance || 0) - amountNum })
          .eq('id', formData.originAccountId);
        if (errOrigem) throw new Error("Erro ao descontar saldo: " + errOrigem.message);
      }

      if (destAcc.type !== 'swipy') {
        const { error: errDest } = await supabase.from('bank_accounts')
          .update({ balance: Number(destAcc.balance || 0) + amountNum })
          .eq('id', formData.destinationAccountId);
        if (errDest) throw new Error("Erro ao somar saldo: " + errDest.message);
      }

      // 3. Criar registro de SAÍDA no extrato da origem
      const { error: errExtratoSaida } = await supabase.from('bank_transactions').insert({
        user_id: user?.id,
        bank_account_id: formData.originAccountId,
        amount: amountNum,
        type: 'debit',
        description: `Enviado: ${formData.description}`,
        date: formData.date,
        status: 'reconciled'
      });
      if (errExtratoSaida) throw new Error("Erro ao criar extrato de saída: " + errExtratoSaida.message);

      // 4. Criar registro de ENTRADA no extrato de destino
      const { error: errExtratoEntrada } = await supabase.from('bank_transactions').insert({
        user_id: user?.id,
        bank_account_id: formData.destinationAccountId,
        amount: amountNum,
        type: 'credit',
        description: `Recebido: ${formData.description}`,
        date: formData.date,
        status: 'reconciled'
      });
      if (errExtratoEntrada) throw new Error("Erro ao criar extrato de entrada: " + errExtratoEntrada.message);

      showSuccess("Transferência processada com sucesso no extrato!");
      
      setFormData({
        originAccountId: '',
        destinationAccountId: '',
        amount: '',
        description: 'Transferência entre contas',
        date: new Date().toISOString().split('T')[0],
        pin: ''
      });
      
      onSuccess();
      onClose();
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
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.type === 'swipy' ? '(Saldo API)' : `(R$ ${Number(a.balance).toFixed(2)})`}
                  </SelectItem>
                ))}
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

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">PIN de Segurança (6 dígitos)</Label>
            <Input 
              type="password"
              inputMode="numeric"
              maxLength={6}
              required 
              placeholder="000000" 
              className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-center text-xl tracking-[0.3em]" 
              value={formData.pin} 
              onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} 
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