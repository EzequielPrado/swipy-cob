"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { Loader2, CheckCircle2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const NuvemshopCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code && user) {
      finalizeConnection(code);
    } else if (!code) {
       setStatus('error');
       showError("Código de autorização não encontrado.");
    }
  }, [user, searchParams]);

  const finalizeConnection = async (code: string) => {
    try {
      // Aqui chamaríamos uma Edge Function para trocar o CODE pelo ACCESS_TOKEN real
      // Por enquanto, vamos simular a ativação na tabela integrations
      
      const { error } = await supabase
        .from('integrations' as any)
        .upsert({
          user_id: user?.id,
          provider: 'nuvemshop',
          status: 'active',
          store_id: 'loja_exemplo_123', // Seria retornado pela API
          settings: { connected_at: new Date().toISOString() }
        });

      if (error) throw error;

      setStatus('success');
      showSuccess("Nuvemshop conectada com sucesso!");
      setTimeout(() => navigate('/configuracoes/integracoes'), 3000);
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      showError("Falha ao finalizar integração.");
    }
  };

  return (
    <div className="min-h-screen bg-apple-light flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-apple-border rounded-[3rem] p-12 text-center shadow-2xl animate-in zoom-in duration-500">
        
        {status === 'processing' && (
          <div className="space-y-6">
            <Loader2 className="animate-spin text-orange-500 mx-auto" size={48} />
            <h2 className="text-2xl font-black text-apple-black tracking-tight">Sincronizando Loja...</h2>
            <p className="text-apple-muted font-medium">Estamos validando suas credenciais com a Nuvemshop.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
               <CheckCircle2 className="text-emerald-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-apple-black tracking-tight">Conexão Estabelecida!</h2>
            <p className="text-apple-muted font-medium">Sua loja Nuvemshop agora está integrada ao Swipy ERP.</p>
            <div className="pt-6">
               <div className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 py-3 rounded-2xl border border-emerald-100">
                  <ShieldCheck size={14} /> Fluxo de Pedidos Ativado
               </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <XCircle className="text-red-500 mx-auto" size={48} />
            <h2 className="text-2xl font-black text-apple-black tracking-tight">Ops! Algo falhou.</h2>
            <p className="text-apple-muted font-medium">Não conseguimos completar a autorização.</p>
            <button onClick={() => navigate('/configuracoes/integracoes')} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl mt-4">VOLTAR E TENTAR NOVAMENTE</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default NuvemshopCallback;