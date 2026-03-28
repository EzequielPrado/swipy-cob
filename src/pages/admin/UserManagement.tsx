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
  ArrowRight,
  Save,
  Key
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [editData, setEditData] = useState({
    company: '',
    full_name: '',
    status: '',
    woovi_api_key: '',
    plan_id: 'none'
  });
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        *,
        system_plans(*),
        merchant:merchant_id(company, full_name)
      `)
      .order('updated_at', { ascending: false });

    const { data: plansData } = await supabase.from('system_plans').select('*').eq('is_active', true);

    if (profiles) setUsers(profiles);
    if (plansData) setPlans(plansData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditData({
      company: user.company || '',
      full_name: user.full_name || '',
      status: user.status || 'pending',
      woovi_api_key: user.woovi_api_key || '',
      plan_id: user.plan_id || 'none'
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
          woovi_api_key: editData.woovi_api_key,
          plan_id: editData.plan_id === 'none' ? null : editData.plan_id,
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Empresas & Usuários</h2>
            <p className="text-zinc-400 mt-1">Configure tokens, planos e acessos dos lojistas.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input 
              placeholder="Buscar por nome ou empresa..." 
              className="bg-zinc-900 border-zinc-800 pl-10 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Usuário / Empresa</th>
                  <th className="px-6 py-5">Assinatura / Plano</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          u.merchant_id ? "bg-zinc-900 border-zinc-800 text-zinc-600" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                        )}>
                          {u.merchant_id ? <Users size={18} /> : <Building2 size={20} />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-zinc-100 truncate">{u.full_name}</p>
                          <p className="text-[10px] text-zinc-500 truncate uppercase font-mono">{u.company || 'PJ não informada'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.merchant_id ? (
                        <div className="flex flex-col gap-1">
                           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded w-fit">Colaborador</span>
                           <p className="text-[10px] text-zinc-400">Vinculado a <span className="text-orange-500">{u.merchant?.company || u.merchant?.full_name}</span></p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                           <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded w-fit">Lojista (Dono)</span>
                           <p className="text-[10px] text-zinc-500 font-bold">{u.system_plans?.name || 'Aguardando Plano'}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        u.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      )}>{u.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenEdit(u)} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all opacity-0 group-hover:opacity-100">
                        <Settings2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[500px] p-0 rounded-[2rem] overflow-hidden">
           <DialogHeader className="p-8 border-b border-zinc-800 bg-zinc-950/30">
              <DialogTitle className="text-xl font-black">Configurações do Cliente</DialogTitle>
           </DialogHeader>
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-bold">Responsável</Label>
                  <Input value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-bold">Empresa (Branding)</Label>
                  <Input value={editData.company} onChange={e => setEditData({...editData, company: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" />
                </div>
              </div>
              
              {!selectedUser?.merchant_id && (
                <>
                  <div className="space-y-2">
                    <Label className="text-zinc-500 uppercase text-[10px] font-bold flex items-center gap-2">
                      <Key size={12} className="text-orange-500" /> Token Woovi (AppID)
                    </Label>
                    <Input 
                      value={editData.woovi_api_key} 
                      onChange={e => setEditData({...editData, woovi_api_key: e.target.value})} 
                      placeholder="Ex: app_xxxxxxxxxxxx"
                      className="bg-zinc-950 border-zinc-800 h-12 rounded-xl font-mono text-xs" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-500 uppercase text-[10px] font-bold">Plano de Assinatura</Label>
                    <Select value={editData.plan_id} onValueChange={v => setEditData({...editData, plan_id: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="none">Sem Plano Ativo</SelectItem>
                        {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (R$ {p.price})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2 pt-4 border-t border-zinc-800">
                 <Label className="text-zinc-500 uppercase text-[10px] font-bold">Status da Conta</Label>
                 <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="active">Ativo (Liberado)</SelectItem>
                      <SelectItem value="pending">Pendente (Aguardando)</SelectItem>
                      <SelectItem value="suspended">Suspenso (Bloqueado)</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </div>
           <DialogFooter className="p-8 border-t border-zinc-800 bg-zinc-950/50">
              <button disabled={updating} onClick={handleSaveUser} className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10">
                {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SALVAR CONFIGURAÇÕES
              </button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;