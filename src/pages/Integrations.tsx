"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  ShoppingBag, 
  Loader2, 
  CheckCircle2, 
  Zap,
  Globe,
  RefreshCw,
  Store,
  ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Integrations = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  
  const [storeSlug, setStoreSlug] = useState('');
  const [showConnectForm, setShowConnectForm] = useState(false);

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
    if (!storeSlug) {
      showError("Por favor, digite o nome da sua loja.");
      return;
    }
    const cleanSlug = storeSlug.trim().toLowerCase().replace('.lojavirtualnuvem.com.br', '').replace('.tiendanube.com', '');
    const authUrl = `https://${cleanSlug}.lojavirtualnuvem.com.br/admin/apps/28762/authorize`;
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
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative",
            nuvemshopConn?.status === 'active' ? "border-emerald-500/20 bg-emerald-50/5" : "border-apple-border hover:border-orange-500/30"
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
                Sincronização em tempo real de pedidos e inteligência de estoque.
              </p>

              {nuvemshopConn?.status === 'active' && (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Ativo & Seguro
                   </p>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Webhook de Pedidos Ativo
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Sincronia de Inventário
                   </div>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {nuvemshopConn?.status === 'active' ? (
                <div className="text-center">
                   <p className="text-[10px] text-apple-muted font-bold uppercase italic">Sincronização automática ligada</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  {!showConnectForm ? (
                    <button 
                      onClick={() => setShowConnectForm(true)}
                      className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Globe size={18} className="text-orange-500" /> CONECTAR LOJA
                    </button>
                  ) : (
                    <div className="space-y-4 bg-apple-offWhite p-6 rounded-3xl border border-apple-border">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2">
                          <Store size={12} /> Nome da sua Loja
                        </Label>
                        <Input 
                          placeholder="ex: minha-loja" 
                          value={storeSlug}
                          onChange={(e) => setStoreSlug(e.target.value)}
                          className="bg-white border-apple-border h-12 rounded-xl font-bold"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowConnectForm(false)} className="flex-1 bg-white border border-apple-border text-apple-black font-black py-3 rounded-xl text-xs">VOLTAR</button>
                        <button onClick={handleConnectNuvemshop} className="flex-[2] bg-apple-black text-white font-black py-3 rounded-xl text-xs hover:bg-zinc-800">INSTALAR</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-apple-offWhite border border-dashed border-apple-border rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center opacity-60">
             <div className="w-16 h-16 bg-apple-white rounded-full flex items-center justify-center shadow-inner mb-4">
                <ShoppingBag size={24} className="text-apple-muted" />
             </div>
             <h4 className="text-sm font-black text-apple-muted uppercase tracking-widest">Shopify & Mais</h4>
             <p className="text-[10px] text-apple-muted mt-2 font-bold italic">Novas integrações em breve...</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Integrations;