"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Users, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Zap,
  Package,
  ShieldCheck,
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const AVAILABLE_FEATURES = [
  { id: 'financial', label: 'Financeiro Completo' },
  { id: 'sales', label: 'Vendas & PDV' },
  { id: 'inventory', label: 'Estoque & Produtos' },
  { id: 'industry', label: 'Módulo Industrial' },
  { id: 'hr', label: 'Gestão de Pessoas (RH)' },
  { id: 'fiscal', label: 'Emissão de Notas Fiscais' },
  { id: 'reports', label: 'Relatórios Avançados' },
  { id: 'support', label: 'Suporte Prioritário' },
];

const PlanManagement = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    max_employees: '5',
    features: [] as string[],
    is_active: true
  });

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_plans' as any)
      .select('*')
      .order('price', { ascending: true });

    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', price: '', max_employees: '5', features: [], is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: any) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      price: plan.price.toString().replace('.', ','),
      max_employees: plan.max_employees.toString(),
      features: plan.features || [],
      is_active: plan.is_active
    });
    setIsModalOpen(true);
  };

  const toggleFeature = (id: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(id) 
        ? prev.features.filter(f => f !== id) 
        : [...prev.features, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const priceNum = parseFloat(formData.price.replace(',', '.'));
      const payload = {
        name: formData.name,
        price: isNaN(priceNum) ? 0 : priceNum,
        max_employees: parseInt(formData.max_employees),
        features: formData.features,
        is_active: formData.is_active
      };

      if (editingId) {
        const { error } = await supabase.from('system_plans' as any).update(payload).eq('id', editingId);
        if (error) throw error;
        showSuccess("Plano atualizado!");
      } else {
        const { error } = await supabase.from('system_plans' as any).insert(payload);
        if (error) throw error;
        showSuccess("Plano criado com sucesso!");
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover este plano?")) return;
    const { error } = await supabase.from('system_plans' as any).delete().eq('id', id);
    if (error) showError(error.message);
    else {
      showSuccess("Plano removido.");
      fetchPlans();
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Package className="text-orange-500" size={32} />
              Configuração de Planos
            </h2>
            <p className="text-zinc-400 mt-1">Defina a precificação e limitações do seu ecossistema SaaS.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> CRIAR NOVO PLANO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : plans.length === 0 ? (
            <div className="col-span-full bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-20 text-center">
               <Zap size={48} className="mx-auto mb-4 text-zinc-700" />
               <p className="text-zinc-500 font-bold">Nenhum plano configurado. Comece criando um para os lojistas.</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className={cn(
                "bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden transition-all hover:border-orange-500/30",
                !plan.is_active && "opacity-60 grayscale"
              )}>
                {!plan.is_active && <div className="absolute top-4 right-4 bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Inativo</div>}
                
                <h3 className="text-2xl font-black text-zinc-100 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-3xl font-black text-orange-500">{currency.format(plan.price)}</span>
                  <span className="text-xs text-zinc-500 font-bold">/mês</span>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Users size={18} className="text-orange-500" />
                    <span className="text-sm font-bold">Até {plan.max_employees} colaboradores</span>
                  </div>
                  <div className="pt-4 border-t border-zinc-800 space-y-3">
                    {plan.features?.map((featId: string) => (
                      <div key={featId} className="flex items-center gap-3 text-zinc-400">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-xs">{AVAILABLE_FEATURES.find(f => f.id === featId)?.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(plan)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={16} /> EDITAR
                  </button>
                  <button 
                    onClick={() => handleDelete(plan.id)}
                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-zinc-800 bg-zinc-950/30">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Package size={24} className="text-orange-500" />
              {editingId ? 'Editar Plano' : 'Criar Novo Plano'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <Label>Nome do Plano</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" placeholder="Ex: Basic, Pro, Enterprise..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl font-bold" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Limite de Colaboradores</Label>
                  <Input type="number" required value={formData.max_employees} onChange={e => setFormData({...formData, max_employees: e.target.value})} className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Recursos Liberados</Label>
                <div className="grid grid-cols-1 gap-2">
                  {AVAILABLE_FEATURES.map(feat => (
                    <div 
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                        formData.features.includes(feat.id) ? "bg-orange-500/10 border-orange-500/30" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      )}
                    >
                      <span className="text-sm font-medium">{feat.label}</span>
                      {formData.features.includes(feat.id) ? <CheckCircle2 size={18} className="text-orange-500" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-zinc-800" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                 <Label className="font-bold">Plano Ativo e Visível?</Label>
                 <Switch checked={formData.is_active} onCheckedChange={val => setFormData({...formData, is_active: val})} />
              </div>
            </div>

            <DialogFooter className="p-8 bg-zinc-950/50 border-t border-zinc-800">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                SALVAR CONFIGURAÇÕES
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PlanManagement;