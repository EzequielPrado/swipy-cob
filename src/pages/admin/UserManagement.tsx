"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Play, 
  Key, 
  Loader2, 
  Receipt,
  Building2,
  Package,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modais
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Estado do formulário de edição
  const [editData, setEditData] = useState({
    woovi_api_key: '',
    plan_id: 'none'
  });
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // Busca usuários e planos em paralelo
    const [profilesRes, plansRes] = await Promise.all([
      supabase.from('profiles').select('*, system_plans(name)').order('updated_at', { ascending: false }),
      supabase.from('system_plans').select('id, name').eq('is_active', true)
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    if (error) {
      showError("Falha na atualização: " + error.message);
      fetchData();
    } else {
      showSuccess(`Conta ${newStatus === 'active' ? 'aprovada' : 'suspensa'} com sucesso!`);
    }
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditData({
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
          woovi_api_key: editData.woovi_api_key,
          plan_id: editData.plan_id === 'none' ? null : editData.plan_id
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      showSuccess("Configurações do usuário atualizadas!");
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
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
            <p className="text-zinc-400 mt-1">Aprove contas, vincule planos e configure chaves de integração.</p>
          </div>
          <button onClick={fetchData} className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
            <Loader2 className={cn(loading && "animate-spin")} size={20} />
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[400px]">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Empresa / Usuário</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Plano Atual</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-semibold text-zinc-100 truncate">{u.company || 'Pessoa Física'}</p>
                          <p className="text-xs text-zinc-500 truncate">{u.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border shrink-0",
                        u.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        u.status === 'suspended' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                        "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      )}>
                        {u.status === 'pending' ? 'Aguardando' : u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <Package size={14} className={u.plan_id ? "text-orange-500" : "text-zinc-600"} />
                          <span className={cn("text-xs font-bold", u.plan_id ? "text-zinc-200" : "text-zinc-600 italic")}>
                            {u.system_plans?.name || 'Sem Plano'}
                          </span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 text-zinc-500 hover:text-orange-400 transition-colors" 
                          title="Configurações e Plano"
                        >
                          <Key size={16} />
                        </button>
                        
                        <button 
                          onClick={() => navigate(`/admin/transacoes/${u.id}`)}
                          className="p-2 text-zinc-500 hover:text-blue-400 transition-colors" 
                          title="Ver Transações"
                        >
                          <Receipt size={16} />
                        </button>

                        {u.status === 'pending' && (
                          <button 
                            onClick={() => handleStatusChange(u.id, 'active')}
                            className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors" 
                            title="Aprovar Conta"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}

                        {u.status === 'active' && !u.is_admin ? (
                          <button 
                            onClick={() => handleStatusChange(u.id, 'suspended')}
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors" 
                            title="Suspender"
                          >
                            <Pause size={16} />
                          </button>
                        ) : u.status === 'suspended' && (
                          <button 
                            onClick={() => handleStatusChange(u.id, 'active')}
                            className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors" 
                            title="Reativar"
                          >
                            <Play size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Configurações da Empresa</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
              <p className="text-[10px] text-orange-500 font-bold uppercase mb-1">Empresa selecionada</p>
              <p className="text-base font-bold text-zinc-100">{selectedUser?.company || selectedUser?.full_name}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Package size={14} className="text-orange-500" /> Plano de Assinatura</Label>
                <Select value={editData.plan_id} onValueChange={v => setEditData({...editData, plan_id: v})}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                    <SelectValue placeholder="Selecione um plano..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="none">Nenhum (Acesso Gratuito)</SelectItem>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Key size={14} className="text-orange-500" /> Woovi API Key (AppID)</Label>
                <Input 
                  value={editData.woovi_api_key} 
                  onChange={(e) => setEditData({...editData, woovi_api_key: e.target.value})} 
                  className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                  placeholder="ak_live_..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button 
              disabled={updating}
              onClick={handleSaveUser}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-4 rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              SALVAR ALTERAÇÕES
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;