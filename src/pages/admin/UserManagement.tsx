"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Search, Loader2, Building2, ShieldCheck, Settings2, GraduationCap, UserPlus, Mail, User, ShieldAlert, Briefcase } from 'lucide-react';
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
  
  // Modais
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({ 
    company: '', full_name: '', status: '', system_role: '', woovi_api_key: '', plan_id: 'none', accountant_id: 'none' 
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

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditData({ 
      company: user.company || '', 
      full_name: user.full_name || '', 
      status: user.status || 'pending', 
      system_role: user.system_role || 'Admin', 
      woovi_api_key: user.woovi_api_key || '', 
      plan_id: user.plan_id || 'none', 
      accountant_id: user.accountant_id || 'none' 
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      // Se for funcionário ou contador, limpamos campos que são exclusivos de lojistas (Admin)
      const isMerchant = editData.system_role === 'Admin';
      
      await supabase.from('profiles').update({ 
        status: editData.status, 
        system_role: editData.system_role,
        woovi_api_key: isMerchant ? editData.woovi_api_key : null, 
        plan_id: isMerchant ? (editData.plan_id === 'none' ? null : editData.plan_id) : null, 
        accountant_id: isMerchant ? (editData.accountant_id === 'none' ? null : editData.accountant_id) : null, 
        updated_at: new Date().toISOString() 
      }).eq('id', selectedUser.id);
      
      showSuccess("Usuário atualizado!"); 
      setIsEditModalOpen(false); 
      fetchData();
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setUpdating(false); 
    }
  };

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

      showSuccess(`${createData.system_role} cadastrado! Senha temp: ${result.tempPassword}`);
      setIsCreateModalOpen(false);
      setCreateData({ email: '', full_name: '', company: '', system_role: 'Admin' });
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'Contador') return <GraduationCap size={20} />;
    if (role === 'Admin') return <Building2 size={20} />;
    return <User size={20} />;
  };

  const filtered = users.filter(u => 
    (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (u.system_role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <ShieldCheck className="text-orange-500" size={32} /> Governança SaaS
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão global de acessos, lojistas e colaboradores.</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus size={18} /> CADASTRAR USUÁRIO
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <Input placeholder="Nome, empresa ou cargo..." className="bg-apple-white border-apple-border pl-11 h-12 rounded-2xl shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
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
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border", 
                        u.system_role === 'Contador' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                        u.system_role === 'Admin' ? "bg-orange-50 text-orange-600 border-orange-100" :
                        "bg-apple-offWhite text-apple-muted border-apple-border"
                      )}>
                        {getRoleIcon(u.system_role)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-apple-black">{u.company || 'Pessoa Física'}</p>
                        <p className="text-[10px] text-apple-muted font-bold">{u.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", 
                      u.system_role === 'Contador' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                      u.system_role === 'Admin' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      "bg-apple-offWhite text-apple-dark border-apple-border"
                    )}>
                      {u.system_role === 'Admin' ? 'Lojista Master' : u.system_role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      {u.system_role === 'Admin' ? (
                        <>
                          <span className="text-[10px] text-orange-500 font-bold uppercase">Plano: {u.system_plans?.name || 'SaaS Gratuito'}</span>
                          {u.accountant_id && <span className="text-[9px] text-apple-muted font-bold flex items-center gap-1"><GraduationCap size={10} /> Auditoria Contábil Ativa</span>}
                        </>
                      ) : u.system_role === 'Contador' ? (
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Auditor de Carteira</span>
                      ) : (
                        <span className="text-[10px] text-apple-muted font-bold uppercase">Membro de Equipe</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => handleOpenEdit(u)} className="p-2.5 bg-apple-offWhite hover:bg-orange-500 hover:text-white rounded-xl text-apple-muted transition-all border border-apple-border shadow-sm">
                      <Settings2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
             <DialogTitle className="text-xl font-black flex items-center gap-3">
               <ShieldAlert className="text-orange-500" /> Ajustar Privilégios
             </DialogTitle>
             <p className="text-xs text-apple-muted font-bold mt-2">Editando: {selectedUser?.company || selectedUser?.full_name}</p>
           </DialogHeader>
           
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-apple-muted">Cargo Operacional</Label>
                   <Select value={editData.system_role} onValueChange={v => setEditData({...editData, system_role: v})}>
                      <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">
                        <SelectItem value="Admin">Lojista (Dono da Empresa)</SelectItem>
                        <SelectItem value="Contador">Contador Parceiro (Auditor)</SelectItem>
                        <SelectItem value="Vendas">Vendedor (CRM/PDV)</SelectItem>
                        <SelectItem value="Financeiro">Financeiro (Caixa/Contas)</SelectItem>
                        <SelectItem value="Estoque">Estoque (Inventário/Fábrica)</SelectItem>
                        <SelectItem value="RH">RH (Folha/Time)</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-apple-muted">Situação da Conta</Label>
                   <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                      <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">
                        <SelectItem value="active">Conta Ativa</SelectItem>
                        <SelectItem value="pending">Aguardando Onboarding</SelectItem>
                        <SelectItem value="suspended">Acesso Bloqueado</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
              </div>

              {editData.system_role === 'Admin' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-apple-muted">Plano SaaS</Label>
                    <Select value={editData.plan_id} onValueChange={v => setEditData({...editData, plan_id: v})}>
                      <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">
                        <SelectItem value="none">Sem Plano / Free</SelectItem>
                        {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-apple-muted">Vincular Escritório Contábil</Label>
                    <Select value={editData.accountant_id} onValueChange={v => setEditData({...editData, accountant_id: v})}>
                      <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione o auditor..." /></SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">
                        <SelectItem value="none">Gestão Interna (Sem vínculo)</SelectItem>
                        {accountants.map(a => <SelectItem key={a.id} value={a.id}>{a.company || a.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-apple-border">
                    <Label className="text-[10px] uppercase font-black text-apple-muted">Token Woovi (AppID)</Label>
                    <Input value={editData.woovi_api_key} onChange={e => setEditData({...editData, woovi_api_key: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono text-xs" />
                  </div>
                </div>
              )}
              
              <DialogFooter className="pt-4">
                <button disabled={updating} onClick={handleSaveEdit} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95">
                  {updating ? <Loader2 className="animate-spin mx-auto" /> : "CONFIRMAR ALTERAÇÕES"}
                </button>
              </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CRIAÇÃO */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <UserPlus className="text-orange-500" /> Novo Usuário Master
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Perfil de Acesso</Label>
              <Select value={createData.system_role} onValueChange={v => setCreateData({...createData, system_role: v})}>
                <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  <SelectItem value="Admin">Lojista (Novo Cliente SaaS)</SelectItem>
                  <SelectItem value="Contador">Contador Parceiro (Auditor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted" size={16} />
                <Input required type="email" value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} className="bg-apple-offWhite pl-10 h-12 rounded-xl" placeholder="email@exemplo.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Nome do Responsável</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted" size={16} />
                <Input required value={createData.full_name} onChange={e => setCreateData({...createData, full_name: e.target.value})} className="bg-apple-offWhite pl-10 h-12 rounded-xl" placeholder="Nome Completo" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-apple-muted">Empresa / Escritório</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted" size={16} />
                <Input required value={createData.company} onChange={e => setCreateData({...createData, company: e.target.value})} className="bg-apple-offWhite pl-10 h-12 rounded-xl" placeholder="Nome da Empresa" />
              </div>
            </div>
            <button type="submit" disabled={updating} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95">
              {updating ? <Loader2 className="animate-spin mx-auto" /> : "CONCLUIR CADASTRO"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;