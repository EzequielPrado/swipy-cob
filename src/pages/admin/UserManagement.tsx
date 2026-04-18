"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Search, Loader2, Building2, ShieldCheck, Settings2, GraduationCap, UserPlus, Mail, User, ShieldAlert, Briefcase, CheckCircle2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [accountants, setAccountants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({ 
    company: '', 
    full_name: '', 
    status: '', 
    system_role: '', 
    woovi_api_key: '', 
    petta_api_key: '',
    petta_secret: '',
    preferred_provider: 'woovi',
    plan_id: 'none', 
    accountant_id: 'none' 
  });

  const [createData, setCreateData] = useState({
    email: '',
    full_name: '',
    company: '',
    system_role: 'Admin'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, plansRes, accRes] = await Promise.all([
        supabase.from('profiles').select('*, system_plans(name)').order('updated_at', { ascending: false }),
        supabase.from('system_plans').select('*'),
        supabase.from('profiles').select('id, full_name, company').eq('system_role', 'Contador')
      ]);

      if (profilesRes.data) setUsers(profilesRes.data);
      if (plansRes.data) setPlans(plansRes.data);
      if (accRes.data) setAccountants(accRes.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/invite-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          email: createData.email,
          fullName: createData.full_name,
          systemRole: createData.system_role,
          companyName: createData.company
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      showSuccess(`Convite de acesso enviado para ${createData.email}!`);
      setIsCreateModalOpen(false);
      setCreateData({ email: '', full_name: '', company: '', system_role: 'Admin' });
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdating(true);
    
    try {
      const payload = {
        company: editData.company,
        full_name: editData.full_name,
        status: editData.status,
        system_role: editData.system_role,
        woovi_api_key: editData.woovi_api_key,
        petta_api_key: editData.petta_api_key,
        petta_secret: editData.petta_secret,
        preferred_provider: editData.preferred_provider,
        plan_id: editData.plan_id === 'none' ? null : editData.plan_id,
        accountant_id: editData.accountant_id === 'none' ? null : editData.accountant_id,
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', selectedUser.id);
      if (error) throw error;

      showSuccess('Usuário atualizado com sucesso!');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = users.filter(u => 
    (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <ShieldCheck className="text-orange-500" size={32} /> Governança SaaS
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão global de acessos e convites do sistema.</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus size={18} /> CONVIDAR USUÁRIO
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <Input placeholder="Nome, empresa ou e-mail..." className="bg-apple-white border-apple-border pl-11 h-12 rounded-2xl shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-6">Entidade / Responsável</th>
                  <th className="px-8 py-6">Papel no Sistema</th>
                  <th className="px-8 py-6">Vínculo / Plano</th>
                  <th className="px-8 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr> : filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-apple-light transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-apple-offWhite flex items-center justify-center border text-apple-muted">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-apple-black">{u.company || 'Pessoa Física'}</p>
                          <p className="text-[10px] text-apple-muted font-bold">{u.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-apple-offWhite text-apple-dark border-apple-border">
                        {u.system_role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] text-orange-500 font-bold uppercase">{u.system_plans?.name || 'SaaS Gratuito'}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => { setSelectedUser(u); setEditData({ company: u.company || '', full_name: u.full_name || '', status: u.status || 'pending', system_role: u.system_role || 'Admin', woovi_api_key: u.woovi_api_key || '', petta_api_key: u.petta_api_key || '', petta_secret: u.petta_secret || '', preferred_provider: u.preferred_provider || 'woovi', plan_id: u.plan_id || 'none', accountant_id: u.accountant_id || 'none' }); setIsEditModalOpen(true); }} className="p-2.5 bg-apple-offWhite hover:bg-orange-500 hover:text-white rounded-xl text-apple-muted transition-all border border-apple-border shadow-sm">
                        <Settings2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO (CONVITE) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <Mail className="text-orange-500" /> Enviar Convite de Acesso
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Perfil de Acesso</Label>
              <Select value={createData.system_role} onValueChange={v => setCreateData({...createData, system_role: v})}>
                <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl font-bold border-apple-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  <SelectItem value="Admin">Lojista (Dono)</SelectItem>
                  <SelectItem value="Contador">Contador Parceiro</SelectItem>
                  <SelectItem value="Vendas">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">E-mail do Convidado</Label>
              <Input required type="email" value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} className="bg-apple-offWhite h-12 rounded-xl font-bold border-apple-border" placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Nome Completo</Label>
              <Input required value={createData.full_name} onChange={e => setCreateData({...createData, full_name: e.target.value})} className="bg-apple-offWhite h-12 rounded-xl font-bold border-apple-border" placeholder="Nome do Usuário" />
            </div>
            <button type="submit" disabled={updating} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2">
              {updating ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> DISPARAR E-MAIL</>}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE LOJISTA / USUÁRIO */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <Settings2 className="text-orange-500" /> Editar Acesso e Plano
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-apple-muted">Nome / Razão Social</Label>
                <Input value={editData.company} onChange={e => setEditData({...editData, company: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-apple-muted">Responsável</Label>
                <Input value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-apple-muted">Status</Label>
                <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                  <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl border-apple-border font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-apple-muted">Papel (Role)</Label>
                <Select value={editData.system_role} onValueChange={v => setEditData({...editData, system_role: v})}>
                  <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl border-apple-border font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    <SelectItem value="Admin">Admin (Lojista)</SelectItem>
                    <SelectItem value="Contador">Contador Parceiro</SelectItem>
                    <SelectItem value="Vendas">Vendas</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Estoque">Estoque</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Vincular a um Plano</Label>
              <Select value={editData.plan_id} onValueChange={v => setEditData({...editData, plan_id: v})}>
                <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl border-apple-border font-bold"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  <SelectItem value="none">Sem Plano / Free Trial</SelectItem>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Contador Responsável</Label>
              <Select value={editData.accountant_id} onValueChange={v => setEditData({...editData, accountant_id: v})}>
                <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl border-apple-border font-bold"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  <SelectItem value="none">Sem Contador Vinculado</SelectItem>
                  {accountants.map(a => <SelectItem key={a.id} value={a.id}>{a.company || a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t border-apple-border">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Configurações de Banking (Provedores)</Label>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold">Provedor Ativo (Para novas cobranças)</Label>
                <Select value={editData.preferred_provider} onValueChange={v => setEditData({...editData, preferred_provider: v})}>
                  <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl border-apple-border font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    <SelectItem value="woovi">Woovi (OpenPix)</SelectItem>
                    <SelectItem value="petta">Petta Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Woovi API Key</Label>
                  <Input type="password" value={editData.woovi_api_key} onChange={e => setEditData({...editData, woovi_api_key: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" placeholder="Token Woovi" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Petta API Key</Label>
                  <Input type="password" value={editData.petta_api_key} onChange={e => setEditData({...editData, petta_api_key: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" placeholder="Token Petta" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Petta Client Secret</Label>
                <Input type="password" value={editData.petta_secret} onChange={e => setEditData({...editData, petta_secret: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" placeholder="Secret Petta" />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-apple-border">
              <button type="submit" disabled={updating} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2">
                {updating ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> SALVAR ALTERAÇÕES</>}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;