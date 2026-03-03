"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, MapPin } from 'lucide-react';

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
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // LIMPEZA: Remove pontos, traços e barras do CPF/CNPJ antes de salvar
      const cleanTaxID = formData.taxID.replace(/\D/g, '');
      const correlationID = crypto.randomUUID();
      
      // 1. Criar na Woovi via Edge Function
      const wooviResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          taxID: cleanTaxID, // Enviando limpo para a Woovi
          correlationID,
          address: formData.address
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
        tax_id: cleanTaxID, // Salvando limpo no banco
        correlation_id: correlationID,
        woovi_id: wooviResult.customer?.id || null,
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
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">Novo Cliente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] px-6 py-2">
            <div className="space-y-6 pb-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Informações Básicas</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo / Razão Social</Label>
                  <Input 
                    id="name" 
                    required
                    className="bg-zinc-950 border-zinc-800 h-11"
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
                    className="bg-zinc-950 border-zinc-800 h-11"
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
                      placeholder="Apenas números ou formatado"
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.taxID}
                      onChange={(e) => setFormData({...formData, taxID: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-zinc-800 pt-6">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-orange-500" />
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Endereço</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">CEP</Label>
                    <Input 
                      id="zipcode" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.zipcode}
                      onChange={(e) => handleAddressChange('zipcode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input 
                      id="number" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.number}
                      onChange={(e) => handleAddressChange('number', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Logradouro (Rua, Av.)</Label>
                  <Input 
                    id="street" 
                    className="bg-zinc-950 border-zinc-800 h-11"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input 
                      id="neighborhood" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.neighborhood}
                      onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input 
                      id="complement" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.complement}
                      onChange={(e) => handleAddressChange('complement', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input 
                      id="city" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF)</Label>
                    <Input 
                      id="state" 
                      maxLength={2}
                      placeholder="SP"
                      className="bg-zinc-950 border-zinc-800 h-11 uppercase"
                      value={formData.address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t border-zinc-800">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
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