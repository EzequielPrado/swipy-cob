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
  Eye,
  ShieldCheck,
  Building2,
  Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    } else if (error) {
      showError("Erro ao carregar usuários. Verifique o SQL de RLS.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    // Feedback visual imediato na lista antes do fetch
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) {
      showError("Falha na atualização: " + error.message);
      fetchUsers(); // Reverte o estado se der erro
    } else {
      showSuccess(`Conta ${newStatus === 'active' ? 'aprovada' : 'suspensa'} com sucesso!`);
    }
  };

  const handleUpdateToken = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ woovi_api_key: newToken })
      .eq('id', selectedUser.id);

    if (error) showError(error.message);
    else {
      showSuccess("Token Woovi atualizado!");
      setIsTokenModalOpen(false);
      fetchUsers();
    }
    setUpdating(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
            <p className="text-zinc-400 mt-1">Aprove contas, configure tokens e monitore atividades.</p>
          </div>
          <button onClick={fetchUsers} className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
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
                  <th className="px-6 py-5">Configuração</th>
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
                      <div className="flex flex-col gap-1">
                        {u.woovi_api_key ? (
                          <div className="flex items-center gap-2 text-emerald-400 text-xs">
                            <CheckCircle2 size={12} /> Token OK
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-zinc-600 text-xs">
                            <XCircle size={12} /> Sem Token
                          </div>
                        )}
                        {u.is_admin && <span className="text-[9px] text-orange-500 font-bold tracking-widest uppercase">Admin System</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setNewToken(u.woovi_api_key || '');
                            setIsTokenModalOpen(true);
                          }}
                          className="p-2 text-zinc-500 hover:text-orange-400 transition-colors" 
                          title="Token Woovi"
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

      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Configuração Woovi</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-lg">
              <p className="text-[10px] text-orange-500 font-bold uppercase mb-1">Cliente</p>
              <p className="text-sm font-semibold">{selectedUser?.company || selectedUser?.full_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Woovi API Key (AppID)</Label>
              <Input 
                value={newToken} 
                onChange={(e) => setNewToken(e.target.value)} 
                className="bg-zinc-950 border-zinc-800 h-12"
                placeholder="ak_live_..."
              />
              <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                Insira a chave obtida no painel da Woovi para que o usuário possa gerar cobranças.
              </p>
            </div>
          </div>
          <DialogFooter>
            <button 
              disabled={updating}
              onClick={handleUpdateToken}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
            >
              {updating && <Loader2 className="animate-spin" size={16} />}
              Salvar Configurações
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;