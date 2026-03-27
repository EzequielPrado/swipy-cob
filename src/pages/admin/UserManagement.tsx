"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
  Save,
  User,
  ShieldCheck,
  AlertCircle,
  Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Estado do formulário de edição
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
    const [profilesRes, plansRes] = await Promise.all([
      supabase.from('profiles').select('*, system_plans(*)').order('updated_at', { ascending: false }),
      supabase.from('system_plans').select('*').eq('is_active', true)
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    
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

      showSuccess("Dados da empresa atualizados com sucesso!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const selectedPlanInfo = useMemo(() => {
    if (editData.plan_id === 'none') return null;
    return plans.find(p => p.id === editData.plan_id);
  }, [editData.plan_id, plans]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Empresas</h2>
            <p className="text-zinc-400 mt-1">Administre os lojistas, seus planos e acessos ao sistema.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input 
              placeholder="Buscar empresa ou responsável..." 
              className="bg-zinc-900 border-zinc-800 pl-10 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Identificação</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Plano Contratado</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-zinc-600 italic">Nenhuma empresa encontrada com este filtro.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                            u.is_admin ? "bg-orange-500/10 border-orange-500/20 text-orange-500" : "bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:border-zinc-600"
                          )}>
                            {u.is_admin ? <ShieldCheck size={22} /> : <Building2 size={22} />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-zinc-100 truncate flex items-center gap-2">
                              {u.company || 'Pessoa Física'}
                              {u.is_admin && <span className="text-[8px] bg-orange-500 text-zinc-950 px-1.5 py-0.5 rounded font-black">ADMIN</span>}
                            </p>
                            <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                              <User size={10} /> {u.full_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0",
                          u.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          u.status === 'suspended' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                          "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {u.status === 'pending' ? 'Aguardando Aprovação' : u.status === 'active' ? 'Ativa' : 'Suspensa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Package size={14} className={u.plan_id ? "text-orange-500" : "text-zinc-700"} />
                              <span className={cn("text-xs font-bold uppercase", u.plan_id ? "text-zinc-200" : "text-zinc-700 italic")}>
                                {u.system_plans?.name || 'Gratuito / Sem Plano'}
                              </span>
                            </div>
                            {u.system_plans?.price > 0 && <p className="text-[9px] text-zinc-500 font-mono ml-5">R$ {u.system_plans.price.toFixed(2)}/mês</p>}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenEdit(u)}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-zinc-700 shadow-xl"
                            title="Editar Dados e Plano"
                          >
                            <Settings2 size={14} /> GERENCIAR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[550px] p-0 overflow-hidden rounded-[2rem]">
          <DialogHeader className="p-8 border-b border-zinc-800 bg-zinc-950/30">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
               <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                  <Building2 size={24} />
               </div>
               Configurar Empresa
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-8 space-y-8">
              {/* Seção 1: Identificação */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={12} /> Dados Cadastrais
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input 
                      value={editData.company} 
                      onChange={e => setEditData({...editData, company: e.target.value})}
                      className="bg-zinc-950 border-zinc-800 h-12 rounded-xl focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável (Full Name)</Label>
                    <Input 
                      value={editData.full_name} 
                      onChange={e => setEditData({...editData, full_name: e.target.value})}
                      className="bg-zinc-950 border-zinc-800 h-12 rounded-xl focus:ring-orange-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status da Conta</Label>
                  <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="pending">Pendente (Aguardando)</SelectItem>
                      <SelectItem value="active">Ativa (Acesso Liberado)</SelectItem>
                      <SelectItem value="suspended">Suspensa (Bloqueada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seção 2: Plano e Limites */}
              <div className="space-y-4 pt-6 border-t border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={12} /> Plano de Assinatura
                </p>
                <Select value={editData.plan_id} onValueChange={v => setEditData({...editData, plan_id: v})}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o plano do cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="none">Nenhum (Acesso Gratuito / Básico)</SelectItem>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>

                {selectedPlanInfo && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-top-2">
                     <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Recursos deste Plano:</p>
                     <div className="flex flex-wrap gap-2">
                        {selectedPlanInfo.features?.map((f: string) => (
                           <span key={f} className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] px-2 py-1 rounded-md uppercase font-bold">
                              {f}
                           </span>
                        ))}
                     </div>
                     <p className="text-[11px] text-zinc-500 italic mt-2 border-t border-zinc-800 pt-2 flex items-center gap-2">
                        <AlertCircle size={12} /> Limite de até {selectedPlanInfo.max_employees} colaboradores.
                     </p>
                  </div>
                )}
              </div>

              {/* Seção 3: Fintech / Integração */}
              <div className="space-y-4 pt-6 border-t border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Key size={12} /> Integração Financeira (Woovi)
                </p>
                <div className="space-y-2">
                  <Label>AppID (API Key)</Label>
                  <Input 
                    value={editData.woovi_api_key} 
                    onChange={(e) => setEditData({...editData, woovi_api_key: e.target.value})} 
                    className="bg-zinc-950 border-zinc-800 h-12 rounded-xl font-mono text-xs"
                    placeholder="ak_live_..."
                  />
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Esta chave permite que a empresa gere cobranças PIX reais e receba os pagamentos diretamente na conta dela.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-zinc-950/50 border-t border-zinc-800">
            <button 
              disabled={updating}
              onClick={handleSaveUser}
              className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95"
            >
              {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              SALVAR CONFIGURAÇÕES
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;