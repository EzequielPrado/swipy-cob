"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Landmark, User, DollarSign, Calendar, FileText, Plus, Layers } from 'lucide-react';
import AddCustomerModal from '@/components/customers/AddCustomerModal';

interface AddManualReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddManualReceivableModal = ({ isOpen, onClose, onSuccess }: AddManualReceivableModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: '',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchData();
    }
  }, [isOpen, user]);

  const fetchData = async () => {
    const [custRes, accRes, catRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', user?.id).order('name'),
      supabase.from('bank_accounts').select('id, name').eq('user_id', user?.id).order('name'),
      supabase.from('chart_of_accounts').select('id, name').eq('user_id', user?.id).eq('type', 'revenue').order('name')
    ]);
    
    if (custRes.data) setCustomers(custRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0) setFormData(prev => ({ ...prev, categoryId: catRes.data[0].id }));
    }
  };

  const handleCustomerAdded = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setCustomers(data.sort((a, b) => a.name.localeCompare(b.name)));
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, customerId: data[0].id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return showError("Selecione um cliente");
    
    setLoading(true);
    try {
      const amountNum = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amountNum)) throw new Error("Valor inválido");

      const { error } = await supabase.from('charges').insert({
        user_id: user?.id,
        customer_id: formData.customerId,
        bank_account_id: formData.accountId || null,
        category_id: formData.categoryId || null,
        amount: amountNum,
        description: formData.description,
        due_date: formData.dueDate,
        status: 'pendente',
        method: 'manual'
      });

      if (error) throw error;

      showSuccess("Recebível cadastrado com sucesso!");
      onSuccess();
      onClose();
      setFormData({ customerId: '', accountId: '', categoryId: '', amount: '', description: '', dueDate: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px] rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3 font-bold tracking-tight">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <DollarSign size={20} />
              </div>
              Lançar Recebimento Manual
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-zinc-400"><User size={14} className="text-orange-500" /> Cliente / Pagador</Label>
                <button 
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors flex items-center gap-1 bg-orange-500/5 px-2 py-1 rounded-md border border-orange-500/10"
                >
                  <Plus size={10} /> Novo Cliente
                </button>
              </div>
              <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl focus:ring-orange-500/20">
                  <SelectValue placeholder="Selecione o pagador..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-zinc-400"><Layers size={14} className="text-orange-500" /> Categoria de Receita</Label>
              <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl focus:ring-orange-500/20">
                  <SelectValue placeholder="Classifique este ganho..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-zinc-400"><FileText size={14} className="text-orange-500" /> Descrição / Referência</Label>
              <Input 
                placeholder="Ex: Venda por fora, Acordo, Dinheiro em mãos..."
                className="bg-zinc-950 border-zinc-800 h-12 rounded-xl focus:ring-orange-500/20"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Valor Estimado (R$)</Label>
                <Input 
                  required
                  placeholder="0,00"
                  className="bg-zinc-950 border-zinc-800 h-12 rounded-xl font-bold text-emerald-400"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Data Prevista</Label>
                <Input 
                  type="date"
                  required
                  className="bg-zinc-950 border-zinc-800 h-12 rounded-xl text-zinc-300"
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-zinc-400"><Landmark size={14} className="text-orange-500" /> Conta Bancária de Destino</Label>
              <Select value={formData.accountId} onValueChange={v => setFormData({...formData, accountId: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                  <SelectValue placeholder="Onde o dinheiro vai entrar?" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800/50">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "REGISTRAR RECEBÍVEL"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddCustomerModal 
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSuccess={handleCustomerAdded}
      />
    </>
  );
};

export default AddManualReceivableModal;