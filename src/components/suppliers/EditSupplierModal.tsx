"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Building2, MapPin } from 'lucide-react';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: any;
}

const EditSupplierModal = ({ isOpen, onClose, onSuccess, supplier }: EditSupplierModalProps) => {
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    taxID: '',
    category: '',
    address: {
      zipcode: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
    }
  });

  useEffect(() => {
    if (supplier && isOpen) {
      const addr = supplier.address || {};
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        taxID: supplier.tax_id || '',
        category: supplier.category || '',
        address: {
          zipcode: addr.zipcode || '',
          street: addr.street || '',
          number: addr.number || '',
          neighborhood: addr.neighborhood || '',
          city: addr.city || '',
          state: addr.state || '',
        }
      });
    }
  }, [supplier, isOpen]);

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

        if (!data.erro) {
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
    if (!supplier) return;

    const cleanTaxID = formData.taxID.replace(/\D/g, '');
    if (!formData.name) return showError("O nome do fornecedor é obrigatório.");
    if (cleanTaxID.length < 11) return showError("Um CPF ou CNPJ válido é obrigatório.");

    setLoading(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          tax_id: cleanTaxID,
          category: formData.category,
          address: formData.address
        })
        .eq('id', supplier.id);

      if (error) throw error;

      showSuccess('Fornecedor atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] p-0 flex flex-col max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-apple-border shrink-0 bg-apple-offWhite">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
              <Building2 size={20} />
            </div>
            Editar Fornecedor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest">Identificação</p>
              <div className="space-y-2">
                <Label>Razão Social / Nome Fantasia</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ / CPF</Label>
                  <Input required value={formData.taxID} onChange={(e) => setFormData({...formData, taxID: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-apple-border">
              <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest">Contato</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-apple-border">
              <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> Endereço
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input 
                      value={formData.address.zipcode}
                      onChange={(e) => handleAddressChange('zipcode', e.target.value)}
                      onBlur={handleCepBlur}
                      className="bg-apple-offWhite border-apple-border h-12 rounded-xl"
                    />
                    {fetchingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-500" size={14} />}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={formData.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input value={formData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={formData.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" maxLength={2} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-apple-border bg-apple-offWhite">
            <button 
              type="submit" 
              disabled={loading || fetchingCep}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "SALVAR ALTERAÇÕES"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSupplierModal;