"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { 
  Search, 
  Loader2, 
  Building2, 
  User, 
  ShieldCheck, 
  Settings2,
  Users,
  Save,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/integrations/supabase/auth';

const UserManagement = () => {
  const { profile: myProfile, refreshProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editData, setEditData] = useState({
    company: '',
    full_name: '',
    status: '',
    system_role: '',
    woovi_api_key: '',
    plan_id: 'none',
    accountant_id: 'none'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (profError) throw profError;

      const [chargesRes, customersRes, plansRes] = await Promise.all([
        supabase.from('charges').select('user_id, amount, status'),
        supabase.from('customers').select('user_id'),
        supabase.from('system_plans').select('*')
      ]);

      if (profiles) {
        const enrichedUsers = profiles.map(u => {
          const userCharges = chargesRes.data?.filter(c => c.user_id === u.id) || [];
          const tpv = userCharges.filter(c => c.status === 'pago').reduce((acc, curr) => acc + Number(curr.amount), 0);
          const clientCount = customersRes.data?.filter(c => c.user_id === u.id).length || 0;
          const plan = plansRes.data?.find(p => p.id === u.plan_id);
          
          return { ...u, tpv, clientCount, plan_name: plan?.name || 'Básico' };
        });
        setUsers(enrichedUsers);
      }
      
      if (plansRes.data) setPlans(plansRes.data);
      
    } catch (err: any) {
      console.error("Erro Admin:", err.message);
      showError("Erro ao carregar dados administrativos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const accountants = useMemo(() => users.filter(u => u.system_role === 'Contador'), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' ? true : u.system_role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

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

  const handleSaveUser = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          company: editData.company,
          full_name: editData.full_name,
          status: editData.status,
          system_role: editData.system_role,
          woovi_api_key: editData.woovi_api_key,
          plan_id: editData.plan_id === 'none' ? null : editData.plan_id,
          accountant_id: editData.accountant_id === 'none' ? null : editData.accountant_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      showSuccess("Usuário atualizado com sucesso!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!loading && !myProfile?.is_admin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
           <Lock size={48} className="text-red-500 opacity-20" />
           <h2 className="text-2xl font-bold">Acesso Restrito ao Admin</h2>
           <button onClick={() => { refreshProfile(); fetchData(); }} className="bg-zinc-800 px-6 py-3 rounded-xl flex items-center gap-2 font-bold"><RefreshCw size={18} /> Atualizar Perfil</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
               <ShieldCheck className="text-orange-500" size={32} />
               Controle de Parceiros e Lojistas
            </h2>
            <p className="text-zinc-500 font-medium">Gestão de acessos, planos e hierarquia de contadores.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <Input 
                placeholder="Pesquisar empresa ou nome..." 
                className="bg-zinc-900 border-zinc-800 pl-11 h-14 rounded-2xl shadow-xl"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 h-14 w-56 rounded-2xl">
                 <div className="flex items-center gap-2">
                    <Filter size={16} /> 
                    <SelectValue placeholder="Filtrar Cargo" />
                 </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                 <SelectItem value="all">Todos os Cargos</SelectItem>
                 <SelectItem value="Admin">Lojistas (Dono)</SelectItem>
                 <SelectItem value="Contador">Contadores / Parceiros</SelectItem>
              </SelectContent>
           </Select>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-800">
              <tr>
                <th className="px-8 py-6">Entidade / Responsável</th>
                <th className="px-8 py-6">Tipo / Plano</th>
                <th className="px-8 py-6">Gestor (Contador)</th>
                <th className="px-8 py-6">Performance</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={32} /></td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/20 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center border",
                        u.system_role === 'Contador' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                      )}>
                        {u.system_role === 'Contador' ? <GraduationCap size={22} /> : <Building2 size={22} />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-zinc-100 truncate">{u.company || 'Pessoa Física'}</p>
                        <p className="text-[11px] text-zinc-500 truncate font-medium">{u.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                        u.system_role === 'Contador' ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"
                      )}>
                        {u.system_role}
                      </span>
                      {u.system_role !== 'Contador' && <span className="text-[10px] font-bold text-zinc-600">{u.plan_name}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {u.accountant_id ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                        <GraduationCap size={14} className="text-blue-500" />
                        {users.find(acc => acc.id === u.accountant_id)?.full_name || 'N/A'}
                      </div>
                    ) : u.system_role === 'Contador' ? (
                       <span className="text-[10px] text-emerald-500 font-black uppercase">Canal de Parceria</span>
                    ) : (
                      <span className="text-[10px] text-zinc-700 italic">Sem Contador</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-zinc-100">{currency.format(u.tpv || 0)}</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase">{u.clientCount} clientes</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => handleOpenEdit(u)} className="p-2.5 bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 rounded-xl text-zinc-400 transition-all border border-zinc-700">
                      <Settings2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[500px] p-0 rounded-[2.5rem] overflow-hidden">
           <DialogHeader className="p-8 border-b border-zinc-800 bg-zinc-950/30">
              <DialogTitle className="text-xl font-black flex items-center gap-3">
                <Settings2 className="text-orange-500" /> Governança de Perfil
              </DialogTitle>
           </DialogHeader>
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500">Nome Responsável</Label>
                  <Input value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500">Tipo de Usuário</Label>
                  <Select value={editData.system_role} onValueChange={v => setEditData({...editData, system_role: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                       <SelectItem value="Admin">Lojista (Dono)</SelectItem>
                       <SelectItem value="Contador">Contador / Parceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editData.system_role !== 'Contador' && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500">Vincular a um Contador</Label>
                  <Select value={editData.accountant_id} onValueChange={v => setEditData({...editData, accountant_id: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                      <SelectValue placeholder="Selecione o parceiro..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="none">Nenhum (Venda Direta)</SelectItem>
                      {accountants.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.full_name} ({acc.company || 'PF'})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2 pt-4 border-t border-zinc-800">
                 <Label className="text-[10px] uppercase font-bold text-zinc-500">Status da Conta</Label>
                 <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente de KYC</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </div>
           <DialogFooter className="p-8 border-t border-zinc-800 bg-zinc-950/50">
              <button disabled={updating} onClick={handleSaveUser} className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} ATUALIZAR ACESSOS
              </button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;