"use client";

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, ArrowRight, Loader2, Phone, Globe, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ScrollArea } from "@/components/ui/scroll-area";

const Register = () => {
  const [loading, setLoading] = useState(false);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      showSuccess('Conta criada com sucesso! Verifique seu e-mail.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain drop-shadow-xl" />
            <span className="text-4xl font-bold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Crie sua conta corporativa</h2>
          <p className="text-zinc-400 mt-2 text-sm">Preencha os dados abaixo para começar a gerenciar sua empresa.</p>
        </div>

        <form onSubmit={handleRegister} className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-8">
              {/* Seção Pessoal */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={12} /> Dados do Responsável
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Nome Completo</label>
                    <input 
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Ex: João Silva" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">CPF</label>
                    <input 
                      name="cpf"
                      required
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">E-mail</label>
                    <input 
                      name="email"
                      type="email" 
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@empresa.com" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Telefone</label>
                    <input 
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Empresa */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Building2 size={12} /> Dados da Empresa
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Razão Social</label>
                    <input 
                      name="company"
                      required
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Nome oficial da empresa" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Nome Fantasia</label>
                    <input 
                      name="tradeName"
                      required
                      value={formData.tradeName}
                      onChange={handleChange}
                      placeholder="Como sua marca é conhecida" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1 flex items-center gap-1.5"><Globe size={12}/> Site (Opcional)</label>
                    <input 
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="www.empresa.com.br" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1 flex items-center gap-1.5"><Instagram size={12}/> Instagram (Opcional)</label>
                    <input 
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="@suaempresa" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Segurança */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Lock size={12} /> Segurança
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Crie uma Senha</label>
                  <input 
                    name="password"
                    type="password" 
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-8 bg-zinc-950/50 border-t border-zinc-800">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-black py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Criar minha conta agora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-orange-500 font-bold hover:underline">Faça login</Link>
        </p>

        <div className="pt-8 text-center opacity-30">
           <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Swipy Fintech LTDA</p>
        </div>
      </div>
    </div>
  );
};

export default Register;