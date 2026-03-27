"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, ShieldCheck, Loader2, Search, Building2, Briefcase, Trash2, ArrowRight, FileSpreadsheet, Link2, Palette, Settings2
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ALL_MODULES = [
  { id: 'dashboard', label: 'Visão Geral' },
  { id: 'sales', label: 'Vendas' },
  { id: 'inventory', label: 'Estoque' },
  { id: 'industry', label: 'Indústria' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'hr', label: 'RH / Gente' },
  { id: 'registrations', label: 'Cadastros' },
  { id: 'swipy_account', label: 'Conta Digital' },
  { id: 'personalization', label: 'Personalização' },
];

const UserManagement = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [accountantLinks, setAccountantLinks] = useState<string[]>([]);

  const partners = profiles.filter(p => p.user_type === 'parceiro');

  const [formData, setFormData] = useState({
    id: '',
    role: 'Vendas',
    user_type: 'parceiro',
    partner_id: 'none',
    plan_id: '',
    custom_employee_limit: '',
    custom_modules: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    const [profRes, planRes] = await Promise.all([
      supabase.from('profiles').select('*, plans(*)').order('full_name', { ascending: true }),
      supabase.from('plans').select('*').order('price', { ascending: true })
    ]);
    if (profRes.data) setProfiles(profRes.data);
    if (planRes.data) setPlans(planRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEditModal = (p: any) => {
    setSelectedUser(p);
    setFormData({
      id: p.id,
      role: p.role || 'Vendas',
      user_type: p.user_type || 'parceiro',
      partner_id: p.partner_id || 'none',
      plan_id: p.plan_id || '',
      custom_employee_limit: p.custom_employee_limit?.toString() || '',
      custom_modules: p.custom_modules || p.plans?.modules || []
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        role: formData.role,
        user_type: formData.user_type,
        partner_id: formData.user_type === 'funcionario' && formData.partner_id !== 'none' ? formData.partner_id : null,
        plan_id: formData.user_type === 'parceiro' ? formData.plan_id : null,
        custom_employee_limit: formData.custom_employee_limit ? parseInt(formData.custom_employee_limit) : null,
        custom_modules: formData.custom_modules
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', formData.id);
      if (error) throw error;
      showSuccess("Usuário e Plano atualizados!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  const toggleModule = (modId: string) => {
    setFormData(prev => ({
      ...prev,
      custom_modules: prev.custom_modules.includes(modId) 
        ? prev.custom_modules.filter(m => m !== modId) 
        : [...prev.custom_modules, modId]
    }));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-orange-500" size={32} /> Governança SaaS
          </h2>
          <p className="text-zinc-400 mt-1">Gerencie planos, acessos modulares e hierarquia de empresas.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="Buscar parceiro ou e-mail..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
              <tr>
                <th className="px-8 py-5">Organização</th>
                <th className="px-8 py-5">Tipo</th>
                <th className="px-8 py-5">Plano Contratado</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
              ) : profiles.filter(p => p.email.includes(searchTerm) || p.full_name?.includes(searchTerm)).map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-zinc-100">{p.company || p.full_name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{p.email}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded">
                      {p.user_type}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {p.plans ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-orange-400">{p.plans.name}</span>
                        <span className="text-[9px] text-zinc-500">Limite: {p.custom_employee_limit || p.plans.employee_limit} funcs</span>
                      </div>
                    ) : <span className="text-xs text-zinc-700 italic">Sem plano</span>}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => openEditModal(p)} className="p-2 bg-zinc-950 hover:bg-orange-500 hover:text-zinc-950 rounded-lg transition-all text-zinc-500 border border-zinc-800">
                      <Settings2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO AVANÇADA */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[550px] rounded-[2rem] shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-zinc-800 shrink-0">
            <DialogTitle>Gerenciar Plano e Módulos</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateUser} className="flex-1 flex flex-col overflow-hidden max-h-[70vh]">
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Configuração do Plano</p>
                <div className="space-y-2">
                  <Label>Plano de Assinatura</Label>
                  <Select value={formData.plan_id} onValueChange={v => setFormData({...formData, plan_id: v})}>
                    <SelectTrigger className="bg-zinc-950 h-12 rounded-xl border-zinc-800"><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {plans.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name} (R$ {pl.price})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Limite de Funcionários (Sobrescrita)</Label>
                  <Input type="number" placeholder="Deixe vazio para usar o padrão do plano" className="bg-zinc-950 h-12 rounded-xl border-zinc-800" value={formData.custom_employee_limit} onChange={e => setFormData({...formData, custom_employee_limit: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                  Módulos Habilitados <span>(Customizado)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                   {ALL_MODULES.map(mod => (
                     <div 
                      key={mod.id} 
                      onClick={() => toggleModule(mod.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        formData.custom_modules.includes(mod.id) ? "bg-orange-500/10 border-orange-500 text-orange-400" : "bg-zinc-950 border-zinc-800 text-zinc-600"
                      )}
                     >
                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center", formData.custom_modules.includes(mod.id) ? "bg-orange-500 border-orange-500" : "border-zinc-700")}>
                          {formData.custom_modules.includes(mod.id) && <CheckCircle2 size={12} className="text-zinc-950" />}
                        </div>
                        <span className="text-xs font-bold">{mod.label}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 border-t border-zinc-800 bg-zinc-950/50">
               <button type="submit" disabled={saving} className="w-full bg-orange-500 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2">
                 {saving ? <Loader2 className="animate-spin" /> : "SALVAR ALTERAÇÕES"}
               </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;