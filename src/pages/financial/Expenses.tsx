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
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Contas a Pagar</h2>
            <p className="text-apple-muted mt-1 font-medium">Controle suas despesas, fornecedores e obrigações.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-apple-white border border-apple-border rounded-lg overflow-hidden pr-2 shadow-sm">
              <div className="pl-3 text-apple-muted">
                <CalendarDays size={16} />
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-semibold text-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button 
              onClick={openAddModal}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm"
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

        <div className="bg-apple-white border border-apple-border rounded-[2rem] p-6 shadow-sm w-full max-w-sm border-l-red-500 border-l-4">
          <p className="text-[10px] text-apple-muted uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-red-500" /> Total Pendente ({monthOptions.find(o => o.value === selectedMonth)?.label})
          </p>
          <p className="text-3xl font-black text-apple-black">{currencyFormatter.format(totalPendente)}</p>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-apple-muted">
              <CheckCircle2 size={48} className="mb-4 opacity-20 text-emerald-500" />
              <p>Nenhuma conta registrada neste mês.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Descrição / Categoria</th>
                  <th className="px-8 py-5">Vencimento</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5">Status / Conta</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {expenses.map((exp) => (
                  <tr key={exp.id} className={cn("hover:bg-apple-light transition-colors", exp.status === 'pago' && "opacity-60 hover:opacity-100")}>
                    <td className="px-8 py-5">
                      <p className={cn("text-sm font-bold", exp.status === 'pago' ? "text-apple-muted line-through" : "text-apple-black")}>{exp.description}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-apple-muted uppercase tracking-widest font-bold">
                        <Tag size={10} /> {exp.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm text-apple-dark font-medium">
                        <Calendar size={14} className={exp.status === 'atrasado' ? "text-red-500" : "text-apple-muted"} />
                        <span className={exp.status === 'atrasado' ? "text-red-500 font-bold" : ""}>
                          {new Date(exp.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-apple-black">
                      {currencyFormatter.format(exp.amount)}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                          exp.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          exp.status === 'atrasado' ? "bg-red-50 text-red-600 border-red-100" : 
                          "bg-orange-50 text-orange-600 border-orange-100"
                        )}>
                          {exp.status}
                        </span>
                        {exp.status === 'pago' && (
                          <span className="text-[9px] text-apple-muted font-bold flex items-center gap-1">
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
                              className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-1"
                              title="Ver Comprovante"
                            >
                              <Eye size={16} /> <span className="text-[10px] font-black uppercase">Ver</span>
                            </a>
                          ) : (
                            <button 
                              onClick={() => triggerFileUpload(exp.id)}
                              disabled={uploadingId === exp.id}
                              className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Anexar Comprovante"
                            >
                              {uploadingId === exp.id ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                              <span className="text-[10px] font-black uppercase">Anexar</span>
                            </button>
                          )
                        )}

                        {exp.status !== 'pago' && (
                          <button 
                            onClick={() => { setSelectedExpense(exp); setIsPayOpen(true); }}
                            className="p-2.5 text-apple-muted hover:text-emerald-500 transition-colors"
                            title="Pagar"
                          >
                            <CheckCircle2 size={18}/>
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(exp)}
                          className="p-2.5 text-apple-muted hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(exp)}
                          className="p-2.5 text-apple-muted hover:text-red-500 transition-colors"
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
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl flex items-center gap-3 font-bold">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 border border-red-100">
                <ArrowUpRight size={20} />
              </div>
              {editingId ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-apple-muted font-bold text-xs uppercase flex items-center gap-2"><User size={14} className="text-orange-500" /> Fornecedor (Opcional)</Label>
              <Select value={formData.supplierId} onValueChange={v => setFormData({...formData, supplierId: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-red-500/20 shadow-sm">
                  <SelectValue placeholder="Selecione um fornecedor..." />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  <SelectItem value="none" className="focus:bg-apple-light">Nenhum / Gasto Avulso</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="focus:bg-apple-light">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-apple-muted font-bold text-xs uppercase">Descrição da Despesa</Label>
              <Input required placeholder="Ex: Compra de mercadorias, Aluguel..." className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-red-500/20 shadow-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-apple-muted font-bold text-xs uppercase">Valor (R$)</Label>
                <Input required placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-red-500 shadow-sm" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-apple-muted font-bold text-xs uppercase">Vencimento</Label>
                <Input required type="date" className="bg-apple-offWhite border-apple-border h-12 rounded-xl text-apple-black font-semibold shadow-sm" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-apple-muted font-bold text-xs uppercase">Categoria</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="focus:bg-apple-light">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <button type="submit" disabled={saving} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={20} /> : "SALVAR DESPESA"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Expenses;