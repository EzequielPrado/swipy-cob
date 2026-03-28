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
    fullName: '', cpf: '', email: '', phone: '',
    company: '', tradeName: '', website: '', instagram: '',
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
    if (step === 2 && (!formData.company || !formData.tradeName)) return showError("Razão social e Nome fantasia são obrigatórios.");
    if (step === 3) {
      if (formData.password.length < 6) return showError("A senha deve ter pelo menos 6 caracteres.");
      if (formData.password !== formData.confirmPassword) return showError("As senhas não conferem.");
    }
    setStep(step + 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Criar Usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company: formData.company,
            cpf: formData.cpf,
            phone: formData.phone,
            trade_name: formData.tradeName,
            website: formData.website,
            instagram: formData.instagram,
            plan_id: formData.planId
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário.");

      // 2. Chamar Onboarding (Criar cliente e cobrança na conta do Admin)
      const onboardRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/onboard-merchant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id, planId: formData.planId })
      });

      const onboardData = await onboardRes.json();
      
      showSuccess('Cadastro realizado! Redirecionando...');

      // 3. Se houver cobrança (plano pago), manda para o checkout da mensalidade
      if (onboardData.chargeId) {
        navigate(`/pagar/${onboardData.chargeId}`);
      } else {
        navigate('/login');
      }

    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain drop-shadow-xl" />
            <span className="text-4xl font-bold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Crie sua conta corporativa</h2>
          <p className="text-zinc-400 mt-2 text-sm">Passo {step} de 4</p>
        </div>

        <div className="flex items-center gap-2 px-4">
           {[1, 2, 3, 4].map((s) => (
             <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= s ? "bg-orange-500" : "bg-zinc-800")} />
           ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <form onSubmit={handleRegister} className="p-8 space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><User size={12} /> 1. Administrador da Conta</p>
                <input name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nome completo" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="cpf" required value={formData.cpf} onChange={handleChange} placeholder="CPF" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="E-mail" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="phone" required value={formData.phone} onChange={handleChange} placeholder="WhatsApp" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><Building2 size={12} /> 2. Dados do Negócio</p>
                <input name="company" required value={formData.company} onChange={handleChange} placeholder="Razão Social" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="tradeName" required value={formData.tradeName} onChange={handleChange} placeholder="Nome Fantasia" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><Lock size={12} /> 3. Segurança</p>
                <input name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Crie sua senha" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirme a senha" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6"><Zap size={12} /> 4. Seleção de Plano</p>
                {plansLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : (
                  <div className="space-y-3">
                    {plans.map((p) => (
                      <div key={p.id} onClick={() => setFormData({...formData, planId: p.id})} className={cn("p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between", formData.planId === p.id ? "bg-orange-500/10 border-orange-500" : "bg-zinc-950 border-zinc-800")}>
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", formData.planId === p.id ? "bg-orange-500 text-zinc-950" : "bg-zinc-900 text-zinc-500")}><Zap size={20} /></div>
                          <div><p className="font-bold text-zinc-100">{p.name}</p><p className="text-[10px] text-zinc-500">Até {p.max_employees} colaboradores</p></div>
                        </div>
                        <p className="font-black text-orange-500">{currency.format(p.price)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 bg-zinc-800 text-zinc-100 font-bold py-4 rounded-2xl"><ChevronLeft size={18} className="mx-auto" /></button>}
              {step < 4 ? (
                <button type="button" onClick={nextStep} className="flex-[2] bg-orange-500 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2">Avançar <ArrowRight size={18} /></button>
              ) : (
                <button type="submit" disabled={loading} className="flex-[2] bg-orange-500 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Cadastro"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;