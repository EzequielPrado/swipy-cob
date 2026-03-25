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

  // Estados para integração com a API da Swipy (Woovi)
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
      
      if (!data.error && data.balance) {
        setSwipyBalance({
          available: data.balance.available / 100,
          blocked: data.balance.blocked / 100,
          total: data.balance.total / 100
        });
      }
    } catch (err) {
      console.error("Erro ao buscar saldo Swipy:", err);
    } finally {
      setLoadingSwipy(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchSwipyBalance();
    }
  }, [user]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'corrente', balance: '0' });
    setIsModalOpen(true);
  };

  const openEditModal = (acc: any) => {
    setEditingId(acc.id);
    setFormData({ 
      name: acc.name, 
      type: acc.type, 
      balance: acc.balance.toString().replace('.', ',') 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const isSwipy = formData.type === 'swipy';
      const balanceNum = isSwipy ? 0 : parseFloat(formData.balance.replace(',', '.'));
      
      if (editingId) {
        const { error } = await supabase.from('bank_accounts').update({
          name: formData.name,
          type: formData.type,
          balance: isNaN(balanceNum) ? 0 : balanceNum
        }).eq('id', editingId);
        if (error) throw error;
        showSuccess("Conta atualizada!");
      } else {
        const { error } = await supabase.from('bank_accounts').insert({
          user_id: user?.id,
          name: formData.name,
          type: formData.type,
          balance: isNaN(balanceNum) ? 0 : balanceNum
        });
        if (error) throw error;
        showSuccess("Conta bancária adicionada!");
      }

      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a conta "${name}"? Despesas atreladas a ela perderão a referência de pagamento.`)) return;
    
    try {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Conta excluída.");
      fetchAccounts();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contas Bancárias</h2>
            <p className="text-zinc-400 mt-1">Gerencie suas contas e carteiras para conciliação de despesas.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={18} /> Nova Conta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : accounts.length === 0 ? (
            <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
              <Landmark size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma conta cadastrada ainda.</p>
              <p className="text-xs mt-2">Adicione seu banco principal ou a Swipy Conta.</p>
            </div>
          ) : (
            accounts.map((acc) => {
              const isSwipy = acc.type === 'swipy' || acc.type === 'digital';
              const displayBalance = isSwipy ? (swipyBalance?.total ?? 0) : acc.balance;

              return (
                <div key={acc.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    {isSwipy ? <Wallet size={80} /> : <Building size={80} />}
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        isSwipy ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}>
                        {isSwipy ? <div className="font-bold text-lg">S</div> : <Landmark size={20} />}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                        <button onClick={() => openEditModal(acc)} className="p-1 text-zinc-500 hover:text-orange-400 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(acc.id, acc.name)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-100 relative z-10">{acc.name}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1 relative z-10">
                      {isSwipy ? 'Carteira Inteligente' : acc.type === 'poupanca' ? 'Conta Poupança' : 'Conta Corrente'}
                    </p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-zinc-800/50 relative z-10">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Saldo Total</p>
                      {isSwipy && (
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {loadingSwipy ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />} 
                          Integrado API
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-zinc-300">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayBalance)}
                    </p>

                    {isSwipy && swipyBalance !== null && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Disponível</p>
                          <p className="text-xs font-bold text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(swipyBalance.available)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Bloqueado</p>
                          <p className="text-xs font-bold text-zinc-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(swipyBalance.blocked)}
                          </p>
                        </div>
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
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="text-orange-500" size={20} />
              {editingId ? "Editar Conta" : "Adicionar Conta"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Nome da Conta ou Banco</Label>
              <Input 
                required
                placeholder="Ex: Itaú, Swipy Conta Principal..."
                className="bg-zinc-950 border-zinc-800 h-11"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Conta Poupança</SelectItem>
                  <SelectItem value="swipy">Swipy Conta (Automática)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.type !== 'swipy' && (
              <div className="space-y-2">
                <Label>Saldo (R$)</Label>
                <Input 
                  placeholder="0,00"
                  className="bg-zinc-950 border-zinc-800 h-11"
                  value={formData.balance}
                  onChange={(e) => setFormData({...formData, balance: e.target.value})}
                />
              </div>
            )}

            {formData.type === 'swipy' && (
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-xs text-orange-400 leading-relaxed italic">
                O saldo desta conta é sincronizado em tempo real com as suas cobranças recebidas pelo sistema.
              </div>
            )}

            <DialogFooter>
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-orange-500 text-zinc-950 font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : "Salvar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default BankAccounts;