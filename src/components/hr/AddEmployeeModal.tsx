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
import { Loader2, UserPlus, Briefcase, ShieldCheck, ChevronRight, ChevronLeft, Send, AlertTriangle, Copy } from 'lucide-react';
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
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  
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
    if (step === 1 && formData.system_access && !formData.email) {
      return showError("Para ter acesso ao sistema, o e-mail é obrigatório.");
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const resetForm = () => {
    setStep(1);
    setGeneratedPassword(null);
    setFormData({
      full_name: '', cpf: '', email: '', phone: '',
      department: DEPARTMENTS[0], job_role: ROLES[0], employment_type: 'CLT',
      base_salary: '', hire_date: new Date().toISOString().split('T')[0],
      system_access: false, system_role: 'Nenhum'
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3 && !generatedPassword) return nextStep();
    if (generatedPassword) {
      // Se a senha já foi mostrada, apenas fecha e limpa
      onClose();
      resetForm();
      return;
    }

    setLoading(true);
    let fallbackPassword = null;

    try {
      // 1. Criar o usuário de Acesso e enviar E-mail (Se habilitado)
      if (formData.system_access) {
        if (!formData.email) throw new Error("E-mail é obrigatório para criar acesso.");
        
        const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/invite-employee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            email: formData.email,
            fullName: formData.full_name,
            systemRole: formData.system_role,
            companyName: profile?.company || profile?.full_name || 'Nossa Empresa',
            origin: window.location.origin
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Erro na criação do usuário.");
        }
        
        if (result.warning) {
          // SMTP Falhou! Guardamos a senha para exibir na tela.
          fallbackPassword = result.tempPassword;
          showError("Acesso criado, mas houve falha no SMTP ao enviar o e-mail.");
        } else {
          showSuccess("Acesso criado e e-mail com senha enviado!");
        }
      }

      // 2. Salvar na Folha / RH (Mesmo se o e-mail falhou, o usuário foi criado no Auth)
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

      showSuccess("Colaborador registrado na Folha de Pagamento!");
      onSuccess();

      // 3. Se a senha tiver que ser exibida manualmente, não fechamos o modal, mostramos a senha.
      if (fallbackPassword) {
        setGeneratedPassword(fallbackPassword);
      } else {
        onClose();
        resetForm();
      }

    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(`Olá ${formData.full_name}, seu login no ERP é: ${formData.email} | Senha: ${generatedPassword}`);
      showSuccess("Credenciais copiadas!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !generatedPassword) {
        onClose();
        resetForm();
      } else if (!open && generatedPassword) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[550px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-zinc-950/50 p-6 border-b border-zinc-800 shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2 mb-4">
            <UserPlus className="text-orange-500" size={24} />
            Admissão de Colaborador
          </DialogTitle>
          
          {/* Stepper Visual (Some quando exibe a senha) */}
          {!generatedPassword && (
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
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* SUCESSO SEM SMTP: MOSTRAR A SENHA GERADA MANUALMENTE */}
            {generatedPassword ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500 text-center py-4">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                  <AlertTriangle className="text-yellow-500" size={32} />
                </div>
                <h3 className="text-xl font-bold">Colaborador Cadastrado!</h3>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  O colaborador foi cadastrado no sistema, mas não conseguimos enviar o e-mail automático devido a um problema no seu servidor SMTP. 
                </p>

                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mt-6">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Envie isso para o colaborador:</p>
                  
                  <div className="text-left space-y-3 bg-zinc-900 p-4 rounded-xl font-mono text-sm border border-zinc-800">
                    <p><span className="text-zinc-500">Login:</span> <span className="text-emerald-400">{formData.email}</span></p>
                    <p><span className="text-zinc-500">Senha:</span> <span className="text-orange-400">{generatedPassword}</span></p>
                  </div>

                  <button 
                    type="button" 
                    onClick={copyPassword}
                    className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Copiar Credenciais
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                      <Label>E-mail (Necessário para dar acesso)</Label>
                      <Input type="email" required={formData.system_access} placeholder="joao@empresa.com" className="bg-zinc-950 border-zinc-800 h-11" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>
                )}

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

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-zinc-100">Dar acesso ao sistema Swipy ERP?</Label>
                        <p className="text-[10px] text-zinc-500">Um e-mail será enviado com as credenciais.</p>
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
                        
                        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-4">
                          <Send size={16} className="text-blue-400" />
                          <p className="text-[10px] text-blue-400 leading-tight">Ao concluir, enviaremos um e-mail com a senha temporária para <strong>{formData.email}</strong>.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex justify-between">
            {generatedPassword ? (
              <button 
                type="button" 
                onClick={() => { onClose(); resetForm(); }}
                className="w-full bg-zinc-100 text-zinc-950 font-bold py-3.5 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                Concluir
              </button>
            ) : (
              <>
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
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;