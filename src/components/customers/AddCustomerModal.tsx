"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, User, MapPin } from 'lucide-react';

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
      const cleanTaxID = formData.taxID.replace(/\D/g, '');
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
      
      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar cadastro");
      }

      showSuccess('Cliente cadastrado com sucesso!');
      onSuccess();
      onClose();
      
      // Limpar form
      setFormData({
        name: '', email: '', phone: '', taxID: '',
        address: { zipcode: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '', country: 'Brasil' }
      });
      
    } catch (err: any) {
      showError(err.message);
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
            Cadastrar Novo Cliente
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dados Pessoais</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Nome ou Razão Social</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (DDI+DDD+Nº)</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-zinc-950 border-zinc-800" placeholder="5511999999999" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>CPF / CNPJ (Somente números)</Label>
                  <Input required value={formData.taxID} onChange={(e) => setFormData({...formData, taxID: e.target.value})} className="bg-zinc-950 border-zinc-800" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> Endereço
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={formData.address.zipcode} onChange={(e) => handleAddressChange('zipcode', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={formData.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rua/Av</Label>
                <Input value={formData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="bg-zinc-950 border-zinc-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input maxLength={2} value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())} className="bg-zinc-950 border-zinc-800" placeholder="SP" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-950/50">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Cadastro"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;