"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, DollarSign, Calendar, FileText, Layers } from 'lucide-react';

interface AddChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddChargeModal = ({ isOpen, onClose, onSuccess }: AddChargeModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    categoryId: '',
    amount: '',
    description: '',
    method: 'pix',
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchData();
    }
  }, [isOpen, user]);

  const fetchData = async () => {
    const [custRes, catRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', user?.id).order('name'),
      supabase.from('chart_of_accounts').select('id, name').eq('user_id', user?.id).eq('type', 'revenue').order('name')
    ]);
    
    if (custRes.data) setCustomers(custRes.data);
    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0) setFormData(prev => ({ ...prev, categoryId: catRes.data[0].id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return showError("Selecione um cliente");

    setLoading(true);

    try {
      const origin = window.location.origin;

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', user?.id)
        .single();

      const provider = profile?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'create-petta-charge' : 'create-woovi-charge';

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          amount: parseFloat(formData.amount.replace(',', '.')),
          description: formData.description,
          method: formData.method,
          dueDate: formData.dueDate,
          userId: user?.id,
          origin: origin
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao criar cobrança");

      // Atualizar a categoria no registro recém criado (A edge function cria o registro base)
      await supabase.from('charges').update({ category_id: formData.categoryId }).eq('id', result.id);

      showSuccess('Cobrança gerada e categorizada!');
      onSuccess();
      onClose();
      setFormData({ customerId: '', categoryId: '', amount: '', description: '', method: 'pix', dueDate: new Date().toISOString().split('T')[0] });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Nova Cobrança Pix</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Cliente / Pagador</Label>
            <Select onValueChange={(val) => setFormData({...formData, customerId: val})} value={formData.customerId}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1 flex items-center gap-1.5"><Layers size={12} className="text-orange-500" /> Categoria de Receita</Label>
            <Select onValueChange={(val) => setFormData({...formData, categoryId: val})} value={formData.categoryId}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Como classificar esse ganho?" /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Descrição / Referência</Label>
            <Input id="description" placeholder="Ex: Mensalidade, Venda de Produto..." className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Valor (R$)</Label>
              <Input required placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-orange-500" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Vencimento</Label>
              <Input type="date" required className="bg-apple-offWhite border-apple-border h-12 rounded-xl" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95">
              {loading ? <Loader2 className="animate-spin" /> : "GERAR COBRANÇA PIX"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddChargeModal;