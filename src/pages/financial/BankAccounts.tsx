"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Landmark, Plus, Loader2, Trash2, Wallet, Building, RefreshCcw, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BankAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [swipyBalance, setSwipyBalance] = useState<{available: number, blocked: number, total: number} | null>(null);
  const [loadingSwipy, setLoadingSwipy] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'corrente',
    balance: '0'
  });

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) setAccounts(data);
    setLoading(false);
  };

  const fetchSwipyBalance = async () => {
    setLoadingSwipy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      if (data.balance) {
        setSwipyBalance({
          available: data.balance.available / 100,
          blocked: data.balance.blocked / 100,
          total: data.balance.total / 100
        });
      }
    } catch (err) { console.error(err); } finally { setLoadingSwipy(false); }
  };

  useEffect(() => {
    if (user) { fetchAccounts(); fetchSwipyBalance(); }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const balanceNum = formData.type === 'swipy' ? 0 : parseFloat(formData.balance.replace(',', '.'));
      const payload = { user_id: user?.id, name: formData.name, type: formData.type, balance: isNaN(balanceNum) ? 0 : balanceNum };
      
      const { error } = editingId 
        ? await supabase.from('bank_accounts').update(payload).eq('id', editingId)
        : await supabase.from('bank_accounts').insert(payload);

      if (error) throw error;
      showSuccess(editingId ? "Conta atualizada!" : "Conta adicionada!");
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir conta "${name}"?`)) return;
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (!error) { showSuccess("Conta excluída."); fetchAccounts(); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Contas Bancárias</h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão de saldos para conciliação financeira.</p>
          </div>
          <button 
            onClick={() => { setEditingId(null); setFormData({ name: '', type: 'corrente', balance: '0' }); setIsModalOpen(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Nova Conta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : accounts.length === 0 ? (
            <div className="col-span-full bg-apple-white border border-apple-border rounded-[2rem] p-12 text-center text-apple-muted opacity-60 font-medium">Nenhuma conta cadastrada.</div>
          ) : (
            accounts.map((acc) => {
              const isSwipy = acc.type === 'swipy';
              const displayBalance = isSwipy ? (swipyBalance?.total ?? 0) : acc.balance;
              return (
                <div key={acc.id} className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">{isSwipy ? <Wallet size={120} /> : <Building size={120} />}</div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-all", isSwipy ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-apple-offWhite text-apple-muted border-apple-border")}>
                        {isSwipy ? <Wallet size={24} /> : <Landmark size={24} />}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingId(acc.id); setFormData({ name: acc.name, type: acc.type, balance: acc.balance.toString().replace('.', ',') }); setIsModalOpen(true); }} className="p-2 text-apple-muted hover:text-blue-500"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(acc.id, acc.name)} className="p-2 text-apple-muted hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-apple-black">{acc.name}</h3>
                    <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest mt-1">{isSwipy ? 'Carteira Swipy' : acc.type}</p>
                  </div>
                  <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
                    <p className="text-[10px] text-apple-muted font-bold uppercase tracking-widest mb-1">Saldo Consolidado</p>
                    <p className="text-2xl font-black text-apple-dark">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayBalance)}</p>
                    {isSwipy && swipyBalance && (
                      <div className="flex gap-4 mt-3">
                        <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Disponível</p><p className="text-xs font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(swipyBalance.available)}</p></div>
                        <div className="bg-apple-offWhite px-2 py-1 rounded-lg border border-apple-border"><p className="text-[8px] font-black text-apple-muted uppercase tracking-tighter">Bloqueado</p><p className="text-xs font-bold text-apple-muted">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(swipyBalance.blocked)}</p></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="flex items-center gap-2 font-bold text-xl"><Landmark className="text-orange-500" /> {editingId ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-xs font-bold uppercase text-apple-muted">Nome da Instituição</Label><Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold uppercase text-apple-muted">Tipo de Conta</Label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  <SelectItem value="corrente">Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="swipy">Swipy Conta (Automática)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type !== 'swipy' && (
              <div className="space-y-2"><Label className="text-xs font-bold uppercase text-apple-muted">Saldo Atual (R$)</Label><Input value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" /></div>
            )}
            <DialogFooter><button type="submit" disabled={saving} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : "SALVAR CONFIGURAÇÃO"}</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default BankAccounts;