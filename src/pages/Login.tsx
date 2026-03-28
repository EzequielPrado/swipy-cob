"use client";

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      showSuccess('Login realizado com sucesso!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-apple-light text-apple-black flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain" />
            <span className="text-4xl font-extrabold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
          <p className="text-apple-muted mt-2 text-sm font-medium">Acesse sua conta corporativa.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-apple-muted uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted">
                   <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com" 
                  className="w-full bg-apple-offWhite border border-apple-border rounded-xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-apple-black"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-apple-muted uppercase tracking-widest ml-1">Senha</label>
                <Link to="/recuperar-senha" className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-apple-offWhite border border-apple-border rounded-xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-apple-black"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-sm flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Entrar na conta
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-apple-muted text-sm">
          Ainda não tem uma conta?{' '}
          <Link to="/cadastro" className="text-orange-500 font-bold hover:underline">Crie agora</Link>
        </p>

        <div className="pt-8 text-center text-apple-muted opacity-60">
           <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Swipy Fintech LTDA</p>
        </div>
      </div>
    </div>
  );
};

export default Login;