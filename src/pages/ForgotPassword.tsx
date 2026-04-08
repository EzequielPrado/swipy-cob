"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const redirectBase = window.location.origin.replace(/\/$/, '');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectBase}/resetar-senha`,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Link de recuperação enviado para seu e-mail!');
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-12 h-12 object-contain" />
            <span className="text-4xl font-bold tracking-tighter">Swipy</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Recuperar senha</h2>
          <p className="text-zinc-400 mt-2 text-sm">Insira seu e-mail para receber as instruções.</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleResetRequest} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@empresa.com" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-zinc-950 font-black py-4 rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Enviar link de acesso
                  <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors pt-2">
              <ArrowLeft size={16} /> Voltar para o login
            </Link>
          </form>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto border border-orange-500/20">
              <Mail className="text-orange-500" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Verifique seu e-mail</h3>
              <p className="text-sm text-zinc-400">Enviamos um link de redefinição para <strong>{email}</strong>. Caso não receba, verifique a caixa de spam.</p>
            </div>
            <Link to="/login" className="block w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all">
              Voltar para o Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;