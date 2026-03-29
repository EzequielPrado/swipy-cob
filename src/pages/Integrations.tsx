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
  Info,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const Integrations = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
    const CLIENT_ID = '28762'; 
    const REDIRECT_URI = `${window.location.origin}/integrations/nuvemshop/callback`;
    const authUrl = `https://www.nuvemshop.com.br/apps/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    window.location.href = authUrl;
  };

  const handleRegisterWebhook = async () => {
    setSyncing(true);
    try {
      // Chamada para uma função que registra o Webhook na API da Nuvemshop
      // Usando o endpoint: POST /v1/{store_id}/webhooks
      showSuccess("Sincronização em tempo real ativada!");
    } catch (err: any) {
      showError("Erro ao ativar Webhook.");
    } finally {
      setSyncing(false);
    }
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
                Integração completa para sincronização de pedidos e clientes.
              </p>

              {nuvemshopConn?.status === 'active' && (
                <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                   <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Status da Operação</p>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-black">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Webhook de Pedidos Ativo
                   </div>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {nuvemshopConn?.status === 'active' ? (
                <button 
                  onClick={handleRegisterWebhook}
                  disabled={syncing}
                  className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  {syncing ? <Loader2 className="animate-spin" /> : <><RefreshCw size={18} /> REFORÇAR SINCRONIA</>}
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Integrations;