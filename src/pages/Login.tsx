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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-zinc-950 shadow-lg shadow-orange-500/20 text-xl">S</div>
            <span className="text-2xl font-bold tracking-tight">Swipy <span className="text-orange-500">Cob</span></span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
          <p className="text-zinc-400 mt-2 text-sm">Acesse sua conta para gerenciar suas cobranças.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
                <a href="#" className="text-xs text-orange-500 hover:text-orange-400 transition-colors">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-zinc-950 font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Entrar na conta
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Ainda não tem uma conta?{' '}
          <Link to="/cadastro" className="text-orange-500 font-bold hover:underline">Crie agora</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;