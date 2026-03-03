"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, MapPin, User, Mail, Smartphone, Fingerprint } from 'lucide-react';

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
    address: {
      zipcode: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      complement: '',
      country: 'Brasil'
    }
  });

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const cleanTaxID = formData.taxID.replace(/\D/g, '');
      if (cleanTaxID.length < 11) throw new Error("Documento (CPF/CNPJ) inválido");

      const correlationID = crypto.randomUUID();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          taxID: cleanTaxID,
          correlationID,
          address: formData.address
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao criar na Woovi");

      const { error: dbError } = await supabase.from('customers').insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tax_id: cleanTaxID,
        correlation_id: correlationID,
        woovi_id: result.customer?.id || null,
        address: formData.address
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
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[550px] p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-zinc-800 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="text-orange-500" size={20} />
            Novo Cliente
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-8 pb-10">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Informações de Contato</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Nome Completo / Razão Social</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-zinc-950 border-zinc-800 pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <Input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-zinc-950 border-zinc-800 pl-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <Input required value={formData.taxID} onChange={(e) => setFormData({...formData, taxID: e.target.value})} className="bg-zinc-950 border-zinc-800 pl-10" placeholder="000.000.000-00" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">WhatsApp (DDI+DDD+Nº)</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-zinc-950 border-zinc-800 pl-10" placeholder="5511999999999" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Endereço de Cobrança</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">CEP</Label>
                    <Input value={formData.address.zipcode} onChange={(e) => handleAddressChange('zipcode', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Número</Label>
                    <Input value={formData.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Rua / Avenida</Label>
                  <Input value={formData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Bairro</Label>
                    <Input value={formData.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Cidade</Label>
                    <Input value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Estado (UF)</Label>
                    <Input maxLength={2} value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())} className="bg-zinc-950 border-zinc-800" placeholder="SP" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Complemento</Label>
                    <Input value={formData.address.complement} onChange={(e) => handleAddressChange('complement', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Cadastrar Cliente Agora"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;