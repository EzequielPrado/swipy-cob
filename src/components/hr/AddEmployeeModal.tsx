"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, UserPlus, Briefcase, ShieldCheck, ChevronRight, ChevronLeft, CheckCircle2, Copy, FileDown, AlertTriangle, MapPin, FileText, Activity } from 'lucide-react';
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

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

const STEPS = [
  { id: 1, icon: UserPlus, label: 'Identidade' },
  { id: 2, icon: MapPin, label: 'Contato' },
  { id: 3, icon: Briefcase, label: 'Contrato' },
  { id: 4, icon: FileText, label: 'Documentos' },
  { id: 5, icon: Activity, label: 'SST & Acesso' }
];

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [step, setStep] = useState(1);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '', social_name: '', cpf: '', rg_number: '', rg_issuer: '', rg_issue_date: '',
    birth_date: '', gender: 'Não informado', marital_status: 'Solteiro', nationality: 'Brasileira',
    mother_name: '', father_name: '', is_pcd: false, pcd_type: '', race: 'Não informado',
    personal_email: '', email: '', phone: '', landline: '', extension: '',
    zip_code: '', address_street: '', address_number: '', address_complement: '', address_neighborhood: '', address_city: '', address_state: '',
    department: DEPARTMENTS[0], job_role: ROLES[0], employment_type: 'CLT', work_regime: 'Presencial',
    weekly_hours: '44', hire_date: new Date().toISOString().split('T')[0], base_salary: '',
    bank_name: '', bank_agency: '', bank_account_number: '', bank_account_type: 'Corrente', payment_method: 'PIX', pix_key: '',
    ctps_number: '', ctps_series: '', pis_pasep: '', voter_id: '',
    cnh_number: '', cnh_category: '', cnh_expiry: '', health_plan_provider: '', meal_voucher: '', transport_voucher_desc: '',
    blood_type: 'Não informado', allergies: '', aso_admission_date: '', aso_result: 'Apto',
    system_access: false, system_role: 'Nenhum'
  });

  useEffect(() => {
    const checkLimit = async () => {
      if (isOpen && user && profile) {
        setCheckingLimit(true);
        const { count, error } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'Inativo');

        if (!error && count !== null) {
          const maxAllowed = profile.system_plans?.max_employees || 5;
          setLimitExceeded(count >= maxAllowed);
        }
        setCheckingLimit(false);
      }
    };
    checkLimit();
  }, [isOpen, user, profile]);

  const handleCepBlur = async () => {
    const cep = formData.zip_code.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address_street: data.logradouro,
            address_neighborhood: data.bairro,
            address_city: data.localidade,
            address_state: data.uf
          }));
        }
      } catch (err) { console.error("Erro ao buscar CEP", err); }
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.full_name || !formData.cpf)) return showError("Preencha o Nome Completo e CPF.");
    if (step === 5 && formData.system_access && !formData.email) return showError("E-mail corporativo é obrigatório para liberar acesso.");
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const resetForm = () => {
    setStep(1);
    setGeneratedPassword(null);
    setFormData({
      full_name: '', social_name: '', cpf: '', rg_number: '', rg_issuer: '', rg_issue_date: '',
      birth_date: '', gender: 'Não informado', marital_status: 'Solteiro', nationality: 'Brasileira',
      mother_name: '', father_name: '', is_pcd: false, pcd_type: '', race: 'Não informado',
      personal_email: '', email: '', phone: '', landline: '', extension: '',
      zip_code: '', address_street: '', address_number: '', address_complement: '', address_neighborhood: '', address_city: '', address_state: '',
      department: DEPARTMENTS[0], job_role: ROLES[0], employment_type: 'CLT', work_regime: 'Presencial',
      weekly_hours: '44', hire_date: new Date().toISOString().split('T')[0], base_salary: '',
      bank_name: '', bank_agency: '', bank_account_number: '', bank_account_type: 'Corrente', payment_method: 'PIX', pix_key: '',
      ctps_number: '', ctps_series: '', pis_pasep: '', voter_id: '',
      cnh_number: '', cnh_category: '', cnh_expiry: '', health_plan_provider: '', meal_voucher: '', transport_voucher_desc: '',
      blood_type: 'Não informado', allergies: '', aso_admission_date: '', aso_result: 'Apto',
      system_access: false, system_role: 'Nenhum'
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitExceeded) return;
    
    if (step !== 5 && !generatedPassword) return nextStep();
    if (generatedPassword) {
      onClose();
      resetForm();
      return;
    }

    setLoading(true);
    let finalPassword = null;

    try {
      if (formData.system_access) {
        if (!formData.email) throw new Error("E-mail corporativo é obrigatório.");
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
            companyName: profile?.company || profile?.full_name || 'Nossa Empresa'
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Erro na criação do usuário.");
        finalPassword = result.tempPassword;
      }

      const salary = parseFloat(formData.base_salary.replace(',', '.'));
      const mealVoucher = parseFloat(formData.meal_voucher.replace(',', '.'));

      const payload = {
        user_id: user?.id,
        status: 'Ativo',
        full_name: formData.full_name,
        social_name: formData.social_name || null,
        cpf: formData.cpf,
        rg_number: formData.rg_number || null,
        rg_issuer: formData.rg_issuer || null,
        rg_issue_date: formData.rg_issue_date || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender,
        marital_status: formData.marital_status,
        nationality: formData.nationality,
        mother_name: formData.mother_name || null,
        father_name: formData.father_name || null,
        is_pcd: formData.is_pcd,
        pcd_type: formData.pcd_type || null,
        race: formData.race,
        
        personal_email: formData.personal_email || null,
        email: formData.email || null,
        phone: formData.phone || null,
        landline: formData.landline || null,
        extension: formData.extension || null,
        zip_code: formData.zip_code || null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_complement: formData.address_complement || null,
        address_neighborhood: formData.address_neighborhood || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,

        department: formData.department,
        job_role: formData.job_role,
        employment_type: formData.employment_type,
        work_regime: formData.work_regime,
        weekly_hours: parseFloat(formData.weekly_hours) || null,
        hire_date: formData.hire_date || null,
        base_salary: isNaN(salary) ? 0 : salary,
        bank_name: formData.bank_name || null,
        bank_agency: formData.bank_agency || null,
        bank_account_number: formData.bank_account_number || null,
        bank_account_type: formData.bank_account_type,
        payment_method: formData.payment_method,
        pix_key: formData.pix_key || null,

        ctps_number: formData.ctps_number || null,
        ctps_series: formData.ctps_series || null,
        pis_pasep: formData.pis_pasep || null,
        voter_id: formData.voter_id || null,
        cnh_number: formData.cnh_number || null,
        cnh_category: formData.cnh_category || null,
        cnh_expiry: formData.cnh_expiry || null,
        health_plan_provider: formData.health_plan_provider || null,
        meal_voucher: isNaN(mealVoucher) ? null : mealVoucher,
        transport_voucher_desc: formData.transport_voucher_desc || null,

        blood_type: formData.blood_type,
        allergies: formData.allergies || null,
        aso_admission_date: formData.aso_admission_date || null,
        aso_result: formData.aso_result,
        system_access: formData.system_access,
        system_role: formData.system_access ? formData.system_role : 'Nenhum',
      };

      const { error } = await supabase.from('employees').insert(payload);
      if (error) throw error;

      showSuccess("Colaborador registrado com sucesso!");
      onSuccess();

      if (finalPassword) {
        setGeneratedPassword(finalPassword);
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

  const downloadPDF = () => {
    if (!generatedPassword) return;
    const doc = new jsPDF();
    const company = profile?.company || profile?.full_name || 'Nossa Empresa';
    const loginUrl = `${window.location.origin}/login`;

    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22);
    doc.text("Bem-vindo ao ERP!", 20, 30);
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text(`Olá, ${formData.full_name}`, 20, 45);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Seu acesso foi liberado por ${company}. Abaixo estão suas credenciais:`, 20, 55);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(20, 65, 170, 40, 3, 3, "F");
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(`Login (E-mail): ${formData.email}`, 25, 78);
    doc.text(`Senha Temporária: ${generatedPassword}`, 25, 93);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Perfil de Acesso: ${formData.system_role} | Departamento: ${formData.department}`, 20, 120);
    doc.text("Recomendamos que você altere sua senha no primeiro acesso.", 20, 128);
    doc.text(`Acesse em: ${loginUrl}`, 20, 136);
    doc.save(`Acesso_ERP_${formData.full_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[850px] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-[2.5rem] shadow-2xl">
        <div className="bg-apple-offWhite p-8 border-b border-apple-border shrink-0">
          <DialogTitle className="text-2xl font-black flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
               <UserPlus size={20} />
            </div>
            Admissão de Colaborador
          </DialogTitle>
          
          {!generatedPassword && !limitExceeded && !checkingLimit && (
            <div className="flex items-center justify-between gap-2 px-2">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-2 z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all border-2",
                      step === s.id ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" :
                      step > s.id ? "bg-orange-50 border-orange-200 text-orange-500" : "bg-apple-white border-apple-border text-apple-muted"
                    )}>
                      <s.icon size={16} />
                    </div>
                    <span className={cn("text-[9px] uppercase font-black tracking-widest hidden sm:block", step >= s.id ? "text-apple-black" : "text-apple-muted")}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5 rounded-full -mt-5 sm:mt-0", step > s.id ? "bg-orange-500/50" : "bg-apple-border")} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            
            {checkingLimit ? (
               <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                  <p className="text-sm font-black text-apple-muted uppercase tracking-widest">Validando limites do seu plano...</p>
               </div>
            ) : limitExceeded ? (
              <div className="py-12 px-4 text-center space-y-6 animate-in fade-in zoom-in">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
                  <AlertTriangle className="text-red-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-apple-black">Limite de Plano Atingido</h3>
                <p className="text-sm text-apple-muted font-medium leading-relaxed max-w-sm mx-auto">
                  Seu plano atual ({profile?.system_plans?.name || 'Básico'}) permite no máximo <strong>{profile?.system_plans?.max_employees || 5}</strong> colaboradores ativos.
                </p>
              </div>
            ) : generatedPassword ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500 text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-apple-black">Acesso Liberado!</h3>
                <p className="text-sm text-apple-muted font-medium max-w-sm mx-auto leading-relaxed">
                  O colaborador já pode acessar o sistema. Envie as credenciais abaixo ou baixe o PDF.
                </p>
                <div className="bg-apple-offWhite border border-apple-border rounded-[2rem] p-8 mt-6 text-left shadow-sm">
                  <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4">Credenciais de Acesso:</p>
                  <div className="space-y-3 bg-white p-5 rounded-2xl font-mono text-sm border border-apple-border shadow-sm">
                    <p><span className="text-apple-muted font-sans font-bold">Login:</span> <span className="text-emerald-600 font-bold">{formData.email}</span></p>
                    <p><span className="text-apple-muted font-sans font-bold">Senha:</span> <span className="text-orange-500 font-bold">{generatedPassword}</span></p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button type="button" onClick={downloadPDF} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"><FileDown size={18} /> Baixar PDF</button>
                    <button type="button" onClick={copyPassword} className="flex-1 bg-apple-white border border-apple-border hover:bg-apple-light text-apple-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"><Copy size={16} /> Copiar Texto</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nome Completo *</Label><Input required placeholder="Ex: João Silva" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nome Social (Opcional)</Label><Input placeholder="Como prefere ser chamado" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.social_name} onChange={e => setFormData({...formData, social_name: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-apple-dark">CPF *</Label><Input required placeholder="000.000.000-00" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-black text-orange-600" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} /></div>
                      <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-apple-dark">Data Nasc. *</Label><Input required type="date" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">RG</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.rg_number} onChange={e => setFormData({...formData, rg_number: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Órgão (SSP)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20" value={formData.rg_issuer} onChange={e => setFormData({...formData, rg_issuer: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Emissão</Label><Input type="date" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20" value={formData.rg_issue_date} onChange={e => setFormData({...formData, rg_issue_date: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Gênero</Label>
                        <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="Homem cis">Homem cis</SelectItem><SelectItem value="Mulher cis">Mulher cis</SelectItem><SelectItem value="Trans">Trans</SelectItem><SelectItem value="Não-binário">Não-binário</SelectItem><SelectItem value="Não informado">Não informado</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Est. Civil</Label>
                        <Select value={formData.marital_status} onValueChange={v => setFormData({...formData, marital_status: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="Solteiro">Solteiro</SelectItem><SelectItem value="Casado">Casado</SelectItem><SelectItem value="Divorciado">Divorciado</SelectItem><SelectItem value="Viúvo">Viúvo</SelectItem><SelectItem value="União Estável">União Estável</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Raça (IBGE)</Label>
                        <Select value={formData.race} onValueChange={v => setFormData({...formData, race: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="Branca">Branca</SelectItem><SelectItem value="Preta">Preta</SelectItem><SelectItem value="Parda">Parda</SelectItem><SelectItem value="Amarela">Amarela</SelectItem><SelectItem value="Indígena">Indígena</SelectItem><SelectItem value="Não informado">Não informado</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nacionalidade</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nome da Mãe</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nome do Pai</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} /></div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-apple-offWhite border border-apple-border rounded-xl">
                      <Label className="font-bold text-apple-black">É pessoa com deficiência (PCD)?</Label>
                      <Switch checked={formData.is_pcd} onCheckedChange={c => setFormData({...formData, is_pcd: c})} className="data-[state=checked]:bg-orange-500" />
                    </div>
                    {formData.is_pcd && (
                      <div className="space-y-2 animate-in fade-in duration-300"><Label className="text-xs font-bold text-apple-dark">Qual a deficiência? (Ex: Física, Auditiva, Visual)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.pcd_type} onChange={e => setFormData({...formData, pcd_type: e.target.value})} /></div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2">Contatos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Celular (WhatsApp) *</Label><Input required placeholder="(00) 90000-0000" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">E-mail Pessoal</Label><Input type="email" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20" value={formData.personal_email} onChange={e => setFormData({...formData, personal_email: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Telefone Fixo</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-mono" value={formData.landline} onChange={e => setFormData({...formData, landline: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Ramal (Empresa)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-mono" value={formData.extension} onChange={e => setFormData({...formData, extension: e.target.value})} /></div>
                    </div>
                    
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2 mt-8">Endereço Residencial</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">CEP</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-mono" value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} onBlur={handleCepBlur} placeholder="00000-000" /></div>
                      <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-apple-dark">Logradouro (Rua)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.address_street} onChange={e => setFormData({...formData, address_street: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Número</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.address_number} onChange={e => setFormData({...formData, address_number: e.target.value})} /></div>
                      <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-apple-dark">Complemento</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20" value={formData.address_complement} onChange={e => setFormData({...formData, address_complement: e.target.value})} placeholder="Apto, Bloco..." /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Bairro</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.address_neighborhood} onChange={e => setFormData({...formData, address_neighborhood: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Cidade</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">UF</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold uppercase" maxLength={2} value={formData.address_state} onChange={e => setFormData({...formData, address_state: e.target.value})} /></div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2">Vínculo Empregatício</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Departamento</Label>
                        <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border">{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Cargo / Função</Label>
                        <Select value={formData.job_role} onValueChange={v => setFormData({...formData, job_role: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border">{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Vínculo</Label>
                        <Select value={formData.employment_type} onValueChange={v => setFormData({...formData, employment_type: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="CLT">CLT</SelectItem><SelectItem value="PJ">PJ</SelectItem><SelectItem value="Estagiário">Estagiário</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Regime</Label>
                        <Select value={formData.work_regime} onValueChange={v => setFormData({...formData, work_regime: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Híbrido">Híbrido</SelectItem><SelectItem value="Home Office">Home Office</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Horas (Semana)</Label><Input type="number" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.weekly_hours} onChange={e => setFormData({...formData, weekly_hours: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Data Admissão</Label><Input type="date" required className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Salário Bruto (R$)</Label><Input required placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-black text-apple-black" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} /></div>
                    </div>

                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2 mt-8">Dados Bancários (Para Folha)</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Banco</Label><Input placeholder="Ex: Itaú" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} /></div>
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Agência</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.bank_agency} onChange={e => setFormData({...formData, bank_agency: e.target.value})} /></div>
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Conta</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.bank_account_number} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Tipo de Conta</Label>
                        <Select value={formData.bank_account_type} onValueChange={v => setFormData({...formData, bank_account_type: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="Corrente">Corrente</SelectItem><SelectItem value="Poupança">Poupança</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-apple-dark">Chave PIX</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.pix_key} onChange={e => setFormData({...formData, pix_key: e.target.value})} /></div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2">Documentos Legais</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-2"><Label className="text-xs font-bold text-apple-dark">Nº Carteira de Trabalho (CTPS)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.ctps_number} onChange={e => setFormData({...formData, ctps_number: e.target.value})} /></div>
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Série CTPS</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.ctps_series} onChange={e => setFormData({...formData, ctps_series: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">PIS / PASEP</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.pis_pasep} onChange={e => setFormData({...formData, pis_pasep: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Título de Eleitor</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.voter_id} onChange={e => setFormData({...formData, voter_id: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Nº CNH</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.cnh_number} onChange={e => setFormData({...formData, cnh_number: e.target.value})} /></div>
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Categoria CNH</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.cnh_category} onChange={e => setFormData({...formData, cnh_category: e.target.value})} /></div>
                      <div className="space-y-2 col-span-1"><Label className="text-xs font-bold text-apple-dark">Validade CNH</Label><Input type="date" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.cnh_expiry} onChange={e => setFormData({...formData, cnh_expiry: e.target.value})} /></div>
                    </div>

                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2 mt-8">Benefícios</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Plano de Saúde (Operadora)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.health_plan_provider} onChange={e => setFormData({...formData, health_plan_provider: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Vale Refeição / Alimentação (R$)</Label><Input placeholder="0,00" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-black text-apple-black" value={formData.meal_voucher} onChange={e => setFormData({...formData, meal_voucher: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Vale Transporte (Linhas/Rotas)</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.transport_voucher_desc} onChange={e => setFormData({...formData, transport_voucher_desc: e.target.value})} /></div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2">Saúde Ocupacional (SST)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Tipo Sanguíneo</Label>
                        <Select value={formData.blood_type} onValueChange={v => setFormData({...formData, blood_type: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem><SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem><SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem><SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem><SelectItem value="Não informado">Não informado</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Alergias Relevantes</Label><Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Data ASO Admissional</Label><Input type="date" className="bg-apple-offWhite border-apple-border h-12 rounded-xl focus:ring-orange-500/20 font-bold" value={formData.aso_admission_date} onChange={e => setFormData({...formData, aso_admission_date: e.target.value})} /></div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-apple-dark">Resultado ASO</Label>
                        <Select value={formData.aso_result} onValueChange={v => setFormData({...formData, aso_result: v})}>
                          <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-apple-white border-apple-border"><SelectItem value="Apto">Apto</SelectItem><SelectItem value="Inapto">Inapto</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>

                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-apple-border pb-2 mt-8">Acesso ao ERP Swipy</p>
                    <div className="flex items-center justify-between p-5 bg-apple-offWhite border border-apple-border rounded-2xl shadow-sm">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-apple-black">Liberar login de usuário?</Label>
                        <p className="text-[10px] text-apple-muted font-medium">Se ativo, será enviada uma senha provisória.</p>
                      </div>
                      <Switch checked={formData.system_access} onCheckedChange={(c) => setFormData({...formData, system_access: c, system_role: c ? 'Vendas' : 'Nenhum'})} className="data-[state=checked]:bg-orange-500" />
                    </div>

                    {formData.system_access && (
                      <div className="space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-emerald-600">E-mail de Login Corporativo *</Label>
                          <Input type="email" required placeholder="email@empresa.com" className="bg-emerald-50 border-emerald-200 h-12 rounded-xl focus:ring-emerald-500/20 font-bold text-emerald-800" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <Label className="text-[10px] font-black uppercase text-apple-muted tracking-[0.2em]">Perfil de Acesso (RBAC)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {SYSTEM_ROLES.filter(r => r.id !== 'Nenhum').map(role => (
                            <div key={role.id} onClick={() => setFormData({...formData, system_role: role.id})} className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all shadow-sm", formData.system_role === role.id ? "bg-orange-50 border-orange-500" : "bg-apple-white border-apple-border hover:border-orange-200")}>
                              <div className={cn("mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", formData.system_role === role.id ? "border-orange-500" : "border-apple-muted")}>{formData.system_role === role.id && <div className="w-2 h-2 bg-orange-500 rounded-full" />}</div>
                              <div>
                                <p className={cn("text-xs font-black", formData.system_role === role.id ? "text-orange-600" : "text-apple-black")}>{role.label}</p>
                                <p className="text-[10px] text-apple-muted mt-1 leading-relaxed font-medium">{role.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-apple-border bg-apple-offWhite flex justify-between shrink-0">
            {!limitExceeded && !generatedPassword && !checkingLimit && (
              <>
                {step > 1 ? (
                  <button type="button" onClick={prevStep} className="px-6 py-3 text-sm font-bold text-apple-muted hover:text-apple-black flex items-center gap-2 transition-colors"><ChevronLeft size={18} /> Voltar</button>
                ) : <div />}
                <button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 5 ? "Concluir Admissão" : <>Avançar <ChevronRight size={20} /></>)}
                </button>
              </>
            )}
            {limitExceeded && <button type="button" onClick={onClose} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">Entendi</button>}
            {generatedPassword && <button type="button" onClick={() => { onClose(); resetForm(); }} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">Fechar</button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;