"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, MapPin } from 'lucide-react';

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
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        taxID: customer.tax_id || '',
        address: customer.address || {
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
    }
  }, [customer]);

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
      // LIMPEZA: Normalizando para apenas números
      const cleanTaxID = formData.taxID.replace(/\D/g, '');

      // 1. Atualizar na Woovi via Edge Function
      if (customer.woovi_id) {
        const wooviResponse = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/update-woovi-customer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            wooviId: customer.woovi_id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            taxID: cleanTaxID,
            address: formData.address
          })
        });

        if (!wooviResponse.ok) {
          const wooviResult = await wooviResponse.json();
          throw new Error(wooviResult.error || "Erro ao atualizar na Woovi");
        }
      }

      // 2. Atualizar no Supabase
      const { error: dbError } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          tax_id: cleanTaxID,
          address: formData.address
        })
        .eq('id', customer.id);

      if (dbError) throw dbError;

      showSuccess('Cliente atualizado com sucesso!');
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
          <DialogTitle className="text-xl">Editar Cliente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] px-6 py-2">
            <div className="space-y-6 pb-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Informações Básicas</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo / Razão Social</Label>
                  <Input 
                    id="edit-name" 
                    required
                    className="bg-zinc-950 border-zinc-800 h-11"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input 
                    id="edit-email" 
                    type="email" 
                    required
                    className="bg-zinc-950 border-zinc-800 h-11"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-taxID">CPF / CNPJ</Label>
                    <Input 
                      id="edit-taxID" 
                      required
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.taxID}
                      onChange={(e) => setFormData({...formData, taxID: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input 
                      id="edit-phone" 
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
                    <Label htmlFor="edit-zipcode">CEP</Label>
                    <Input 
                      id="edit-zipcode" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.zipcode}
                      onChange={(e) => handleAddressChange('zipcode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-number">Número</Label>
                    <Input 
                      id="edit-number" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.number}
                      onChange={(e) => handleAddressChange('number', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-street">Logradouro (Rua, Av.)</Label>
                  <Input 
                    id="edit-street" 
                    className="bg-zinc-950 border-zinc-800 h-11"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input 
                      id="edit-neighborhood" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.neighborhood}
                      onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-complement">Complemento</Label>
                    <Input 
                      id="edit-complement" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.complement}
                      onChange={(e) => handleAddressChange('complement', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input 
                      id="edit-city" 
                      className="bg-zinc-950 border-zinc-800 h-11"
                      value={formData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-state">Estado (UF)</Label>
                    <Input 
                      id="edit-state" 
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
              Salvar Alterações
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;