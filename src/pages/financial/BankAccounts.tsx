"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Landmark, Plus, Loader2, Trash2, Wallet, Building, Edit2, Upload, History, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ImportStatementModal from '@/components/financial/ImportStatementModal';
import { Link, useNavigate } from 'react-router-dom';

const BankAccounts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [importModal, setImportModal] = useState({ isOpen: false, accountId: '', accountName: '' });
  const [formData, setFormData] = useState({ name: '', type: 'corrente', balance: '0' });

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: dbAccounts } = await supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      
      if (!dbAccounts) return;

      // Buscar saldo da API Woovi se houver conta do tipo swipy
      const hasSwipy = dbAccounts.some(acc => acc.type === 'swipy');
      let apiBalance = 0;

      if (hasSwipy) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/woovi-wallet?action=balance`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const apiData = await response.json();
        if (apiData.balance) {
          apiBalance = apiData.balance.total / 100;
        }
      }

      const enriched = dbAccounts.map(acc => ({
        ...acc,
        balance: acc.type === 'swipy' ? apiBalance : acc.balance
      }));

      setAccounts(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const balanceNum = parseFloat(formData.balance.replace(',', '.'));
      const payload = { 
        user_id: user?.id, 
        name: formData.name, 
        type: formData.type, 
        balance: formData.type === 'swipy' ? 0 : (isNaN(balanceNum) ? 0 : balanceNum) 
      };
      
      if (editingId) await supabase.from('bank_accounts').update(payload).eq('id', editingId);
      else await supabase.from('bank_accounts').insert(payload);
      
      showSuccess("Conta salva!"); 
      setIsModalOpen(false); 
      fetchAccounts();
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string, type: string) => {
    if (type === 'swipy') return showError("A conta Swipy é protegida e não pode ser removida.");
    if (!confirm("Excluir conta bancária?")) return;
    await supabase.from('bank_accounts').delete().eq('id', id);
    fetchAccounts();
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
             <button onClick={() => { setEditingId(null); setFormData({ name: 'Swipy Conta', type: 'corrente', balance: '0' }); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm"><Plus size={18} /> Nova Conta</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : (
            accounts.map((acc) => {
              const isSwipy = acc.type === 'swipy';
              const isOpenFinance = acc.name.includes('(Open Finance)') || acc.name.includes('Belvo');
              
              return (
                <div key={acc.id} className={cn(
                  "bg-apple-white border rounded-[2rem] p-8 shadow-sm group relative overflow-hidden flex flex-col justify-between transition-all",
                  isSwipy ? "border-orange-500/20 bg-orange-50/5" : isOpenFinance ? "border-emerald-500/20 bg-emerald-50/5 shadow-emerald-500/5" : "border-apple-border"
                )}>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                        isSwipy ? "bg-orange-500 text-white border-orange-600" : isOpenFinance ? "bg-emerald-600 text-white border-emerald-600" : "bg-apple-offWhite text-apple-muted border-apple-border"
                      )}>
                        {isSwipy ? <ShieldCheck size={24} /> : <Landmark size={24} />}
                      </div>
                      
                      <div className="flex gap-1">
                        {!isSwipy ? (
                          <>
                            <button onClick={() => setImportModal({ isOpen: true, accountId: acc.id, accountName: acc.name })} className="p-2 text-apple-muted hover:text-orange-500" title="Importar Extrato"><Upload size={16} /></button>
                            <button onClick={() => { setEditingId(acc.id); setFormData({ name: acc.name, type: acc.type, balance: acc.balance.toString() }); setIsModalOpen(true); }} className="p-2 text-apple-muted hover:text-blue-500"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(acc.id, acc.type)} className="p-2 text-apple-muted hover:text-red-500"><Trash2 size={16} /></button>
                          </>
                        ) : (
                          <button 
                            onClick={() => navigate('/conta-swipy')}
                            className="text-[9px] font-black text-orange-600 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                          >
                            Ir para Conta Digital
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-apple-black flex items-center gap-2">
                      {acc.name}
                      {(isSwipy || isOpenFinance) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </h3>
                    <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest mt-1">
                      {isSwipy ? 'Instituição de Pagamento' : isOpenFinance ? 'Open Finance API' : acc.type}
                    </p>
                  </div>

                  <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
                    <p className="text-[10px] text-apple-muted font-bold uppercase tracking-widest mb-1">
                      {isSwipy ? 'Saldo Real (API)' : 'Saldo em Sistema'}
                    </p>
                    <p className={cn(
                      "text-2xl font-black",
                      isSwipy ? "text-orange-500" : isOpenFinance ? "text-emerald-600" : "text-apple-dark"
                    )}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)}
                    </p>
                    {isSwipy && <p className="text-[9px] text-orange-400 font-bold mt-1 uppercase">Atualizado via Woovi</p>}
                    {isOpenFinance && <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase flex items-center gap-1"><ShieldCheck size={12} /> Conectado via Belvo (Open Finance)</p>}
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
            <DialogTitle className="flex items-center gap-2 font-bold text-xl">
              <Landmark className="text-orange-500" /> {editingId ? 'Editar Conta' : 'Configurar Conta'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-apple-muted">Nome do Banco</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
            </div>
            
            {!editingId && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-apple-muted">Tipo de Conta</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v, name: v === 'swipy' ? 'Swipy Conta' : formData.name})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Dinheiro em Espécie (Caixa)</SelectItem>
                    <SelectItem value="swipy">Swipy (Conta Integrada do Sistema)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type !== 'swipy' ? (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-apple-muted">Saldo Inicial (R$)</Label>
                <Input value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
                 <ShieldCheck className="text-orange-500 shrink-0" size={18} />
                 <p className="text-[10px] text-orange-800 leading-relaxed font-medium">
                   O saldo desta conta será puxado automaticamente da sua carteira Woovi. Não é necessário informar saldo inicial.
                 </p>
              </div>
            )}
            
            <DialogFooter>
              <button type="submit" className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95">
                SALVAR CONTA
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportStatementModal {...importModal} onClose={() => setImportModal({ ...importModal, isOpen: false })} onSuccess={fetchAccounts} />
    </AppLayout>
  );
};

export default BankAccounts;