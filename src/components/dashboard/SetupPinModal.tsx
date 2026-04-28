"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface SetupPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

const SetupPinModal = ({ isOpen, onClose, onSuccess, userId }: SetupPinModalProps) => {
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const hashPin = async (plainPin: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(plainPin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      showError("O PIN deve conter exatamente 6 dígitos numéricos.");
      return;
    }

    if (pin !== confirmPin) {
      showError("Os PINs informados não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const pinHash = await hashPin(pin);

      const { error } = await supabase
        .from('profiles')
        .update({ transaction_pin: pinHash })
        .eq('id', userId);

      if (error) throw error;

      showSuccess('PIN de transação criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message || "Erro ao salvar PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Impede fechar o modal clicando fora se o usuário for obrigado a criar o PIN
      if (!open) return;
    }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="text-orange-500" size={24} />
            Criar PIN de Segurança
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-zinc-400 mt-2">
          Sua conta foi liberada! Para garantir a segurança de suas movimentações, crie um PIN de 6 dígitos para autorizar saques e transferências.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Novo PIN (6 dígitos)</Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="000000"
                className="bg-zinc-950 border-zinc-800 h-12 text-center text-2xl tracking-[0.5em] font-bold"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirmar PIN</Label>
            <Input
              id="confirmPin"
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="000000"
              className="bg-zinc-950 border-zinc-800 h-12 text-center text-2xl tracking-[0.5em] font-bold"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <DialogFooter className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Salvar PIN de Segurança
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SetupPinModal;
