"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const NuvemshopCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState("");
  
  // Trava para o React Strict Mode não rodar a requisição 2x
  const processedCode = useRef<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    
    // Só prossegue se tiver o código, o usuário estiver carregado e AINDA não tiver processado esse código
    if (code && user && processedCode.current !== code) {
      processedCode.current = code;
      finalizeConnection(code);
    }
  }, [user, searchParams]);

  const finalizeConnection = async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/nuvemshop-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro desconhecido retornado pelo servidor.");

      setStatus('success');
      showSuccess("Nuvemshop conectada com sucesso!");
      setTimeout(() => navigate('/configuracoes/integracoes'), 3000);
      
    } catch (err: any) {
      console.error("[NuvemshopCallback] Erro:", err);
      setStatus('error');
      setErrorMessage(err.message || "Falha ao finalizar integração.");
      showError(err.message || "Falha ao finalizar integração.");
    }
  };

  return (
    <div className="min-h-screen bg-apple-light flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-apple-border rounded-[3rem] p-12 text-center shadow-2xl animate-in zoom-in duration-500">
        
        {status === 'processing' && (
          <div className="space-y-6">
            <Loader2 className="animate-spin text-orange-500 mx-auto" size={48} />
            <h2 className="text-2xl font-black text-apple-black tracking-tight">Finalizando Conexão...</h2>
            <p className="text-apple-muted font-medium">Estamos salvando seu token com segurança.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
               <CheckCircle2 className="text-emerald-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-apple-black tracking-tight">Loja Vinculada!</h2>
            <p className="text-apple-muted font-medium">Aguarde, estamos te redirecionando.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <XCircle className="text-red-500 mx-auto" size={48} />
            <h2 className="text-2xl font-black text-apple-black tracking-tight">Erro na Conexão</h2>
            <p className="text-red-500 font-medium text-sm bg-red-50 p-4 rounded-xl border border-red-100">
              {errorMessage}
            </p>
            <p className="text-apple-muted text-xs">Se o erro for relacionado a credenciais, verifique a Edge Function no Supabase.</p>
            <button onClick={() => navigate('/configuracoes/integracoes')} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl mt-4 active:scale-95 transition-all">
              VOLTAR PARA TENTAR NOVAMENTE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NuvemshopCallback;