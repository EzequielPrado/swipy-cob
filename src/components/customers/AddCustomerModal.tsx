"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, User, MapPin, FileCheck, Phone, Mail, Fingerprint, Search } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCustomerModal = ({ isOpen, onClose, onSuccess }: AddCustomerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
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

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleCepBlur = async () => {
    const cep = formData.address.zipcode.replace(/\D/g, '');
    if (cep.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        
        if (data.erro) {
          showError("CEP não localizado.");
        } else {
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: data.logradouro,
              neighborhood: data.bairro,
              city: data.localidade,
              state: data.uf
            }
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanTaxID = formData.taxID.replace(/\D/g, '');
    if (cleanTaxID.length < 11) {
      return showError("O CPF/CNPJ é obrigatório para o cadastro.");
    }

    if (!formData.address.state) {
      return showError("O campo UF (Estado) é obrigatório.");
    }

    setLoading(true);

    try {
      const correlationID = crypto.randomUUID();
      const fullAddress = {
        ...formData.address,
        rg: formData.rg
      };

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
          address: fullAddress
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar cadastro");
      }

      showSuccess('Cliente cadastrado com sucesso!');
      onSuccess();
      onClose();
      
      setFormData({
        name: '', email: '', phone: '', taxID: '', rg: '',
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
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[600px] p-0 flex flex-col max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite shrink-0">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <User size={24} />
            </div>
            Novo Cadastro
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
            
            <div className="space-y-6">
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <FileCheck size={14} className="text-orange-500" /> 1. Identificação Obrigatória
              </p>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold ml-1">Nome completo ou Razão Social</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold focus:ring-orange-500/20" placeholder="Ex: João Silva ou Empresa Ltda" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1">CPF / CNPJ</Label>
                  <Input 
                    required 
                    value={formData.taxID} 
                    onChange={(e) => setFormData({...formData, taxID: e.target.value})} 
                    className="bg-apple-offWhite border-orange-200 h-12 rounded-xl font-black text-orange-600 focus:ring-orange-500/20" 
                    placeholder="000.000.000-00" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 flex items-center gap-1.5"><Fingerprint size={14} className="text-blue-500" /> RG (Opcional)</Label>
                  <Input 
                    value={formData.rg} 
                    onChange={(e) => setFormData({...formData, rg: e.target.value})} 
                    className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" 
                    placeholder="Número do RG" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 flex items-center gap-1.5"><Mail size={14} className="text-apple-muted" /> E-mail</Label>
                  <Input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" placeholder="exemplo@email.com" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 flex items-center gap-1.5"><Phone size={14} className="text-emerald-500" /> WhatsApp</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono" placeholder="5511999999999" />
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
                  <div className="relative">
                    <Input 
                      required 
                      value={formData.address.zipcode} 
                      onChange={(e) => handleAddressChange('zipcode', e.target.value)} 
                      onBlur={handleCepBlur}
                      className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" 
                      placeholder="00000-000" 
                    />
                    {fetchingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-500" size={16} />}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1">Número</Label>
                  <Input required value={formData.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold ml-1">Logradouro (Rua/Av)</Label>
                <Input required value={formData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label className="text-xs font-bold ml-1">Bairro</Label>
                  <Input required value={formData.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label className="text-xs font-bold ml-1">Cidade</Label>
                  <Input required value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label className="text-xs font-bold ml-1">UF (Estado)</Label>
                  <Input required maxLength={2} value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold text-center" placeholder="SP" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-apple-border bg-apple-offWhite">
            <button 
              type="submit" 
              disabled={loading || fetchingCep}
              className="w-full bg-apple-black hover:bg-zinc-800 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : "CONCLUIR CADASTRO"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;