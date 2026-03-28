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
  Key,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Mail,
  Phone,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  ExternalLink
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
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editData, setEditData] = useState({
    company: '',
    full_name: '',
    status: '',
    woovi_api_key: '',
    plan_id: 'none'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Busca perfis e planos
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          *,
          system_plans(*),
          merchant:merchant_id(company, full_name)
        `)
        .order('created_at', { ascending: false });

      // 2. Busca Sumário de Cobranças (TPV) e Clientes para os lojistas
      const { data: charges } = await supabase.from('charges').select('user_id, amount, status');
      const { data: customers } = await supabase.from('customers').select('user_id');
      const { data: plansData } = await supabase.from('system_plans').select('*').eq('is_active', true);

      if (profiles) {
        const enrichedUsers = profiles.map(u => {
          const userCharges = charges?.filter(c => c.user_id === u.id) || [];
          const tpv = userCharges.filter(c => c.status === 'pago').reduce((acc, curr) => acc + Number(curr.amount), 0);
          const clientCount = customers?.filter(c => c.user_id === u.id).length || 0;
          
          return { ...u, tpv, clientCount };
        });
        setUsers(enrichedUsers);
      }
      
      if (plansData) setPlans(plansData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const merchants = users.filter(u => !u.merchant_id);
    return {
      totalMerchants: merchants.length,
      pending: merchants.filter(u => u.status === 'pending').length,
      totalTpv: merchants.reduce((acc, curr) => acc + (curr.tpv || 0), 0),
      activeSubs: merchants.filter(u => u.plan_id).length
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' ? true : u.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, filterStatus]);

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
          plan_id: editData.plan_id === 'none' ? null : editData.plan_id
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      showSuccess("Lojista atualizado com sucesso!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
               <ShieldCheck className="text-orange-500" size={32} />
               Centro de Monitoramento
            </h2>
            <p className="text-zinc-500 font-medium">Controle transacional e governança de lojistas Swipy.</p>
          </div>
          <button onClick={fetchData} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition-all">
            <Loader2 className={cn(loading && "animate-spin")} size={20} />
          </button>
        </div>

        {/* MÉTRICAS GLOBAIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={80} /></div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Empresas Ativas</p>
              <h3 className="text-4xl font-black text-zinc-100">{stats.totalMerchants}</h3>
           </div>
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><AlertCircle size={80} className="text-orange-500" /></div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Pendentes de KYC</p>
              <h3 className="text-4xl font-black text-orange-500">{stats.pending}</h3>
           </div>
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group md:col-span-2">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={120} className="text-emerald-500" /></div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Volume Total Transacionado (TPV Global)</p>
              <h3 className="text-4xl font-black text-emerald-500">{currency.format(stats.totalTpv)}</h3>
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <Input 
                placeholder="Pesquisar por Lojista, Empresa ou Token..." 
                className="bg-zinc-900 border-zinc-800 pl-11 h-14 rounded-2xl text-base shadow-xl"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 h-14 w-48 rounded-2xl">
                 <div className="flex items-center gap-2">
                    <Filter size={16} /> 
                    <SelectValue placeholder="Status" />
                 </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                 <SelectItem value="all">Todos os Status</SelectItem>
                 <SelectItem value="active">Ativos</SelectItem>
                 <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
           </Select>
        </div>

        {/* TABELA DE PERFORMANCE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-800">
              <tr>
                <th className="px-8 py-6">Lojista / Empresa</th>
                <th className="px-8 py-6">Saúde / Integração</th>
                <th className="px-8 py-6">TPV Acumulado</th>
                <th className="px-8 py-6">Base Clientes</th>
                <th className="px-8 py-6 text-right">Suporte & Gestão</th>
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
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
                        u.merchant_id ? "bg-zinc-950 border-zinc-800 text-zinc-700" : "bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-lg shadow-orange-500/5"
                      )}>
                        {u.merchant_id ? <Users size={18} /> : <Building2 size={22} />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-zinc-100 truncate">{u.company || 'Pessoa Física'}</p>
                        <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5 font-medium"><User size={10} /> {u.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     {!u.merchant_id && (
                        <div className="flex items-center gap-3">
                           {u.woovi_api_key ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                 <CheckCircle2 size={10} /> Woovi Online
                              </span>
                           ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                                 <AlertTriangle size={10} /> Sem Token
                              </span>
                           )}
                           <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{u.system_plans?.name || 'Standard'}</span>
                        </div>
                     )}
                     {u.merchant_id && <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded border border-zinc-800">Colaborador</span>}
                  </td>
                  <td className="px-8 py-5 font-mono text-sm font-black text-zinc-100">
                    {u.merchant_id ? '---' : currency.format(u.tpv || 0)}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <Users size={14} className="text-zinc-600" />
                       <span className="text-xs font-bold text-zinc-400">{u.merchant_id ? '---' : `${u.clientCount} clientes`}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`mailto:${u.email}`} className="p-2.5 bg-zinc-800 hover:bg-blue-500/10 hover:text-blue-400 rounded-xl text-zinc-500 transition-all border border-zinc-700">
                         <Mail size={16} />
                      </a>
                      <button onClick={() => handleOpenEdit(u)} className="p-2.5 bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 rounded-xl text-zinc-400 transition-all border border-zinc-700">
                        <Settings2 size={16} />
                      </button>
                    </div>
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
                <Settings2 className="text-orange-500" /> Governança da Conta
              </DialogTitle>
           </DialogHeader>
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500">Proprietário</Label>
                  <Input value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-zinc-500">Nome da Empresa</Label>
                  <Input value={editData.company} onChange={e => setEditData({...editData, company: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" />
                </div>
              </div>
              
              {!selectedUser?.merchant_id && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-2">
                      <Key size={12} className="text-orange-500" /> Woovi AppID (Produção)
                    </Label>
                    <Input value={editData.woovi_api_key} onChange={e => setEditData({...editData, woovi_api_key: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl font-mono text-xs" placeholder="app_xxxxxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Plano de Assinatura</Label>
                    <Select value={editData.plan_id} onValueChange={v => setEditData({...editData, plan_id: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="none">Padrão (Básico)</SelectItem>
                        {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {currency.format(p.price)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2 pt-4 border-t border-zinc-800">
                 <Label className="text-[10px] uppercase font-bold text-zinc-500">Controle de Acesso</Label>
                 <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="active">Ativo (Acesso Liberado)</SelectItem>
                      <SelectItem value="pending">Pendente (Verificação)</SelectItem>
                      <SelectItem value="suspended">Suspenso (Bloqueio)</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </div>
           <DialogFooter className="p-8 border-t border-zinc-800 bg-zinc-950/50">
              <button disabled={updating} onClick={handleSaveUser} className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/10">
                {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SALVAR CONFIGURAÇÕES
              </button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;