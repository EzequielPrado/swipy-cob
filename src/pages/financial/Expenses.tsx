"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  ArrowUpRight, 
  Plus, 
  Loader2, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  Tag, 
  Edit2,
  Paperclip,
  Eye,
  CalendarDays,
  User
} from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() + 1);
    }
    return options.reverse();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    description: '', 
    amount: '', 
    category: CATEGORIES[0], 
    dueDate: new Date().toISOString().split('T')[0],
    supplierId: 'none'
  });

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [payData, setPayData] = useState({ accountId: '', paymentDate: new Date().toISOString().split('T')[0] });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .select('*, bank_accounts(name)')
      .eq('user_id', user.id)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: true });

    if (expError) {
      showError("Erro ao carregar despesas.");
    } else if (expData) {
      const today = new Date().toISOString().split('T')[0];
      setExpenses(expData.map(exp => ({
        ...exp,
        status: (exp.status === 'pendente' && exp.due_date < today) ? 'atrasado' : exp.status
      })));
    }

    const { data: accData } = await supabase.from('bank_accounts').select('id, name').eq('user_id', user.id);
    if (accData) setAccounts(accData);

    const { data: suppData } = await supabase.from('suppliers').select('id, name').eq('user_id', user.id).order('name');
    if (suppData) setSuppliers(suppData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedMonth]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      description: '', 
      amount: '', 
      category: CATEGORIES[0], 
      dueDate: new Date().toISOString().split('T')[0],
      supplierId: 'none'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: any) => {
    setEditingId(exp.id);
    setFormData({ 
      description: exp.description, 
      amount: exp.amount.toString().replace('.', ','), 
      category: exp.category || CATEGORIES[0], 
      dueDate: exp.due_date,
      supplierId: exp.supplier_id || 'none'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const amountNum = parseFloat(formData.amount.replace(',', '.'));
      const payload: any = {
        description: formData.description,
        amount: isNaN(amountNum) ? 0 : amountNum,
        category: formData.category,
        due_date: formData.dueDate,
        supplier_id: formData.supplierId === 'none' ? null : formData.supplierId
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
      // 1. Buscar saldo atual da conta
      const { data: accountData, error: accErr } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', payData.accountId)
        .single();

      if (accErr) throw new Error("Erro ao consultar saldo da conta.");

      // 2. Calcular novo saldo (Sempre subtrair para despesas locais)
      const currentBalance = Number(accountData.balance || 0);
      const expenseAmount = Number(selectedExpense.amount || 0);
      const newBalance = currentBalance - expenseAmount;

      const { error: balanceErr } = await supabase
        .from('bank_accounts')
        .update({ balance: newBalance })
        .eq('id', payData.accountId);
      
      if (balanceErr) throw balanceErr;

      // 3. Marcar despesa como paga
      const { error } = await supabase.from('expenses').update({
        status: 'pago',
        bank_account_id: payData.accountId,
        payment_date: payData.paymentDate
      }).eq('id', selectedExpense.id);

      if (error) throw error;

      showSuccess("Pagamento realizado e saldo atualizado!");
      setIsPayOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp: any) => {
    if (!confirm("Excluir esta despesa?")) return;
    
    try {
      // Se a despesa já estava paga, estornar o valor para a conta antes de deletar
      if (exp.status === 'pago' && exp.bank_account_id) {
        const { data: account } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('id', exp.bank_account_id)
          .single();
          
        if (account) {
          const restoredBalance = Number(account.balance || 0) + Number(exp.amount || 0);
          await supabase.from('bank_accounts').update({ balance: restoredBalance }).eq('id', exp.bank_account_id);
        }
      }

      const { error } = await supabase.from('expenses').delete().eq('id', exp.id);
      if (error) throw error;
      
      showSuccess("Despesa removida.");
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const triggerFileUpload = (id: string) => {
    setSelectedExpense({ id }); 
    fileInputRef.current?.click();
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const expId = selectedExpense?.id;
    if (!file || !expId) return;

    setUploadingId(expId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${expId}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('expenses')
        .update({ receipt_url: publicUrl })
        .eq('id', expId);

      if (updateError) throw updateError;

      showSuccess("Comprovante anexado com sucesso!");
      fetchData();
    } catch (err: any) {
      console.error(err);
      showError("Erro ao anexar comprovante.");
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalPendente = expenses.filter(e => e.status !== 'pago').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
            <p className="text-zinc-400 mt-1">Controle suas despesas, fornecedores e obrigações.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden pr-2">
              <div className="pl-3 text-zinc-500">
                <CalendarDays size={16} />
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-semibold text-orange-400 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button 
              onClick={openAddModal}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
              <Plus size={18} /> Nova Despesa
            </button>
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleUploadReceipt} 
          className="hidden" 
          accept="image/*,.pdf" 
        />

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full max-w-sm border-l-red-500/50">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-red-500" /> Total Pendente ({monthOptions.find(o => o.value === selectedMonth)?.label})
          </p>
          <p className="text-3xl font-bold text-zinc-100">{currencyFormatter.format(totalPendente)}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <CheckCircle2 size={48} className="mb-4 opacity-20 text-emerald-500" />
              <p>Nenhuma conta registrada neste mês.</p>
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
                  <tr key={exp.id} className={cn("hover:bg-zinc-800/30 transition-colors", exp.status === 'pago' && "opacity-60 hover:opacity-100")}>
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
                          {new Date(exp.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                        {exp.status === 'pago' && (
                          exp.receipt_url ? (
                            <a 
                              href={exp.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-1"
                              title="Ver Comprovante"
                            >
                              <Eye size={16} /> <span className="text-[10px] font-bold">Ver</span>
                            </a>
                          ) : (
                            <button 
                              onClick={() => triggerFileUpload(exp.id)}
                              disabled={uploadingId === exp.id}
                              className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Anexar Comprovante"
                            >
                              {uploadingId === exp.id ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                              <span className="text-[10px] font-bold">Anexar</span>
                            </button>
                          )
                        )}

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
                          onClick={() => handleDelete(exp)}
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px] rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3 font-bold tracking-tight">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                <ArrowUpRight size={20} />
              </div>
              {editingId ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            
            <div className="space-y-2">
              <Label className="text-zinc-400 flex items-center gap-2"><User size={14} className="text-orange-500" /> Fornecedor (Opcional)</Label>
              <Select value={formData.supplierId} onValueChange={v => setFormData({...formData, supplierId: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                  <SelectValue placeholder="Selecione um fornecedor..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="none">Nenhum / Gasto Avulso</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Descrição da Despesa</Label>
              <Input required placeholder="Ex: Compra de mercadorias, Aluguel..." className="bg-zinc-950 border-zinc-800 h-12 rounded-xl focus:ring-red-500/20" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Valor (R$)</Label>
                <Input required placeholder="0,00" className="bg-zinc-950 border-zinc-800 h-12 rounded-xl font-bold text-red-400" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Vencimento</Label>
                <Input required type="date" className="bg-zinc-950 border-zinc-800 h-12 rounded-xl text-zinc-300" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-400">Categoria</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800/50">
              <button type="submit" disabled={saving} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={20} /> : "SALVAR DESPESA"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px] rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3 font-bold tracking-tight">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={20} />
              </div>
              Baixar Pagamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-6 pt-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center shadow-inner">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Valor a Pagar</p>
              <p className="text-3xl font-black text-zinc-100">{selectedExpense && currencyFormatter.format(selectedExpense.amount)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Data do Pagamento</Label>
              <Input required type="date" className="bg-zinc-950 border-zinc-800 h-12 rounded-xl text-zinc-300" value={payData.paymentDate} onChange={e => setPayData({...payData, paymentDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Conta de Origem</Label>
              <Select value={payData.accountId} onValueChange={v => setPayData({...payData, accountId: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                  <SelectValue placeholder="De onde o dinheiro sairá?" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 border-t border-zinc-800/50">
              <button type="submit" disabled={saving || accounts.length === 0} className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={20} /> : "CONFIRMAR PAGAMENTO"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Expenses;