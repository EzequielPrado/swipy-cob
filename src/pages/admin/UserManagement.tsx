"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  ShieldCheck, 
  Loader2, 
  Search, 
  Building2,
  Briefcase,
  Trash2,
  ArrowRight,
  FileSpreadsheet,
  Link2,
  X,
  CheckCircle2
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const UserManagement = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Dados de vínculo para contadores
  const [accountantLinks, setAccountantLinks] = useState<string[]>([]);

  const partners = profiles.filter(p => p.user_type === 'parceiro');

  const [formData, setFormData] = useState({
    id: '',
    role: 'Vendas',
    user_type: 'parceiro',
    partner_id: 'none'
  });

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (!error && data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openEditModal = (profile: any) => {
    setSelectedUser(profile);
    setFormData({
      id: profile.id,
      role: profile.role || 'Vendas',
      user_type: profile.user_type || 'parceiro',
      partner_id: profile.partner_id || 'none'
    });
    setIsEditModalOpen(true);
  };

  const openLinkModal = async (profile: any) => {
    setSelectedUser(profile);
    setSaving(true);
    
    // Buscar vínculos existentes na tabela accountant_companies
    const { data } = await supabase
      .from('accountant_companies')
      .select('partner_id')
      .eq('accountant_id', profile.id);
    
    setAccountantLinks(data?.map(d => d.partner_id) || []);
    setSaving(false);
    setIsLinkModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        role: formData.role,
        user_type: formData.user_type,
        partner_id: formData.user_type === 'funcionario' && formData.partner_id !== 'none' ? formData.partner_id : null
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', formData.id);
      if (error) throw error;

      showSuccess("Usuário atualizado!");
      setIsEditModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLinks = async () => {
    setSaving(true);
    try {
      // 1. Limpar vínculos antigos
      await supabase.from('accountant_companies').delete().eq('accountant_id', selectedUser.id);
      
      // 2. Inserir novos vínculos
      if (accountantLinks.length > 0) {
        const inserts = accountantLinks.map(pid => ({
          accountant_id: selectedUser.id,
          partner_id: pid
        }));
        const { error } = await supabase.from('accountant_companies').insert(inserts);
        if (error) throw error;
      }

      showSuccess("Empresas vinculadas ao contador!");
      setIsLinkModalOpen(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLink = (partnerId: string) => {
    setAccountantLinks(prev => 
      prev.includes(partnerId) ? prev.filter(id => id !== partnerId) : [...prev, partnerId]
    );
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case 'parceiro': return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Building2 size={10} /> Parceiro</span>;
      case 'funcionario': return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Briefcase size={10} /> Funcionário</span>;
      case 'contador': return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><FileSpreadsheet size={10} /> Contador</span>;
      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-orange-500" size={32} />
              Governança de Usuários
            </h2>
            <p className="text-zinc-400 mt-1">Gerencie a hierarquia e os vínculos entre Parceiros e Contadores.</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar usuário..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
              <tr>
                <th className="px-8 py-5">Usuário / ID</th>
                <th className="px-8 py-5">Tipo</th>
                <th className="px-8 py-5">Departamento</th>
                <th className="px-8 py-5">Vínculo</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
              ) : filteredProfiles.map((p) => {
                const partnerOwner = profiles.find(owner => owner.id === p.partner_id);
                return (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-orange-500 font-bold text-xs uppercase overflow-hidden">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} alt="Avatar" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-zinc-100">{p.full_name || 'Sem Nome'}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{p.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">{getUserTypeBadge(p.user_type)}</td>
                    <td className="px-8 py-5">
                       <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                         {p.role || 'Geral'}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                       {p.user_type === 'funcionario' && partnerOwner ? (
                         <div className="flex items-center gap-2 text-xs text-zinc-500">
                           <ArrowRight size={12} className="text-blue-500" />
                           <span className="font-bold text-blue-400">{partnerOwner.full_name}</span>
                         </div>
                       ) : p.user_type === 'contador' ? (
                         <span className="text-[10px] font-bold text-emerald-400 uppercase">Múltiplos Acessos</span>
                       ) : (
                         <span className="text-zinc-700 text-xs italic">Dono da Conta</span>
                       )}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-2">
                         {p.user_type === 'contador' && (
                           <button 
                            onClick={() => openLinkModal(p)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-zinc-950 rounded-lg transition-all border border-emerald-500/20"
                            title="Vincular Empresas"
                           >
                             <Link2 size={16} />
                           </button>
                         )}
                         <button 
                          onClick={() => openEditModal(p)}
                          className="p-2 bg-zinc-950 hover:bg-orange-500 hover:text-zinc-950 rounded-lg transition-all text-zinc-500 border border-zinc-800"
                          title="Editar Tipo/Role"
                         >
                           <ShieldCheck size={16} />
                         </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO BÁSICA */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px] rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Nível de Acesso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Tipo de Usuário</Label>
              <Select value={formData.user_type} onValueChange={v => setFormData({...formData, user_type: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="parceiro">Parceiro (Dono da Conta)</SelectItem>
                  <SelectItem value="funcionario">Funcionário de Parceiro</SelectItem>
                  <SelectItem value="contador">Contador (Acesso Externo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.user_type === 'funcionario' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-zinc-400">Vincular ao Parceiro</Label>
                <Select value={formData.partner_id} onValueChange={v => setFormData({...formData, partner_id: v})}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o titular..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-400">Permissão (Role)</Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="Admin">Administrador Total</SelectItem>
                  <SelectItem value="Financeiro">Gestão Financeira</SelectItem>
                  <SelectItem value="Vendas">Frente de Vendas / PDV</SelectItem>
                  <SelectItem value="Estoque">Logística / Estoque</SelectItem>
                  <SelectItem value="RH">Recursos Humanos / Gente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <button type="submit" disabled={saving} className="w-full bg-orange-500 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : "SALVAR ALTERAÇÕES"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VÍNCULO DO CONTADOR */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[500px] rounded-[2rem] shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-4 border-b border-zinc-800">
            <DialogTitle className="text-xl flex items-center gap-3">
              <FileSpreadsheet className="text-emerald-500" />
              Empresas sob Auditoria
            </DialogTitle>
            <p className="text-xs text-zinc-500 font-normal mt-1">Contador: <span className="font-bold text-zinc-300">{selectedUser?.full_name}</span></p>
          </DialogHeader>
          
          <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">Selecione os Parceiros que este contador atende:</p>
            <div className="space-y-3">
              {partners.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => toggleLink(p.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
                    accountantLinks.includes(p.id) ? "bg-emerald-500/10 border-emerald-500/30" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500">
                       <Building2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200">{p.full_name}</p>
                      <p className="text-[10px] text-zinc-500">{p.company || 'PJ Individual'}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    accountantLinks.includes(p.id) ? "bg-emerald-500 border-emerald-500 text-zinc-950" : "border-zinc-700"
                  )}>
                    {accountantLinks.includes(p.id) && <CheckCircle2 size={14} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="p-8 pt-4 border-t border-zinc-800 bg-zinc-950/50">
            <button 
              onClick={handleSaveLinks} 
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Link2 size={18} />}
              ATUALIZAR VÍNCULOS
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
};

export default UserManagement;