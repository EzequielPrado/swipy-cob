"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, UserPlus, Briefcase, ShieldCheck, ChevronRight, ChevronLeft, Building } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEPARTMENTS = ["Vendas", "Financeiro", "Operações", "Tecnologia", "Diretoria", "Gente e Gestão"];
const ROLES = ["Vendedor", "Analista", "Gerente", "Assistente", "Diretor", "Estagiário"];
const SYSTEM_ROLES = [
  { id: 'Nenhum', label: 'Sem Acesso (Apenas DP)', desc: 'Colaborador não terá login no ERP Swipy.' },
  { id: 'Vendas', label: 'Vendedor', desc: 'Acesso apenas ao CRM, Clientes e Orçamentos.' },
  { id: 'Financeiro', label: 'Financeiro', desc: 'Acesso ao fluxo de caixa, contas a pagar/receber.' },
  { id: 'Estoque', label: 'Estoque', desc: 'Acesso apenas ao controle de inventário e produtos.' },
  { id: 'RH', label: 'Gente e Gestão', desc: 'Acesso aos dados dos colaboradores e comissões.' },
  { id: 'Admin', label: 'Administrador (Dono)', desc: 'Acesso total a todos os módulos e configurações.' },
];

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    email: '',
    phone: '',
    department: DEPARTMENTS[0],
    job_role: ROLES[0],
    employment_type: 'CLT',
    base_salary: '',
    hire_date: new Date().toISOString().split('T')[0],
    system_access: false,
    system_role: 'Nenhum'
  });

  const nextStep = () => {
    if (step === 1 && (!formData.full_name || !formData.cpf)) {
      return showError("Preencha o Nome e CPF.");
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return nextStep();

    setLoading(true);
    try {
      const salary = parseFloat(formData.base_salary.replace(',', '.'));

      const payload = {
        user_id: user?.id,
        full_name: formData.full_name,
        cpf: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        job_role: formData.job_role,
        employment_type: formData.employment_type,
        base_salary: isNaN(salary) ? 0 : salary,
        hire_date: formData.hire_date,
        system_access: formData.system_access,
        system_role: formData.system_access ? formData.system_role : 'Nenhum',
        status: 'Ativo'
      };

      const { error } = await supabase.from('employees').insert(payload);
      
      if (error) throw error;

      showSuccess("Colaborador cadastrado com sucesso!");
      
      if (formData.system_access) {
        // Alerta educativo sobre o envio de convites de login (Mock por enquanto)
        setTimeout(() => showSuccess("Um convite de acesso será enviado para o e-mail do colaborador em breve."), 1500);
      }

      onSuccess();
      onClose();
      setStep(1);
      setFormData({
        full_name: '', cpf: '', email: '', phone: '',
        department: DEPARTMENTS[0], job_role: ROLES[0], employment_type: 'CLT',
        base_salary: '', hire_date: new Date().toISOString().split('T')[0],
        system_access: false, system_role: 'Nenhum'
      });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[550px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-zinc-950/50 p-6 border-b border-zinc-800 shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2 mb-4">
            <UserPlus className="text-orange-500" size={24} />
            Admissão de Colaborador
          </DialogTitle>
          
          {/* Stepper Visual */}
          <div className="flex items-center gap-2">
            {[
              { id: 1, icon: UserPlus, label: 'Pessoais' },
              { id: 2, icon: Briefcase, label: 'Contrato' },
              { id: 3, icon: ShieldCheck, label: 'Acessos' }
            ].map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                    step === s.id ? "bg-orange-500 border-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20" :
                    step > s.id ? "bg-orange-500/20 border-orange-500/30 text-orange-500" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}>
                    <s.icon size={14} />
                  </div>
                  <span className={cn("text-[9px] uppercase font-bold tracking-wider", step >= s.id ? "text-zinc-300" : "text-zinc-600")}>{s.label}</span>
                </div>
                {i < 2 && <div className={cn("flex-1 h-0.5 rounded-full", step > s.id ? "bg-orange-500/50" : "bg-zinc-800")} />}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* STEP 1: DADOS PESSOAIS */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input required placeholder="Ex: João Silva Sauro" className="bg-zinc-950 border-zinc-800 h-11" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input required placeholder="000.000.000-00" className="bg-zinc-950 border-zinc-800 h-11" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input placeholder="(00) 90000-0000" className="bg-zinc-950 border-zinc-800 h-11" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-mail (Pessoal ou Corporativo)</Label>
                  <Input type="email" placeholder="joao@empresa.com" className="bg-zinc-950 border-zinc-800 h-11" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
            )}

            {/* STEP 2: DADOS DO CONTRATO */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo / Função</Label>
                    <Select value={formData.job_role} onValueChange={v => setFormData({...formData, job_role: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label>Vínculo</Label>
                    <Select value={formData.employment_type} onValueChange={v => setFormData({...formData, employment_type: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="Estagiário">Estagiário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Salário Base Bruto (R$)</Label>
                    <Input required placeholder="0,00" className="bg-zinc-950 border-zinc-800 h-11" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Admissão</Label>
                  <Input required type="date" className="bg-zinc-950 border-zinc-800 h-11" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} />
                </div>
              </div>
            )}

            {/* STEP 3: ACESSOS (RBAC) */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-zinc-100">Dar acesso ao sistema Swipy ERP?</Label>
                    <p className="text-[10px] text-zinc-500">O colaborador poderá logar com o e-mail cadastrado.</p>
                  </div>
                  <Switch 
                    checked={formData.system_access} 
                    onCheckedChange={(c) => {
                      setFormData({...formData, system_access: c, system_role: c ? 'Vendas' : 'Nenhum'})
                    }} 
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {formData.system_access && (
                  <div className="space-y-3">
                    <Label className="text-xs uppercase text-zinc-500 tracking-widest font-bold">Defina o Perfil de Acesso (RBAC)</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {SYSTEM_ROLES.filter(r => r.id !== 'Nenhum').map(role => (
                        <div 
                          key={role.id}
                          onClick={() => setFormData({...formData, system_role: role.id})}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                            formData.system_role === role.id 
                              ? "bg-orange-500/10 border-orange-500/30" 
                              : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                            formData.system_role === role.id ? "border-orange-500" : "border-zinc-600"
                          )}>
                            {formData.system_role === role.id && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", formData.system_role === role.id ? "text-orange-400" : "text-zinc-200")}>{role.label}</p>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{role.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex justify-between">
            {step > 1 ? (
              <button type="button" onClick={prevStep} className="px-4 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-100 flex items-center gap-2">
                <ChevronLeft size={16} /> Voltar
              </button>
            ) : <div />}
            
            <button 
              type="submit" 
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                step === 3 ? "Concluir Admissão" : <>Avançar <ChevronRight size={18} /></>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;