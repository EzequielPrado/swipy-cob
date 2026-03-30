"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, MapPin, User, Fingerprint, Mail, Phone, FileCheck } from 'lucide-react';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: any;
}

const EditCustomerModal = ({ isOpen, onClose, onSuccess, customer }: EditCustomerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    taxID: '',
    rg: '',
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

  useEffect(() => {
    if (customer && isOpen) {
      const addr = customer.address || {};
      
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        taxID: customer.tax_id || '',
        rg: addr.rg || '',
        address: {
          zipcode: addr.zipcode || '',
          street: addr.street || '',
          number: addr.number || '',
          neighborhood: addr.neighborhood || '',
          city: addr.city || '',
          state: addr.state || '',
          complement: addr.complement || '',
          country: addr.country || 'Brasil'
        }
      });
    }
  }, [customer, isOpen]);

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address.state) {
      return showError("O campo UF (Estado) é obrigatório.");
    }

    setLoading(true);

    try {
      const cleanTaxID = formData.taxID.replace(/\D/g, '');
      const fullAddress = {
        ...formData.address,
        rg: formData.rg
      };

      const { error: dbError } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          tax_id: cleanTaxID,
          address: fullAddress
        })
        .eq('id', customer.id);

      if (dbError) throw dbError;

      if (customer.woovi_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/update-woovi-customer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              wooviId: customer.woovi_id,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              taxID: cleanTaxID,
              address: fullAddress
            })
          });
        } catch (e) {
          console.warn("Woovi sync failed, local DB updated.");
        }
      }

      showSuccess('Cadastro atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[600px] p-0 flex flex-col max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite shrink-0">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
             <User className="text-orange-500" /> Editar Cadastro
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
            
            <div className="space-y-6">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                 <FileCheck size={14} className="text-orange-500" /> 1. Identificação
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-bold ml-1">Nome completo ou Razão Social</Label>
                <Input required className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1">CPF / CNPJ</Label>
                  <Input required className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-orange-600" value={formData.taxID} onChange={(e) => setFormData({...formData, taxID: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 flex items-center gap-1.5"><Fingerprint size={14} className="text-blue-500" /> RG (Opcional)</Label>
                  <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 flex items-center gap-1.5"><Mail size={14} className="text-apple-muted" /> E-mail</Label>
                  <Input type="email" required className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 flex items-center gap-1.5"><Phone size={14} className="text-emerald-500" /> WhatsApp</Label>
                  <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-apple-border">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin size={14} className="text-orange-500" /> 2. Localização e Contato
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1">CEP</Label>
                  <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.address.zipcode} onChange={(e) => handleAddressChange('zipcode', e.target.value)} placeholder="00000-000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1">Número</Label>
                  <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold ml-1">Logradouro (Rua/Av)</Label>
                <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4 pb-4">
                <div className="space-y-2 col-span-1">
                  <Label className="text-xs font-bold ml-1">Bairro</Label>
                  <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label className="text-xs font-bold ml-1">Cidade</Label>
                  <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label className="text-xs font-bold ml-1">UF (Estado)</Label>
                  <Input maxLength={2} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold text-center" value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())} placeholder="SP" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-apple-border bg-apple-offWhite shrink-0">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-apple-black hover:bg-zinc-800 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : "SALVAR ALTERAÇÕES"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;