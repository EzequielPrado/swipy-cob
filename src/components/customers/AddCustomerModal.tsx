"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, MapPin, User, Mail, Smartphone, Fingerprint, X } from 'lucide-react';

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
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const cleanTaxID = formData.taxID.replace(/\D/g, '');
      if (cleanTaxID.length < 11) throw new Error("CPF ou CNPJ inválido.");

      const correlationID = crypto.randomUUID();
      
      // 1. Criar na Woovi via Edge Function
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
      
      if (!response.ok) {
        // Se o erro for Token não configurado, o lojista precisa de aviso especial
        if (result.error?.includes("Token Woovi")) {
          throw new Error("Seu Token Woovi (AppID) ainda não foi configurado pelo administrador.");
        }
        throw new Error(result.error || "A API da Woovi recusou o cadastro. Verifique os dados.");
      }

      // 2. Salvar no Banco Local
      const { error: dbError } = await supabase.from('customers').insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tax_id: cleanTaxID,
        correlation_id: correlationID,
        woovi_id: result.customer?.id || null,
        address: formData.address,
        status: 'em dia'
      });

      if (dbError) throw dbError;

      showSuccess('Cliente cadastrado com sucesso!');
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: '', email: '', phone: '', taxID: '',
        address: { zipcode: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '', country: 'Brasil' }
      });
    } catch (error: any) {
      console.error("[AddCustomer] Erro:", error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[95vh]">
        <DialogHeader className="p-6 border-b border-zinc-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="text-orange-500" size={20} />
            Novo Cliente
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Bloco 1: Identificação */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Fingerprint size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Identificação e Contato</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">Nome Completo / Razão Social</Label>
                  <Input 
                    required 
                    placeholder="Ex: João Silva ou Empresa LTDA"
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">E-mail</Label>
                  <Input 
                    type="email" 
                    required 
                    placeholder="cliente@email.com"
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">WhatsApp (com DDD)</Label>
                  <Input 
                    required 
                    placeholder="5511999999999"
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">CPF ou CNPJ (Somente números)</Label>
                  <Input 
                    required 
                    placeholder="000.000.000-00"
                    value={formData.taxID} 
                    onChange={(e) => setFormData({...formData, taxID: e.target.value})} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Endereço */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500">
                <MapPin size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Endereço de Cobrança</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">CEP</Label>
                  <Input 
                    placeholder="00000-000"
                    value={formData.address.zipcode} 
                    onChange={(e) => handleAddressChange('zipcode', e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">Rua / Avenida</Label>
                  <Input 
                    value={formData.address.street} 
                    onChange={(e) => handleAddressChange('street', e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Número</Label>
                  <Input 
                    value={formData.address.number} 
                    onChange={(e) => handleAddressChange('number', e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Bairro</Label>
                  <Input 
                    value={formData.address.neighborhood} 
                    onChange={(e) => handleAddressChange('neighborhood', e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Estado (UF)</Label>
                  <Input 
                    maxLength={2}
                    placeholder="SP"
                    value={formData.address.state} 
                    onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())} 
                    className="bg-zinc-950 border-zinc-800 h-11 uppercase" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">Cidade</Label>
                  <Input 
                    value={formData.address.city} 
                    onChange={(e) => handleAddressChange('city', e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Complemento</Label>
                  <Input 
                    value={formData.address.complement} 
                    onChange={(e) => handleAddressChange('complement', e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 h-11" 
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <button 
            type="submit" 
            form="customer-form"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Cadastro"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;