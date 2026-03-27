"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, ArrowRight, Loader2, CheckCircle2, Factory, ShoppingBag, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";

const Register = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    company: '',
  });
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('plans').select('*').order('price', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setPlans(data);
          setSelectedPlanId(data[0].id);
        }
      });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) return setStep(2);
    
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          company: formData.company,
        },
      },
    });

    if (error) {
      showError(error.message);
      setLoading(false);
    } else if (authData.user) {
      // O trigger handle_new_user já cria o perfil, mas precisamos atualizar o plano
      await supabase.from('profiles')
        .update({ plan_id: selectedPlanId })
        .eq('id', authData.user.id);

      showSuccess('Conta criada com sucesso! Faça login para continuar.');
      navigate('/login');
    }
  };

  const getPlanIcon = (slug: string) => {
    if (slug === 'industria') return <Factory size={24} />;
    if (slug === 'comercial') return <ShoppingBag size={24} />;
    return <Briefcase size={24} />;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain drop-shadow-xl" />
            <span className="text-4xl font-bold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{step === 1 ? "Escolha seu Plano" : "Crie sua conta"}</h2>
          <p className="text-zinc-400 mt-2 text-sm">Passo {step} de 2</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-8">
          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "bg-zinc-900 border-2 p-6 rounded-[2.5rem] cursor-pointer transition-all flex flex-col h-full relative overflow-hidden group",
                    selectedPlanId === plan.id ? "border-orange-500 shadow-2xl shadow-orange-500/10" : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  {selectedPlanId === plan.id && (
                    <div className="absolute top-4 right-4 text-orange-500">
                      <CheckCircle2 size={24} />
                    </div>
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border",
                    selectedPlanId === plan.id ? "bg-orange-500 text-zinc-950 border-orange-400" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                  )}>
                    {getPlanIcon(plan.slug)}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-xs text-zinc-500">R$</span>
                    <span className="text-3xl font-black">{plan.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-[10px] text-zinc-500 font-bold">/mês</span>
                  </div>

                  <div className="space-y-3 flex-1">
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">O que inclui:</p>
                     {plan.modules.map((mod: string) => (
                       <div key={mod} className="flex items-center gap-2 text-xs text-zinc-400 capitalize">
                         <div className="w-1 h-1 rounded-full bg-orange-500" />
                         {mod.replace('_', ' ')}
                       </div>
                     ))}
                     <div className="flex items-center gap-2 text-xs text-orange-400 font-bold">
                        <CheckCircle2 size={12} /> Até {plan.employee_limit} funcionários
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input required type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Empresa</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input required type="text" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
                  <input required type="password" minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="px-8 py-4 rounded-2xl text-zinc-400 font-bold hover:text-zinc-100 transition-all">Voltar</button>
            )}
            <button 
              type="submit"
              disabled={loading || (step === 1 && !selectedPlanId)}
              className="bg-orange-500 text-zinc-950 font-black px-12 py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10 flex items-center gap-2 group disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {step === 1 ? "Prosseguir" : "Finalizar Cadastro"}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Já tem uma conta? <Link to="/login" className="text-orange-500 font-bold hover:underline">Faça login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;