"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Landmark, Wallet } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
}

const WithdrawModal = ({ isOpen, onClose, onSuccess, availableBalance }: WithdrawModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    pixKey: '',
    pixKeyType: 'CPF'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount.replace(',', '.'));

    if (isNaN(amountNum) || amountNum <= 0) {
      showError("Insira um valor válido");
      return;
    }

    if (amountNum > availableBalance) {
      showError("Saldo insuficiente para este saque");
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      const provider = profile?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'petta-wallet' : 'woovi-wallet';

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}?action=withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          amount: amountNum,
          pixKey: formData.pixKey,
          pixKeyType: formData.pixKeyType
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || "Erro ao processar saque");

      showSuccess('Solicitação de saque enviada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Landmark className="text-orange-500" size={20} />
            Solicitar Saque
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-4">
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Saldo Disponível</p>
          <p className="text-2xl font-bold text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBalance)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="pixKeyType">Tipo de Chave PIX</Label>
            <Select 
              onValueChange={(val) => setFormData({...formData, pixKeyType: val})}
              value={formData.pixKeyType}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="CNPJ">CNPJ</SelectItem>
                <SelectItem value="EMAIL">E-mail</SelectItem>
                <SelectItem value="PHONE">Telefone</SelectItem>
                <SelectItem value="RANDOM">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input 
              id="pixKey" 
              required
              placeholder="Sua chave aqui"
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.pixKey}
              onChange={(e) => setFormData({...formData, pixKey: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor para Saque (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
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

          <DialogFooter className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Confirmar Saque Instantâneo
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawModal;