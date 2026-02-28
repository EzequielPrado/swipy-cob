"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCustomerModal = ({ isOpen, onClose, onSuccess }: AddCustomerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    taxID: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Criar na Woovi via Edge Function
      const correlationID = crypto.randomUUID();
      const wooviResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          correlationID,
        })
      });

      const wooviResult = await wooviResponse.json();
      if (!wooviResponse.ok) throw new Error(wooviResult.error || "Erro ao criar na Woovi");

      // 2. Salvar no Supabase
      const { error: dbError } = await supabase.from('customers').insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tax_id: formData.taxID,
        correlation_id: correlationID,
        woovi_id: wooviResult.customer?.id || null
      });

      if (dbError) throw dbError;

      showSuccess('Cliente cadastrado com sucesso!');
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
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo / Razão Social</Label>
            <Input 
              id="name" 
              required
              className="bg-zinc-950 border-zinc-800"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              required
              className="bg-zinc-950 border-zinc-800"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxID">CPF / CNPJ</Label>
              <Input 
                id="taxID" 
                required
                className="bg-zinc-950 border-zinc-800"
                value={formData.taxID}
                onChange={(e) => setFormData({...formData, taxID: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone" 
                className="bg-zinc-950 border-zinc-800"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-2 rounded-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Cadastrar Cliente
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;