"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Landmark, Plus, Loader2, Trash2, Wallet, Building, Edit2, Upload, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ImportStatementModal from '@/components/financial/ImportStatementModal';
import { Link } from 'react-router-dom';

const BankAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [importModal, setImportModal] = useState({ isOpen: false, accountId: '', accountName: '' });

  const [formData, setFormData] = useState({ name: '', type: 'corrente', balance: '0' });

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (data) setAccounts(data);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const balanceNum = parseFloat(formData.balance.replace(',', '.'));
      const payload = { user_id: user?.id, name: formData.name, type: formData.type, balance: isNaN(balanceNum) ? 0 : balanceNum };
      if (editingId) await supabase.from('bank_accounts').update(payload).eq('id', editingId);
      else await supabase.from('bank_accounts').insert(payload);
      showSuccess("Conta salva!"); setIsModalOpen(false); fetchAccounts();
    } catch (err: any) { showError(err.message); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Contas Bancárias</h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão de saldos e conciliação de extratos.</p>
          </div>
          <div className="flex gap-3">
             <Link to="/financeiro/conciliacao" className="bg-apple-white border border-apple-border text-apple-black font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 hover:bg-apple-light shadow-sm">
                <History size={18} className="text-orange-500" /> Conciliação Pendente
             </Link>
             <button onClick={() => { setEditingId(null); setFormData({ name: '', type: 'corrente', balance: '0' }); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm"><Plus size={18} /> Nova Conta</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : accounts.map((acc) => (
            <div key={acc.id} className="bg-apple-white border border-apple-border rounded-[2rem] p-8 shadow-sm group relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-apple-offWhite text-apple-muted border-apple-border"><Landmark size={24} /></div>
                  <div className="flex gap-1">
                    <button onClick={() => setImportModal({ isOpen: true, accountId: acc.id, accountName: acc.name })} className="p-2 text-apple-muted hover:text-orange-500" title="Importar Extrato"><Upload size={16} /></button>
                    <button onClick={() => { setEditingId(acc.id); setFormData({ name: acc.name, type: acc.type, balance: acc.balance.toString() }); setIsModalOpen(true); }} className="p-2 text-apple-muted hover:text-blue-500"><Edit2 size={16} /></button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-apple-black">{acc.name}</h3>
                <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest mt-1">{acc.type}</p>
              </div>
              <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
                <p className="text-[10px] text-apple-muted font-bold uppercase tracking-widest mb-1">Saldo em Sistema</p>
                <p className="text-2xl font-black text-apple-dark">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite"><DialogTitle className="flex items-center gap-2 font-bold text-xl"><Landmark className="text-orange-500" /> Configurar Conta</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-xs font-bold uppercase text-apple-muted">Nome do Banco</Label><Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold uppercase text-apple-muted">Saldo Inicial (R$)</Label><Input value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" /></div>
            <DialogFooter><button type="submit" className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95">SALVAR CONTA</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportStatementModal {...importModal} onClose={() => setImportModal({ ...importModal, isOpen: false })} onSuccess={fetchAccounts} />
    </AppLayout>
  );
};

export default BankAccounts;