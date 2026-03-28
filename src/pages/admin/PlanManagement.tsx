"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, Trash2, Edit3, Save, Zap, Users, CheckCircle2, Loader2, Layers } from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MODULES = [
  { id: 'vendas', label: 'Vendas e CRM' },
  { id: 'financeiro', label: 'Financeiro e Cobranças' },
  { id: 'estoque', label: 'Estoque e Produtos' },
  { id: 'industria', label: 'Indústria (Produção)' },
  { id: 'rh', label: 'Gente e Gestão (RH)' }
];

const PlanManagement = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', max_employees: '5', features: [] as string[], is_active: true });

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from('system_plans').select('*').order('price', { ascending: true });
    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const priceNum = parseFloat(formData.price.replace(',', '.'));
      const payload = { 
        name: formData.name, 
        price: isNaN(priceNum) ? 0 : priceNum, 
        max_employees: parseInt(formData.max_employees), 
        features: formData.features,
        is_active: formData.is_active 
      };
      
      if (editingId) await supabase.from('system_plans').update(payload).eq('id', editingId);
      else await supabase.from('system_plans').insert(payload);
      
      showSuccess("Plano salvo com sucesso!"); 
      setIsModalOpen(false); 
      fetchPlans();
    } catch (err: any) { 
      showError(err.message); 
    }
  };

  const toggleFeature = (moduleId: string) => {
    setFormData(prev => {
      const features = prev.features || [];
      if (features.includes(moduleId)) {
        return { ...prev, features: features.filter(f => f !== moduleId) };
      } else {
        return { ...prev, features: [...features, moduleId] };
      }
    });
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <Zap className="text-orange-500" size={32} /> Gestão de Planos
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Modelagem de precificação e limites do ecossistema.</p>
          </div>
          <button 
            onClick={() => { setEditingId(null); setFormData({ name: '', price: '', max_employees: '5', features: [], is_active: true }); setIsModalOpen(true); }} 
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={18} /> CRIAR PLANO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : plans.map((plan) => (
            <div key={plan.id} className={cn("bg-apple-white border border-apple-border rounded-[2.5rem] p-8 flex flex-col shadow-sm hover:border-orange-200 transition-all", !plan.is_active && "opacity-50 grayscale")}>
              <h3 className="text-2xl font-black text-apple-black mb-1">{plan.name}</h3>
              <p className="text-4xl font-black text-orange-500 mb-6">{currency.format(plan.price)}<span className="text-xs text-apple-muted">/mês</span></p>
              
              <div className="space-y-4 mb-10 flex-1">
                <div className="flex items-center gap-3 text-apple-dark font-bold bg-apple-offWhite p-3 rounded-xl border border-apple-border">
                  <Users size={18} className="text-orange-500" /><span>Até {plan.max_employees} pessoas</span>
                </div>
                
                <div className="pt-4 border-t border-apple-border">
                  <p className="text-[10px] font-black uppercase text-apple-muted tracking-widest mb-3">Módulos Liberados</p>
                  <ul className="space-y-2">
                    {MODULES.map(m => {
                      const hasFeature = plan.features?.includes(m.id);
                      return (
                        <li key={m.id} className={cn("flex items-center gap-2 text-sm", hasFeature ? "text-apple-black font-bold" : "text-apple-muted line-through opacity-50")}>
                          <CheckCircle2 size={16} className={hasFeature ? "text-emerald-500" : "text-apple-muted"} /> {m.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setEditingId(plan.id); setFormData({ name: plan.name, price: plan.price.toString().replace('.', ','), max_employees: plan.max_employees.toString(), features: plan.features || [], is_active: plan.is_active }); setIsModalOpen(true); }} className="flex-1 bg-apple-offWhite hover:bg-apple-light border border-apple-border text-apple-black font-black py-3 rounded-xl transition-all shadow-sm">
                  EDITAR PLANO
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Package className="text-orange-500" /> Configurar Plano
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-apple-muted uppercase">Nome do Plano</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-apple-muted uppercase">Preço (R$)</Label>
                <Input value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-apple-muted uppercase">Limite Staff</Label>
                <Input type="number" value={formData.max_employees} onChange={e => setFormData({...formData, max_employees: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-apple-border">
              <Label className="text-xs font-black text-apple-muted uppercase flex items-center gap-2">
                <Layers size={14} className="text-orange-500" /> Módulos do Sistema
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {MODULES.map(m => (
                  <label key={m.id} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", formData.features?.includes(m.id) ? "bg-orange-50 border-orange-500 text-orange-600" : "bg-apple-offWhite border-apple-border text-apple-black hover:border-apple-dark")}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-orange-500 cursor-pointer"
                      checked={formData.features?.includes(m.id)}
                      onChange={() => toggleFeature(m.id)}
                    />
                    <span className="text-xs font-bold">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-6">
              <button type="submit" className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95">
                SALVAR CONFIGURAÇÃO
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PlanManagement;