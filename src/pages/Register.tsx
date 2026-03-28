"use client";

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  Loader2, 
  Phone, 
  Globe, 
  Instagram, 
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    email: '',
    phone: '',
    company: '',
    tradeName: '',
    website: '',
    instagram: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.cpf || !formData.email || !formData.phone) {
        return showError("Preencha todos os dados do responsável.");
      }
    }
    if (step === 2) {
      if (!formData.company || !formData.tradeName) {
        return showError("A razão social e o nome fantasia são obrigatórios.");
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      return showError("A senha deve ter pelo menos 6 caracteres.");
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
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
          instagram: formData.instagram
        },
      },
    });

    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      showSuccess('Conta criada com sucesso!');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain drop-shadow-xl" />
            <span className="text-4xl font-bold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Crie sua conta</h2>
          <p className="text-zinc-400 mt-2 text-sm">Passo {step} de 3</p>
        </div>

        {/* Indicador de Progresso */}
        <div className="flex items-center gap-2 px-4">
           {[1, 2, 3].map((s) => (
             <div 
              key={s} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                step >= s ? "bg-orange-500" : "bg-zinc-800"
              )} 
             />
           ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <form onSubmit={handleRegister} className="p-8 space-y-6">
            
            {/* ETAPA 1: DADOS DO RESPONSÁVEL */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                  <User size={12} /> 1. Dados do Administrador
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Nome Completo</label>
                  <input name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Seu nome completo" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">CPF</label>
                  <input name="cpf" required value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">E-mail Corporativo</label>
                  <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="email@empresa.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">WhatsApp</label>
                  <input name="phone" required value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
              </div>
            )}

            {/* ETAPA 2: DADOS DA EMPRESA */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                  <Building2 size={12} /> 2. Informações do Negócio
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Razão Social</label>
                  <input name="company" required value={formData.company} onChange={handleChange} placeholder="Nome oficial (LTDA/ME/Individual)" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Nome Fantasia (Marca)</label>
                  <input name="tradeName" required value={formData.tradeName} onChange={handleChange} placeholder="Ex: Swipy Cobranças" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1 flex items-center gap-1.5"><Globe size={12}/> Site</label>
                    <input name="website" value={formData.website} onChange={handleChange} placeholder="www.site.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xs focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1 flex items-center gap-1.5"><Instagram size={12}/> Instagram</label>
                    <input name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@empresa" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xs focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: SEGURANÇA */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                  <Lock size={12} /> 3. Segurança da Conta
                </p>
                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="text-emerald-500" size={18} />
                    <span>Dados do ADM validados</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="text-emerald-500" size={18} />
                    <span>Empresa configurada</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Crie sua senha secreta</label>
                  <input name="password" type="password" required minLength={6} value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <p className="text-[10px] text-zinc-500 px-2 italic text-center leading-relaxed">
                  Ao clicar em finalizar, você aceita nossos termos de uso e política de privacidade.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} /> Voltar
                </button>
              )}
              
              {step < 3 ? (
                <button 
                  type="button" 
                  onClick={nextStep}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 group"
                >
                  Próxima Etapa
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Cadastro"}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-zinc-500 text-sm">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-orange-500 font-bold hover:underline">Faça login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;