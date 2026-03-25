"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowUpRight, Plus, Loader2, Trash2, Calendar, CheckCircle2, AlertTriangle, Building, Tag, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Impostos e Taxas", 
  "Fornecedores", 
  "Folha de Pagamento", 
  "Infraestrutura (Luz, Internet)", 
  "Marketing", 
  "Outros"
];

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Adicionar/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    description: '', amount: '', category: CATEGORIES[0], dueDate: ''
  });

  // Modal de Pagar
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [payData, setPayData] = useState({ accountId: '', paymentDate: new Date().toISOString().split('T')[0] });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .select('*, bank_accounts(name)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (!expError && expData) {
      const today = new Date().toISOString().split('T')[0];
      const updatedExpenses = expData.map(exp => ({
        ...exp,
        status: (exp.status === 'pendente' && exp.due_date < today) ? 'atrasado' : exp.status
      }));
      setExpenses(updatedExpenses);
    }

    const { data: accData } = await supabase.from('bank_accounts').select('id, name').eq('user_id', user.id);
    if (accData) setAccounts(accData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ description: '', amount: '', category: CATEGORIES[0], dueDate: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: any) => {
    setEditingId(exp.id);
    setFormData({ 
      description: exp.description, 
      amount: exp.amount.toString().replace('.', ','), 
      category: exp.category || CATEGORIES[0], 
      dueDate: exp.due_date 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const amountNum = parseFloat(formData.amount.replace(',', '.'));
      const payload = {
        description: formData.description,
        amount: isNaN(amountNum) ? 0 : amountNum,
        category: formData.category,
        due_date: formData.dueDate
      };

      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (error) throw error;
        showSuccess("Despesa atualizada!");
      } else {
        const { error } = await supabase.from('expenses').insert({ user_id: user?.id, ...payload });
        if (error) throw error;
        showSuccess("Despesa cadastrada!");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payData.accountId) return showError("Selecione uma conta bancária.");
    
    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').update({
        status: 'pago',
        bank_account_id: payData.accountId,
        payment_date: payData.paymentDate
      }).eq('id', selectedExpense.id);

      if (error) throw error;
      showSuccess("Despesa marcada como paga!");
      setIsPayOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta despesa?")) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Despesa excluída.");
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const totalPendente = expenses.filter(e => e.status !== 'pago').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
            <p className="text-zinc-400 mt-1">Controle suas despesas, fornecedores e obrigações.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
          >
            <Plus size={18} /> Nova Despesa
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full max-w-sm border-l-red-500/50">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-red-500" /> Total Pendente
          </p>
          <p className="text-3xl font-bold text-zinc-100">{currencyFormatter.format(totalPendente)}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <CheckCircle2 size={48} className="mb-4 opacity-20 text-emerald-500" />
              <p>Nenhuma conta a pagar registrada. Tudo em dia!</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Descrição / Categoria</th>
                  <th className="px-8 py-5">Vencimento</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5">Status / Conta</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className={cn("hover:bg-zinc-800/30 transition-colors", exp.status === 'pago' && "opacity-60")}>
                    <td className="px-8 py-5">
                      <p className={cn("text-sm font-bold", exp.status === 'pago' ? "text-zinc-400 line-through" : "text-zinc-100")}>{exp.description}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-zinc-500 uppercase tracking-widest">
                        <Tag size={10} /> {exp.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Calendar size={14} className={exp.status === 'atrasado' ? "text-red-500" : "text-zinc-500"} />
                        <span className={exp.status === 'atrasado' ? "text-red-400 font-bold" : ""}>
                          {new Date(exp.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-zinc-100">
                      {currencyFormatter.format(exp.amount)}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                          exp.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          exp.status === 'atrasado' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        )}>
                          {exp.status}
                        </span>
                        {exp.status === 'pago' && (
                          <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                            <Building size={10} /> {exp.bank_accounts?.name || 'Conta Removida'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {exp.status !== 'pago' && (
                          <button 
                            onClick={() => { setSelectedExpense(exp); setIsPayOpen(true); }}
                            className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
                            title="Pagar"
                          >
                            <CheckCircle2 size={18}/>
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(exp)}
                          className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(exp.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Adicionar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="text-red-500" size={20} />
              {editingId ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição da Despesa</Label>
              <Input required placeholder="Ex: Conta de Luz, Fornecedor X" className="bg-zinc-950 border-zinc-800" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input required placeholder="0,00" className="bg-zinc-950 border-zinc-800" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input required type="date" className="bg-zinc-950 border-zinc-800" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <button type="submit" disabled={saving} className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : "Salvar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={20} /> Baixar Pagamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-4 pt-4">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 mb-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Valor a Pagar</p>
              <p className="text-xl font-bold text-zinc-100">{selectedExpense && currencyFormatter.format(selectedExpense.amount)}</p>
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Input required type="date" className="bg-zinc-950 border-zinc-800" value={payData.paymentDate} onChange={e => setPayData({...payData, paymentDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Conta de Origem (De onde o dinheiro saiu?)</Label>
              {accounts.length === 0 ? (
                <p className="text-xs text-red-400 italic">Você precisa cadastrar uma Conta Bancária primeiro.</p>
              ) : (
                <Select value={payData.accountId} onValueChange={v => setPayData({...payData, accountId: v})}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter className="pt-4">
              <button type="submit" disabled={saving || accounts.length === 0} className="w-full bg-emerald-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : "Confirmar Pagamento"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Expenses;