"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, User, Building2, ArrowRight, Loader2, Phone, 
  Globe, Instagram, ChevronLeft, CheckCircle2, Zap, Users, AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    accountType: 'PJ', // 'PF' ou 'PJ'
    fullName: '', cpf: '', email: '', phone: '',
    company: '', tradeName: '', cnpj: '', website: '', instagram: '',
    password: '', confirmPassword: '', planId: ''
  });

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from('system_plans').select('*').eq('is_active', true).order('price', { ascending: true });
      if (data) {
        setPlans(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, planId: data[0].id }));
      }
      setPlansLoading(false);
    };
    fetchPlans();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (step === 1 && (!formData.fullName || !formData.cpf || !formData.email || !formData.phone)) return showError("Preencha os dados do responsável.");
    if (step === 1 && formData.accountType === 'PF') {
      // Se for PF, podemos pular ou simplificar o Passo 2.
      // Por enquanto, vamos apenas garantir que os dados de "empresa" sejam preenchidos com os dados pessoais.
      setFormData(prev => ({ 
        ...prev, 
        company: prev.fullName, 
        tradeName: prev.fullName,
        cnpj: prev.cpf 
      }));
      setStep(3); // Pula direto para senha se for PF? Ou vai para o Passo 2 mais simples?
      return;
    }
    if (step === 2 && (!formData.company || !formData.tradeName || !formData.cnpj)) return showError("Razão social, Nome fantasia e CNPJ são obrigatórios.");
    if (step === 3) {
      if (formData.password.length < 6) return showError("A senha deve ter pelo menos 6 caracteres.");
      if (formData.password !== formData.confirmPassword) return showError("As senhas não conferem.");
    }
    if (step < 4) setStep(step + 1);
  };

  const handleFormSubmit = async () => {
    if (step !== 4) return;
    if (!formData.planId) return showError("Selecione um plano antes de finalizar.");

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            account_type: formData.accountType,
            full_name: formData.fullName,
            company: formData.company,
            cpf: formData.cpf,
            cnpj: formData.cnpj,
            phone: formData.phone,
            trade_name: formData.tradeName,
            website: formData.website,
            instagram: formData.instagram,
            plan_id: formData.planId
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Não foi possível criar o usuário. Tente outro e-mail.");

      const { data: onboardData, error: onboardError } = await supabase.functions.invoke('onboard-merchant', {
        body: { 
          userId: authData.user.id, 
          planId: formData.planId,
          cnpj: formData.cnpj
        }
      });
      
      if (onboardError) {
        console.error("[onboard-merchant] Erro na função:", onboardError);
      }
      
      showSuccess('Cadastro finalizado com sucesso!');

      if (onboardData.chargeId) {
        navigate(`/pagar/${onboardData.chargeId}`);
      } else {
        navigate('/login');
      }

    } catch (err: any) {
      showError(err.message);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < 4) {
        nextStep();
      } else {
        handleFormSubmit();
      }
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-apple-light text-apple-black flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain drop-shadow-xl" />
            <span className="text-4xl font-extrabold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Crie sua conta corporativa</h2>
          <p className="text-apple-muted mt-2 text-sm font-medium">Passo {step} de 4</p>
        </div>

        <div className="flex items-center gap-2 px-4">
           {[1, 2, 3, 4].map((s) => (
             <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= s ? "bg-orange-500" : "bg-apple-border")} />
           ))}
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] shadow-sm overflow-hidden">
          <form onKeyDown={handleKeyDown} onSubmit={(e) => e.preventDefault()} className="p-8 space-y-6">
            
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex bg-apple-offWhite p-1 rounded-2xl border border-apple-border mb-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, accountType: 'PJ'})}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black rounded-xl transition-all",
                      formData.accountType === 'PJ' ? "bg-white text-orange-500 shadow-sm" : "text-apple-muted"
                    )}
                  >
                    PESSOA JURÍDICA (PJ)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, accountType: 'PF'})}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black rounded-xl transition-all",
                      formData.accountType === 'PF' ? "bg-white text-orange-500 shadow-sm" : "text-apple-muted"
                    )}
                  >
                    PESSOA FÍSICA (PF)
                  </button>
                </div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><User size={12} /> 1. Administrador da Conta</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">Nome completo</label>
                  <input name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Seu nome" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">CPF</label>
                  <input name="cpf" required value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">E-mail corporativo</label>
                  <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="email@empresa.com" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">WhatsApp</label>
                  <input name="phone" required value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><Building2 size={12} /> 2. Dados do Negócio</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">Razão Social</label>
                  <input name="company" required value={formData.company} onChange={handleChange} placeholder="Nome jurídico da empresa" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">Nome Fantasia (Marca)</label>
                  <input name="tradeName" required value={formData.tradeName} onChange={handleChange} placeholder="Como sua marca é conhecida" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">CNPJ da Empresa</label>
                  <input name="cnpj" required value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" className="w-full bg-apple-offWhite border border-orange-200 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black font-black text-orange-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-apple-muted ml-1 flex items-center gap-1.5"><Globe size={12} /> Site</label>
                    <input name="website" value={formData.website} onChange={handleChange} placeholder="www.site.com.br" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-apple-muted ml-1 flex items-center gap-1.5"><Instagram size={12} /> Instagram</label>
                    <input name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@suaempresa" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><Lock size={12} /> 3. Segurança</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">Senha de acesso</label>
                  <input name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-apple-muted ml-1">Confirmar senha</label>
                  <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Repita a senha" className="w-full bg-apple-offWhite border border-apple-border rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-apple-black" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><Zap size={12} /> 4. Seleção de Plano</p>
                {plansLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                    <p className="text-xs text-apple-muted">Carregando ofertas...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((p) => (
                      <div 
                        key={p.id} 
                        onClick={() => setFormData({...formData, planId: p.id})} 
                        className={cn(
                          "p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group", 
                          formData.planId === p.id ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/20" : "bg-apple-offWhite border-apple-border hover:border-apple-dark"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", 
                            formData.planId === p.id ? "bg-orange-500 text-white border-orange-600" : "bg-apple-light text-apple-muted border-apple-border group-hover:text-apple-dark"
                          )}>
                            <Zap size={20} className={formData.planId === p.id ? "fill-current" : ""} />
                          </div>
                          <div>
                            <p className="font-bold text-apple-black">{p.name}</p>
                            <p className="text-[10px] text-apple-muted flex items-center gap-1 mt-0.5"><Users size={10} /> Até {p.max_employees} colaboradores</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-orange-500">{currency.format(p.price)}</p>
                          <p className="text-[9px] text-apple-muted font-bold uppercase">Mensal</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)} 
                  disabled={loading}
                  className="flex-1 bg-apple-offWhite hover:bg-apple-border border border-apple-border text-apple-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              {step < 4 ? (
                <button 
                  type="button" 
                  onClick={nextStep} 
                  className="flex-[3] bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 group transition-all"
                >
                  Continuar
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleFormSubmit}
                  disabled={loading || plans.length === 0} 
                  className="flex-[3] bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processando...
                    </>
                  ) : (
                    "Finalizar Cadastro"
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-apple-muted text-sm font-medium">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-orange-500 font-bold hover:underline">Entrar agora</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;