"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  ArrowUpRight, Plus, Loader2, Trash2, Calendar, CheckCircle2, 
  Building, Tag, Edit2, Paperclip, Eye, CalendarDays, User, Layers, Building2,
  X, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setDate(1);
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
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null); // Novo estado para o modal de pagamento

  const [formData, setFormData] = useState({
    description: '', 
    amount: '', 
    categoryId: '', 
    dueDate: new Date().toISOString().split('T')[0],
    supplierId: 'none',
    receiptUrl: ''
  });

  const [payFormData, setPayFormData] = useState({
    accountId: ''
  });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const [expRes, accRes, suppRes, catRes] = await Promise.all([
      supabase.from('expenses').select('*, bank_accounts(name), chart_of_accounts(name), suppliers(name)').eq('user_id', user.id).gte('due_date', startDate).lte('due_date', endDate).order('due_date', { ascending: true }),
      supabase.from('bank_accounts').select('id, name').eq('user_id', user.id),
      supabase.from('suppliers').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('chart_of_accounts').select('id, name').eq('user_id', user.id).eq('type', 'expense').order('name')
    ]);

    if (expRes.data) {
      const today = new Date().toISOString().split('T')[0];
      setExpenses(expRes.data.map(exp => ({
        ...exp,
        status: (exp.status === 'pendente' && exp.due_date < today) ? 'atrasado' : exp.status
      })));
    }
    if (accRes.data) setAccounts(accRes.data);
    if (suppRes.data) setSuppliers(suppRes.data);
    if (catRes.data) {
      setCategories(catRes.data);
      if (!formData.categoryId && catRes.data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: catRes.data[0].id }));
      }
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, selectedMonth]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      description: '', 
      amount: '', 
      categoryId: categories[0]?.id || '', 
      dueDate: new Date().toISOString().split('T')[0],
      supplierId: 'none',
      receiptUrl: ''
    });
    setReceiptFile(null);
    setIsModalOpen(true);
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFormData.accountId) return showError("Selecione uma conta bancária.");
    
    setActionLoading('pay');
    try {
      // Lógica de upload do comprovante de pagamento
      let finalReceiptUrl = selectedExpense.receipt_url; // Mantém o que já tinha se não mandar novo
      
      if (payReceiptFile) {
        const fileExt = payReceiptFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, payReceiptFile, { upsert: false });
        
        if (uploadError) {
           const { error: fallbackError } = await supabase.storage.from('customer_documents').upload(`receipts/${fileName}`, payReceiptFile);
           if (fallbackError) throw new Error("Erro ao fazer upload do comprovante. Contate o suporte.");
           const { data } = supabase.storage.from('customer_documents').getPublicUrl(`receipts/${fileName}`);
           finalReceiptUrl = data.publicUrl;
        } else {
           const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
           finalReceiptUrl = data.publicUrl;
        }
      }

      // Debita o saldo da conta selecionada
      const { data: account } = await supabase.from('bank_accounts').select('balance').eq('id', payFormData.accountId).single();
      
      if (account) {
        await supabase.from('bank_accounts').update({ 
          balance: Number(account.balance || 0) - Number(selectedExpense.amount || 0) 
        }).eq('id', payFormData.accountId);
      }

      // Atualiza a despesa
      await supabase.from('expenses').update({ 
        status: 'pago', 
        bank_account_id: payFormData.accountId,
        receipt_url: finalReceiptUrl
      }).eq('id', selectedExpense.id);

      showSuccess("Pagamento confirmado e saldo atualizado!");
      setIsPayModalOpen(false);
      setPayReceiptFile(null);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalReceiptUrl = formData.receiptUrl;
      
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Tenta enviar para o bucket receipts. Se não existir, tenta no customer_documents
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile, { upsert: false });
        
        if (uploadError) {
           const { error: fallbackError } = await supabase.storage.from('customer_documents').upload(`receipts/${fileName}`, receiptFile);
           if (fallbackError) throw new Error("Erro ao fazer upload do boleto. Contate o suporte.");
           const { data } = supabase.storage.from('customer_documents').getPublicUrl(`receipts/${fileName}`);
           finalReceiptUrl = data.publicUrl;
        } else {
           const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
           finalReceiptUrl = data.publicUrl;
        }
      }

      const amountNum = parseFloat(formData.amount.replace(',', '.'));
      const payload: any = {
        description: formData.description,
        amount: isNaN(amountNum) ? 0 : amountNum,
        category_id: formData.categoryId,
        due_date: formData.dueDate,
        supplier_id: formData.supplierId === 'none' ? null : formData.supplierId,
        receipt_url: finalReceiptUrl
      };

      if (editingId) {
        await supabase.from('expenses').update(payload).eq('id', editingId);
        showSuccess("Despesa atualizada!");
      } else {
        await supabase.from('expenses').insert({ user_id: user?.id, ...payload });
        showSuccess("Despesa cadastrada!");
      }

      setIsModalOpen(false);
      setReceiptFile(null);
      fetchData();
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div><h2 className="text-3xl font-bold tracking-tight text-apple-black">Contas a Pagar</h2><p className="text-apple-muted mt-1 font-medium">Controle suas obrigações categorizadas no plano de contas.</p></div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[180px] bg-apple-white border-apple-border h-11 rounded-xl text-orange-500 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">{monthOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
            <button onClick={openAddModal} className="w-full sm:w-auto justify-center bg-red-500 hover:bg-red-600 text-white font-semibold flex-1 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"><Plus size={18} /> Nova Despesa</button>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                  <tr><th className="px-8 py-5">Descrição / Fornecedor</th><th className="px-8 py-5">Vencimento</th><th className="px-8 py-5">Valor</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={5} className="py-20 text-center text-apple-muted italic">Nenhuma despesa para o período selecionado.</td></tr>
                  ) : expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-apple-black">{exp.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] text-apple-muted uppercase font-black"><Layers size={10} className="text-orange-500" /> {exp.chart_of_accounts?.name || 'Geral'}</span>
                          {exp.suppliers && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-blue-600 uppercase font-black"><Building2 size={10} /> {exp.suppliers.name}</span>
                          )}
                          {exp.receipt_url && (
                            <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase font-black hover:bg-emerald-100 transition-colors">
                              <Paperclip size={10} /> Anexo
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-apple-dark font-medium">{new Date(exp.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-5 text-sm font-black text-apple-black">{currencyFormatter.format(exp.amount)}</td>
                      <td className="px-8 py-5">
                         <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", exp.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{exp.status}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-1">
                            {exp.status !== 'pago' && (
                              <button 
                                onClick={() => { 
                                  setSelectedExpense(exp); 
                                  setPayFormData({ accountId: '' }); 
                                  setPayReceiptFile(null); // Reseta o file state do pagamento
                                  setIsPayModalOpen(true); 
                                }}
                                className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Marcar como Pago"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            )}
                            <button onClick={() => { 
                              setEditingId(exp.id); 
                              setFormData({ 
                                description: exp.description, 
                                amount: exp.amount.toString().replace('.', ','), 
                                categoryId: exp.category_id || '', 
                                dueDate: exp.due_date, 
                                supplierId: exp.supplier_id || 'none',
                                receiptUrl: exp.receipt_url || ''
                              }); 
                              setReceiptFile(null);
                              setIsModalOpen(true); 
                            }} className="p-2 text-apple-muted hover:text-blue-500"><Edit2 size={16}/></button>
                            <button onClick={() => { if(confirm('Excluir?')) supabase.from('expenses').delete().eq('id', exp.id).then(() => fetchData()); }} className="p-2 text-apple-muted hover:text-red-500"><Trash2 size={16}/></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border">
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={24} /> Baixa de Despesa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkAsPaid} className="p-8 space-y-6">
            <div className="bg-red-50 border border-red-100 p-6 rounded-3xl text-center">
              <p className="text-[10px] font-black text-red-600 uppercase mb-1">Valor a ser pago</p>
              <p className="text-3xl font-black text-red-600">
                {selectedExpense && currencyFormatter.format(selectedExpense.amount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-apple-muted uppercase">Conta de Origem</Label>
              <Select value={payFormData.accountId} onValueChange={(val) => setPayFormData({ accountId: val })}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                  <SelectValue placeholder="De onde sairá o dinheiro?" />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UPLOAD DE COMPROVANTE NA BAIXA */}
            <div className="space-y-2 pt-2 border-t border-apple-border">
              <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-2">
                <Paperclip size={12} className="text-emerald-500" /> Anexar Comprovante (Opcional)
              </Label>
              <div className="relative">
                <Input 
                  type="file" 
                  id="pay-file-upload"
                  onChange={(e) => setPayReceiptFile(e.target.files?.[0] || null)} 
                  className="bg-apple-offWhite border-apple-border h-12 rounded-xl text-xs p-3 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-emerald-50 file:text-emerald-600 hover:file:bg-emerald-100" 
                  accept="image/*,application/pdf" 
                />
                {payReceiptFile && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      setPayReceiptFile(null); 
                      const el = document.getElementById('pay-file-upload') as HTMLInputElement; 
                      if(el) el.value = ''; 
                    }} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <button 
                type="submit" 
                disabled={!payFormData.accountId || actionLoading === 'pay'} 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl disabled:opacity-50"
              >
                {actionLoading === 'pay' ? <Loader2 className="animate-spin mx-auto" /> : "CONFIRMAR PAGAMENTO"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 border border-red-100"><ArrowUpRight size={20} /></div>
              {editingId ? "Ajustar Despesa" : "Nova Conta a Pagar"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Gaveta do Plano de Contas</Label>
              <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-2">
                <Building2 size={12} className="text-blue-500" /> Fornecedor (Opcional)
              </Label>
              <Select value={formData.supplierId} onValueChange={v => setFormData({...formData, supplierId: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione o fornecedor..." /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  <SelectItem value="none">Nenhum / Despesa Diversa</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Descrição</Label><Input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" /></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Valor (R$)</Label><Input required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-red-500" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Vencimento</Label><Input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" /></div>
            </div>

            {/* UPLOAD DE BOLETO/NOTA (AO CRIAR/EDITAR) */}
            <div className="space-y-2 pt-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-2">
                <Paperclip size={12} className="text-emerald-500" /> Boleto ou Nota (Opcional)
              </Label>
              
              {formData.receiptUrl && !receiptFile ? (
                 <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <a href={formData.receiptUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-2 truncate pr-4">
                       <FileText size={16} className="shrink-0" /> Ver anexo salvo
                    </a>
                    <button type="button" onClick={() => setFormData({...formData, receiptUrl: ''})} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors shrink-0">
                       <X size={16} />
                    </button>
                 </div>
              ) : (
                 <div className="relative">
                   <Input 
                     type="file" 
                     id="file-upload"
                     onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} 
                     className="bg-apple-offWhite border-apple-border h-12 rounded-xl text-xs p-3 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100" 
                     accept="image/*,application/pdf" 
                   />
                   {receiptFile && (
                     <button 
                       type="button" 
                       onClick={() => { 
                         setReceiptFile(null); 
                         const el = document.getElementById('file-upload') as HTMLInputElement; 
                         if(el) el.value = ''; 
                       }} 
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"
                     >
                       <X size={14} />
                     </button>
                   )}
                 </div>
              )}
            </div>
            
            <DialogFooter className="pt-2"><button type="submit" disabled={saving} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">{saving ? <Loader2 className="animate-spin mx-auto" /> : "REGISTRAR DESPESA"}</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Expenses;