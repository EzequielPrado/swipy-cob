"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  ShoppingBag, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Globe,
  Settings2,
  RefreshCw,
  Info
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const Integrations = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);

  const fetchIntegrations = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations' as any)
        .select('*')
        .eq('user_id', effectiveUserId);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (err) {
      console.error("Erro ao carregar integrações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [effectiveUserId]);

  const nuvemshopConn = integrations.find(i => i.provider === 'nuvemshop');

  const handleConnectNuvemshop = () => {
    // URL Real de autorização da Nuvemshop (Exemplo)
    // Você precisa criar um App no painel de parceiros da Nuvemshop para ter o CLIENT_ID
    const CLIENT_ID = 'SEU_CLIENT_ID'; 
    const REDIRECT_URI = `${window.location.origin}/integrations/nuvemshop/callback`;
    const authUrl = `https://www.nuvemshop.com.br/apps/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    
    // Se não tiver ClientID ainda, mostramos o aviso para evitar o 404
    if (CLIENT_ID === 'SEU_CLIENT_ID') {
       showError("Configure seu Client ID da Nuvemshop nas configurações do App.");
       return;
    }

    window.location.href = authUrl;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Zap className="text-orange-500" size={32} /> Central de Integrações
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Conecte sua loja virtual e centralize seus pedidos automaticamente.</p>
          </div>
          <button 
            onClick={fetchIntegrations}
            className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* CARD NUVEMSHOP */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative",
            nuvemshopConn?.status === 'active' ? "border-emerald-500/20" : "border-apple-border hover:border-orange-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-[#000000] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <img src="https://assets.nuvemshop.com.br/marketing/brand/nuvemshop-logo-square-blue.png" alt="Nuvemshop" className="w-full h-full object-contain invert" />
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  nuvemshopConn?.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-apple-offWhite text-apple-muted border-apple-border"
                )}>
                  {nuvemshopConn?.status === 'active' ? 'Conectado' : 'Disponível'}
                </span>
              </div>

              <h3 className="text-xl font-black text-apple-black">Nuvemshop</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Sincronize pedidos, estoque e clientes da maior plataforma de e-commerce da América Latina.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-apple-dark">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Sincronização de Pedidos
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-apple-dark">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Atualização de Estoque
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-apple-dark">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Cadastro de Clientes
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {nuvemshopConn?.status === 'active' ? (
                <button className="w-full bg-apple-offWhite hover:bg-apple-light border border-apple-border text-apple-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <Settings2 size={18} /> CONFIGURAR
                </button>
              ) : (
                <button 
                  onClick={handleConnectNuvemshop}
                  className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Globe size={18} className="text-orange-500" /> CONECTAR LOJA
                </button>
              )}
            </div>

            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
               <ShoppingBag size={150} />
            </div>
          </div>

          {/* CARD PLACEHOLDER PARA FUTURAS */}
          <div className="bg-apple-offWhite border border-dashed border-apple-border rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center opacity-60">
             <div className="w-16 h-16 bg-apple-white rounded-full flex items-center justify-center shadow-inner mb-4">
                <ShoppingBag size={24} className="text-apple-muted" />
             </div>
             <h4 className="text-sm font-black text-apple-muted uppercase tracking-widest">Shopify & Mais</h4>
             <p className="text-[10px] text-apple-muted mt-2 font-bold italic">Novas integrações em breve...</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem] flex items-start gap-5">
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <Info className="text-orange-500" size={24} />
           </div>
           <div>
              <h4 className="text-lg font-black text-orange-600 uppercase tracking-widest mb-1">Como funciona?</h4>
              <p className="text-sm text-orange-800 font-medium leading-relaxed">
                Para conectar, você precisa registrar este App no **Painel de Parceiros da Nuvemshop**. Lá você receberá um `Client ID` e um `Client Secret`. Sem essas chaves, a Nuvemshop não reconhecerá a tentativa de conexão.
              </p>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Integrations;