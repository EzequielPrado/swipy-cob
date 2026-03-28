"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Search, Loader2, Building2, ShieldCheck, Settings2, GraduationCap, Filter, Save, Key } from 'lucide-react';
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
  const [filterRole, setFilterRole] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({ company: '', full_name: '', status: '', system_role: '', woovi_api_key: '', plan_id: 'none', accountant_id: 'none' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false });
      const { data: plansRes } = await supabase.from('system_plans').select('*');
      if (profiles) setUsers(profiles);
      if (plansRes) setPlans(plansRes);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditData({ company: user.company || '', full_name: user.full_name || '', status: user.status || 'pending', system_role: user.system_role || 'Admin', woovi_api_key: user.woovi_api_key || '', plan_id: user.plan_id || 'none', accountant_id: user.accountant_id || 'none' });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    setUpdating(true);
    try {
      await supabase.from('profiles').update({ company: editData.company, full_name: editData.full_name, status: editData.status, system_role: editData.system_role, woovi_api_key: editData.woovi_api_key, plan_id: editData.plan_id === 'none' ? null : editData.plan_id, accountant_id: editData.accountant_id === 'none' ? null : editData.accountant_id, updated_at: new Date().toISOString() }).eq('id', selectedUser.id);
      showSuccess("Usuário atualizado!"); setIsEditModalOpen(false); fetchData();
    } catch (err: any) { showError(err.message); } finally { setUpdating(false); }
  };

  const filtered = users.filter(u => (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()));

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div><h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3"><ShieldCheck className="text-orange-500" size={32} /> Governança SaaS</h2><p className="text-apple-muted mt-1 font-medium">Controle de acessos, tokens e hierarquia de parceiros.</p></div>
        </div>

        <div className="flex flex-col md:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} /><Input placeholder="Pesquisar lojista..." className="bg-apple-white border-apple-border pl-11 h-12 rounded-2xl shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-apple-offWhite text-apple-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-apple-border">
              <tr><th className="px-8 py-6">Entidade / Responsável</th><th className="px-8 py-6">Status</th><th className="px-8 py-6">Gestor</th><th className="px-8 py-6 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-apple-border">
              {loading ? <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr> : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-apple-light transition-colors"><td className="px-8 py-5"><div className="flex items-center gap-4"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", u.system_role === 'Contador' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{u.system_role === 'Contador' ? <GraduationCap size={20} /> : <Building2 size={20} />}</div><div><p className="text-sm font-black text-apple-black">{u.company || 'PF'}</p><p className="text-[10px] text-apple-muted font-bold">{u.full_name}</p></div></div></td><td className="px-8 py-5"><span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", u.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{u.status}</span></td><td className="px-8 py-5"><p className="text-[10px] font-black text-apple-muted uppercase">{u.system_role}</p></td><td className="px-8 py-5 text-right"><button onClick={() => handleOpenEdit(u)} className="p-2.5 bg-apple-offWhite hover:bg-orange-500 hover:text-white rounded-xl text-apple-muted transition-all border border-apple-border shadow-sm"><Settings2 size={16} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite"><DialogTitle className="text-xl font-black flex items-center gap-3"><Settings2 className="text-orange-500" /> Ajustar Governança</DialogTitle></DialogHeader>
           <div className="p-8 space-y-6">
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-apple-muted">Token Woovi (AppID)</Label><Input value={editData.woovi_api_key} onChange={e => setEditData({...editData, woovi_api_key: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono text-xs" /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-apple-muted">Status do Cadastro</Label>
                 <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="active">Ativo</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="suspended">Suspenso</SelectItem></SelectContent>
                 </Select>
              </div>
              <DialogFooter className="pt-4"><button disabled={updating} onClick={handleSave} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all shadow-xl">{updating ? <Loader2 className="animate-spin" /> : "ATUALIZAR PERFIL"}</button></DialogFooter>
           </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;