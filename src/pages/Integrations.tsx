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
  ShieldCheck,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from '@/utils/toast';

const Integrations = () => {
  const { effectiveUserId, systemRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);

  // Estados para o Modal da Nuvemshop
  const [isNuvemModalOpen, setIsNuvemModalOpen] = useState(false);
  const [storeName, setStoreName] = useState('');

  const fetchIntegrations = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      // Buscamos as integrações vinculadas ao dono da conta (effectiveUserId)
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', effectiveUserId);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar integrações:", err);
      showError("Falha ao sincronizar estado das integrações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [effectiveUserId]);

  const nuvemshopConn = integrations.find(i => i.provider === 'nuvemshop');

  const handleRedirectToNuvemshop = () => {
    if (!storeName.trim()) {
      showError("Por favor, digite o nome da sua loja.");
      return;
    }
    
    // Limpar o nome da loja (remover espaços e caracteres especiais comuns de URL)
    const cleanStoreName = storeName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const CLIENT_ID = "28762"; // Seu Client ID oficial
    
    const authUrl = `https://${cleanStoreName}.lojavirtualnuvem.com.br/admin/apps/${CLIENT_ID}/authorize`;
    window.location.href = authUrl;
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm("Deseja realmente desconectar? Os pedidos deixarão de ser importados para o ERP.")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showSuccess("Loja desconectada com sucesso!");
      // Limpa o estado local imediatamente para refletir a mudança
      setIntegrations(prev => prev.filter(i => i.id !== id));
      await fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = nuvemshopConn?.status === 'active';

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Zap className="text-orange-500" size={32} /> Central de Integrações
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Conecte seus canais de venda e centralize seus pedidos.</p>
          </div>
          <button 
            onClick={fetchIntegrations}
            disabled={loading}
            className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* CARD NUVEMSHOP REESTRUTURADO */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative min-h-[420px]",
            isConnected ? "border-emerald-500/20 bg-emerald-50/5 shadow-emerald-500/5" : "border-apple-border hover:border-orange-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-[#000000] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <img src="https://assets.nuvemshop.com.br/marketing/brand/nuvemshop-logo-square-blue.png" alt="Nuvemshop" className="w-full h-full object-contain invert" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  isConnected ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-apple-offWhite text-apple-muted border-apple-border"
                )}>
                  {isConnected ? 'Ativa' : 'Desconectada'}
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">Nuvemshop</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Integração completa com importação automática de pedidos e clientes para o Swipy ERP.
              </p>

              {isConnected ? (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner animate-in fade-in zoom-in duration-500">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Sistema Sincronizado
                   </p>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Webhook Operacional
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Fluxo de Pedidos Ativo
                   </div>
                   <p className="text-[9px] text-apple-muted mt-2 font-mono">Loja ID: {nuvemshopConn.store_id}</p>
                </div>
              ) : (
                <div className="mt-8 bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                   <p className="text-[10px] text-orange-600 font-bold uppercase leading-relaxed">
                     Aumente sua produtividade faturando seus pedidos da Nuvemshop diretamente pelo Swipy.
                   </p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {isConnected ? (
                <div className="space-y-4">
                   <button 
                    onClick={() => handleDeleteIntegration(nuvemshopConn.id)}
                    disabled={loading}
                    className="w-full bg-white text-red-500 font-black py-4 rounded-2xl border-2 border-red-50 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95 disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} DESCONECTAR ESTA LOJA
                   </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={() => setIsNuvemModalOpen(true)}
                    className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Globe size={18} className="text-orange-500" /> CONECTAR MINHA LOJA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PLACEHOLDER OUTRAS */}
          <div className="bg-apple-offWhite border border-dashed border-apple-border rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center opacity-60">
             <div className="w-16 h-16 bg-apple-white rounded-full flex items-center justify-center shadow-inner mb-4">
                <ShoppingBag size={24} className="text-apple-muted" />
             </div>
             <h4 className="text-sm font-black text-apple-muted uppercase tracking-widest">Shopify & Marketplace</h4>
             <p className="text-[10px] text-apple-muted mt-2 font-bold italic">Novas conexões em desenvolvimento...</p>
          </div>
        </div>
      </div>

      {/* MODAL DE CONEXÃO NUVEMSHOP */}
      <Dialog open={isNuvemModalOpen} onOpenChange={setIsNuvemModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Globe size={24} />
              </div>
              Vincular Nuvemshop
            </DialogTitle>
            <p className="text-xs text-apple-muted font-bold mt-4 uppercase tracking-widest">Configuração da Loja</p>
          </DialogHeader>
          
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Identificador da Loja (Subdomínio)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={storeName} 
                  onChange={e => setStoreName(e.target.value)} 
                  placeholder="ex: minha-loja-oficial" 
                  className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-orange-500/10 text-lg" 
                  autoFocus
                />
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                 <AlertTriangle className="text-blue-500 shrink-0 mt-1" size={16} />
                 <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                   Digite o nome que aparece na URL do seu painel administrativo. 
                   Ex: <strong>loja-xyz</strong>.lojavirtualnuvem.com.br
                 </p>
              </div>
            </div>

            <button 
              onClick={handleRedirectToNuvemshop}
              className="w-full bg-apple-black text-white font-black py-5 rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-zinc-800 text-base"
            >
              AUTORIZAR ACESSO <ArrowRight size={20} />
            </button>
            
            <p className="text-[10px] text-center text-apple-muted font-bold uppercase tracking-widest">
              Você será redirecionado para a Nuvemshop
            </p>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
};

export default Integrations;