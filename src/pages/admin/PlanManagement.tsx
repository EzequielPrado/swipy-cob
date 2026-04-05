"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, Edit3, Save, Zap, Users, CheckCircle2, Loader2, Layers, CheckSquare, Square, MinusSquare, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MODULES = [
  { 
    id: 'inteligencia', 
    label: 'Inteligência Artificial',
    subFeatures: [
      { id: 'ai_assistant', label: 'Swipy AI (Assistente Virtual Copilot)' }
    ]
  },
  { 
    id: 'atendimento_vip', 
    label: 'Canais de Atendimento',
    subFeatures: [
      { id: 'suporte_vip', label: 'Falar com o Gestor (WhatsApp Direto)' }
    ]
  },
  { 
    id: 'vendas', 
    label: 'Vendas e CRM',
    subFeatures: [
      { id: 'vendas_dashboard', label: 'Dashboard de Vendas' },
      { id: 'vendas_lista', label: 'Gestão de Vendas' },
      { id: 'vendas_orcamentos', label: 'Orçamentos de Produtos' },
      { id: 'vendas_pdv', label: 'Frente de Caixa (PDV)' }
    ]
  },
  { 
    id: 'servicos', 
    label: 'Serviços e Agendamentos',
    subFeatures: [
      { id: 'servicos_os', label: 'Ordens de Serviço' },
      { id: 'servicos_agendamentos', label: 'Agendamentos' },
      { id: 'servicos_cadastro', label: 'Cadastro de Serviços' },
      { id: 'servicos_orcamentos', label: 'Orçamentos de Serviços' }
    ]
  },
  { 
    id: 'financeiro', 
    label: 'Financeiro',
    subFeatures: [
      { id: 'financeiro_dashboard', label: 'Dashboard Financeiro' },
      { id: 'financeiro_transacoes', label: 'Fluxo de Caixa (Extrato)' },
      { id: 'financeiro_conciliacao', label: 'Conciliação Bancária' },
      { id: 'financeiro_cobrancas', label: 'Contas a Receber' },
      { id: 'financeiro_pagar', label: 'Contas a Pagar' },
      { id: 'financeiro_contratos', label: 'Contratos Recorrentes' },
      { id: 'financeiro_bancos', label: 'Contas Bancárias' },
      { id: 'financeiro_plano_contas', label: 'Plano de Contas' }
    ]
  },
  { 
    id: 'fiscal', 
    label: 'Fiscal',
    subFeatures: [
      { id: 'fiscal_nfe', label: 'Emissão Fiscal (NFe/NFSe)' },
      { id: 'fiscal_arquivos', label: 'Arquivos Fiscais' },
      { id: 'fiscal_dre', label: 'DRE Contábil' }
    ]
  },
  { 
    id: 'estoque', 
    label: 'Armazém e Indústria',
    subFeatures: [
      { id: 'estoque_produtos', label: 'Produtos' },
      { id: 'estoque_movimentacoes', label: 'Movimentações' },
      { id: 'industria_producao', label: 'Controle de Produção' },
      { id: 'estoque_expedicao', label: 'Expedição (Logística)' }
    ]
  },
  { 
    id: 'rh', 
    label: 'Gente e Gestão (RH)',
    subFeatures: [
      { id: 'rh_analytics', label: 'People Analytics' },
      { id: 'rh_colaboradores', label: 'Colaboradores' },
      { id: 'rh_folha', label: 'Folha Gerencial' },
      { id: 'rh_ferias', label: 'Controle de Férias' },
      { id: 'rh_beneficios', label: 'Swipy Card (VR/VA)' }
    ]
  },
  {
    id: 'personalizacao',
    label: 'Personalização e Integrações',
    subFeatures: [
      { id: 'configuracoes_perfil', label: 'Perfil & Marca' },
      { id: 'configuracoes_integracoes', label: 'Integrações (E-commerce)' }
    ]
  }
];

const normalizeFeatures = (features: string[]) => {
  let normalized = new Set(features || []);
  MODULES.forEach(m => {
    if (normalized.has(m.id)) {
      m.subFeatures.forEach(sub => normalized.add(sub.id));
    } else {
      const hasAll = m.subFeatures.length > 0 && m.subFeatures.every(sub => normalized.has(sub.id));
      if (hasAll) normalized.add(m.id);
    }
  });
  return Array.from(normalized);
};

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

  const openModal = (plan?: any) => {
    if (plan) {
      setEditingId(plan.id);
      setFormData({ 
        name: plan.name, 
        price: plan.price.toString().replace('.', ','), 
        max_employees: plan.max_employees.toString(), 
        features: normalizeFeatures(plan.features || []), 
        is_active: plan.is_active 
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', price: '', max_employees: '5', features: [], is_active: true });
    }
    setIsModalOpen(true);
  };

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

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja APAGAR o plano "${name}"? Essa ação não pode ser desfeita e pode afetar lojistas vinculados.`)) {
      try {
        const { error } = await supabase.from('system_plans').delete().eq('id', id);
        if (error) throw error;
        showSuccess(`Plano ${name} removido!`);
        fetchPlans();
      } catch (err: any) {
        showError("Não foi possível apagar o plano. Ele pode estar em uso por algum lojista.");
      }
    }
  };

  const toggleParent = (moduleItem: any, isAllSelected: boolean) => {
    setFormData(prev => {
      let newFeatures = new Set(prev.features);
      if (isAllSelected) {
        newFeatures.delete(moduleItem.id);
        moduleItem.subFeatures.forEach((sub: any) => newFeatures.delete(sub.id));
      } else {
        newFeatures.add(moduleItem.id);
        moduleItem.subFeatures.forEach((sub: any) => newFeatures.add(sub.id));
      }
      return { ...prev, features: Array.from(newFeatures) };
    });
  };

  const toggleChild = (moduleItem: any, subId: string) => {
    setFormData(prev => {
      let newFeatures = new Set(prev.features);
      if (newFeatures.has(subId)) {
        newFeatures.delete(subId);
        newFeatures.delete(moduleItem.id);
      } else {
        newFeatures.add(subId);
        const allChildrenAdded = moduleItem.subFeatures.every((s: any) => s.id === subId || newFeatures.has(s.id));
        if (allChildrenAdded) newFeatures.add(moduleItem.id);
      }
      return { ...prev, features: Array.from(newFeatures) };
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
            <p className="text-apple-muted mt-1 font-medium">Modelagem de acessos granulares e preços do ERP.</p>
          </div>
          <button 
            onClick={() => openModal()} 
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={18} /> NOVO PLANO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : plans.map((plan) => (
            <div key={plan.id} className={cn("bg-apple-white border border-apple-border rounded-[2.5rem] p-8 flex flex-col shadow-sm hover:border-orange-200 transition-all relative group", !plan.is_active && "opacity-50 grayscale")}>
              
              <button 
                onClick={() => handleDelete(plan.id, plan.name)}
                className="absolute top-6 right-6 p-2 text-apple-muted hover:bg-red-50 hover:text-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Apagar Plano"
              >
                <Trash2 size={20} />
              </button>

              <h3 className="text-2xl font-black text-apple-black mb-1 pr-10">{plan.name}</h3>
              <p className="text-4xl font-black text-orange-500 mb-6">{currency.format(plan.price)}<span className="text-xs text-apple-muted">/mês</span></p>
              
              <div className="space-y-4 mb-10 flex-1">
                <div className="flex items-center gap-3 text-apple-dark font-bold bg-apple-offWhite p-3 rounded-xl border border-apple-border">
                  <Users size={18} className="text-orange-500" /><span>Até {plan.max_employees} pessoas</span>
                </div>
                
                <div className="pt-4 border-t border-apple-border">
                  <p className="text-[10px] font-black uppercase text-apple-muted tracking-widest mb-3">Resumo de Acessos</p>
                  <ul className="space-y-2">
                    {MODULES.map(m => {
                      const planFeatures = normalizeFeatures(plan.features || []);
                      const isFull = m.subFeatures.every(sub => planFeatures.includes(sub.id));
                      const isPartial = !isFull && m.subFeatures.some(sub => planFeatures.includes(sub.id));
                      
                      if (!isFull && !isPartial) return null; 

                      return (
                        <li key={m.id} className="flex flex-col gap-1">
                           <div className="flex items-center gap-2 text-sm text-apple-black font-bold">
                              <CheckCircle2 size={16} className={isFull ? "text-emerald-500" : "text-orange-400"} /> 
                              {m.label} {isPartial && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-black ml-1">Parcial</span>}
                           </div>
                           {isPartial && (
                              <div className="pl-6 text-[10px] text-apple-muted font-medium">
                                 {m.subFeatures.filter(sub => planFeatures.includes(sub.id)).map(s => s.label).join(', ')}
                              </div>
                           )}
                        </li>
                      );
                    })}
                    {(!plan.features || plan.features.length === 0) && (
                      <li className="text-sm text-apple-muted italic">Nenhum módulo selecionado</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openModal(plan)} className="flex-1 bg-apple-offWhite hover:bg-apple-light border border-apple-border text-apple-black font-black py-3 rounded-xl transition-all shadow-sm">
                  EDITAR PLANO
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[650px] p-0 overflow-hidden shadow-2xl rounded-[2.5rem] flex flex-col max-h-[90vh]">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite shrink-0">
              <DialogTitle className="text-xl font-black flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Layers size={20} /></div>
                {editingId ? 'Editar Permissões do Plano' : 'Criar Novo Plano'}
              </DialogTitle>
            </DialogHeader>

            <div className="overflow-y-auto p-8 space-y-8 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-[10px] font-black text-apple-muted uppercase ml-1">Nome do Plano</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-apple-muted uppercase ml-1">Preço (R$)</Label>
                  <Input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-apple-muted uppercase ml-1">Limite Staff</Label>
                  <Input type="number" required value={formData.max_employees} onChange={e => setFormData({...formData, max_employees: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                   <Label className="text-sm font-black text-apple-black flex items-center gap-2">
                     Configuração de Acessos
                   </Label>
                   <p className="text-xs text-apple-muted">Marque as páginas e funcionalidades que estarão disponíveis para assinantes deste plano.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {MODULES.map(m => {
                    const isAllSelected = m.subFeatures.every(sub => formData.features.includes(sub.id));
                    const isIndeterminate = !isAllSelected && m.subFeatures.some(sub => formData.features.includes(sub.id));

                    return (
                      <div key={m.id} className="bg-apple-offWhite border border-apple-border rounded-2xl p-4 space-y-3">
                         <div 
                           className="flex items-center gap-3 cursor-pointer group pb-3 border-b border-apple-border/60"
                           onClick={() => toggleParent(m, isAllSelected)}
                         >
                            {isAllSelected ? (
                               <CheckSquare size={20} className="text-orange-500" />
                            ) : isIndeterminate ? (
                               <MinusSquare size={20} className="text-orange-400" />
                            ) : (
                               <Square size={20} className="text-apple-muted group-hover:text-apple-dark" />
                            )}
                            <span className={cn("text-sm font-black", isAllSelected || isIndeterminate ? "text-apple-black" : "text-apple-muted")}>
                               {m.label}
                            </span>
                         </div>

                         <div className="pl-8 space-y-2">
                            {m.subFeatures.map(sub => {
                               const isChecked = formData.features.includes(sub.id);
                               return (
                                  <div 
                                    key={sub.id} 
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => toggleChild(m, sub.id)}
                                  >
                                     {isChecked ? (
                                        <CheckSquare size={16} className="text-emerald-500" />
                                     ) : (
                                        <Square size={16} className="text-apple-muted group-hover:text-apple-dark" />
                                     )}
                                     <span className={cn("text-xs font-bold", isChecked ? "text-apple-black" : "text-apple-muted")}>
                                        {sub.label}
                                     </span>
                                  </div>
                               )
                            })}
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 border-t border-apple-border bg-apple-white shrink-0">
              <button type="submit" className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> SALVAR CONFIGURAÇÃO DE PLANO
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PlanManagement;