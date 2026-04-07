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
  Cloud,
  PlayCircle,
  Landmark,
  Building,
  Construction
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from '@/utils/toast';

const Integrations = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);

  // Nuvemshop states
  const [isNuvemModalOpen, setIsNuvemModalOpen] = useState(false);
  const [storeName, setStoreName] = useState('');

  const fetchIntegrations = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', effectiveUserId);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar integrações:", err);
      showError("Falha ao sincronizar estado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [effectiveUserId]);

  // NUVEMSHOP
  const nuvemshopConn = integrations.find(i => i.provider === 'nuvemshop');
  const isNuvemshopConnected = nuvemshopConn?.status === 'active';

  const handleRedirectToNuvemshop = () => {
    if (!storeName.trim()) {
      showError("Por favor, digite o nome da sua loja.");
      return;
    }
    const cleanStoreName = storeName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const CLIENT_ID = "28762"; 
    const authUrl = `https://${cleanStoreName}.lojavirtualnuvem.com.br/admin/apps/${CLIENT_ID}/authorize`;
    window.location.href = authUrl;
  };

  const handleDeleteNuvemshop = async () => {
    if (!confirm("Deseja realmente desconectar? Os pedidos deixarão de ser importados para o ERP.")) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/nuvemshop-uninstall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao desinstalar.");
      }
      showSuccess("Loja Nuvemshop desconectada com sucesso!");
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateOrder = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const fakeOrderId = Math.floor(100000 + Math.random() * 900000);
      const taxId = "11122233344";

      let customerId;
      const { data: existingCust } = await supabase.from('customers').select('id').eq('user_id', effectiveUserId).eq('tax_id', taxId).maybeSingle();
      
      if (existingCust) customerId = existingCust.id;
      else {
        const { data: newCust, error: custErr } = await supabase.from('customers').insert({
          user_id: effectiveUserId, name: 'João Nuvemshop (Teste)', email: 'joao.teste@email.com', phone: '11999999999', tax_id: taxId,
          address: { street: 'Rua das Flores', number: '123', complement: 'Apto 42', neighborhood: 'Jardim Primavera', city: 'São Paulo', state: 'SP', zipcode: '01234-567', country: 'BR' },
          status: 'em dia'
        }).select().single();
        if (custErr) throw new Error("Falha ao criar cliente teste: " + custErr.message);
        customerId = newCust.id;
      }

      let productId;
      const { data: existingProd } = await supabase.from('products').select('id').eq('user_id', effectiveUserId).eq('sku', 'TESTE-01').maybeSingle();
      if (existingProd) productId = existingProd.id;
      else {
        const { data: newProd, error: prodErr } = await supabase.from('products').insert({
          user_id: effectiveUserId, name: 'Produto Teste Nuvemshop', sku: 'TESTE-01', price: 199.90, category: 'E-commerce', stock_quantity: 10
        }).select().single();
        if (prodErr) throw new Error("Falha ao criar produto teste: " + prodErr.message);
        productId = newProd.id;
      }

      const { data: quote, error: quoteErr } = await supabase.from('quotes').insert({ user_id: effectiveUserId, customer_id: customerId, total_amount: 199.90, status: 'picking' }).select().single();
      if (quoteErr) throw new Error("Falha ao criar pedido: " + quoteErr.message);

      await supabase.from('quote_items').insert({ quote_id: quote.id, product_id: productId, quantity: 1, unit_price: 199.90, total_price: 199.90 });

      await supabase.from('charges').insert({
        user_id: effectiveUserId, customer_id: customerId, quote_id: quote.id, amount: 199.90, description: `Pedido E-commerce #${fakeOrderId} (SIMULAÇÃO)`,
        status: 'pago', method: 'pix', due_date: new Date().toISOString().split('T')[0], correlation_id: `nuvem_${fakeOrderId}`
      });

      await supabase.from('notifications').insert({ user_id: effectiveUserId, title: 'Nova Venda E-commerce', message: `Pedido simulado #${fakeOrderId} de João Nuvemshop importado com sucesso!`, type: 'success' });
      showSuccess("Pedido simulado! Acesse a tela de Vendas para conferir.");
    } catch (err: any) { showError("Erro na simulação: " + err.message); } finally { setLoading(false); }
  };


  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Zap className="text-orange-500" size={32} /> Central de Integrações
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Conecte seus canais de venda e Open Finance para automatizar seu ERP.</p>
          </div>
          <button 
            onClick={fetchIntegrations}
            disabled={loading}
            className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* CARD NUVEMSHOP */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative min-h-[450px]",
            isNuvemshopConnected ? "border-emerald-500/20 bg-emerald-50/5 shadow-emerald-500/5" : "border-apple-border hover:border-blue-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-[#2B41FF] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <Cloud size={32} className="text-white" fill="currentColor" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  isNuvemshopConnected ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-apple-offWhite text-apple-muted border-apple-border"
                )}>
                  {isNuvemshopConnected ? 'Ativa' : 'Desconectada'}
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">Nuvemshop</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Importação automática de pedidos e clientes para o Swipy ERP.
              </p>

              {isNuvemshopConnected ? (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner animate-in fade-in zoom-in duration-500">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Sincronizado
                   </p>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Webhook Ativo
                   </div>
                   <p className="text-[9px] text-apple-muted mt-2 font-mono">Loja ID: {nuvemshopConn.store_id}</p>
                </div>
              ) : (
                <div className="mt-8 bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                   <p className="text-[10px] text-blue-600 font-bold uppercase leading-relaxed">
                     Conecte sua loja para faturar pedidos automaticamente.
                   </p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {loading ? (
                 <div className="flex justify-center py-4"><Loader2 className="animate-spin text-apple-muted" /></div>
              ) : isNuvemshopConnected ? (
                <>
                  <button 
                    onClick={handleDeleteNuvemshop}
                    className="w-full bg-white text-red-500 font-black py-3.5 rounded-2xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95"
                  >
                    <Trash2 size={14} /> DESCONECTAR ESTA LOJA
                  </button>
                  <button 
                    onClick={handleSimulateOrder}
                    className="w-full bg-orange-50 text-orange-600 font-black py-3.5 rounded-2xl border border-orange-200 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95 mt-3"
                  >
                    <PlayCircle size={14} /> SIMULAR VENDA TESTE
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsNuvemModalOpen(true)}
                  className="w-full bg-[#2B41FF] text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Globe size={18} className="text-white" /> CONECTAR MINHA LOJA
                </button>
              )}
            </div>
          </div>

          {/* CARD BELVO (OPEN FINANCE) - EM BREVE */}
          <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all overflow-hidden relative min-h-[450px]">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-apple-black rounded-2xl flex items-center justify-center shadow-lg p-3">
                   <Landmark size={30} className="text-emerald-400" />
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-orange-50 text-orange-600 border-orange-200">
                  Em Breve
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">Open Finance</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Leitura automática de extratos e conciliação bancária via Belvo API.
              </p>

              <div className="mt-8 bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50 flex gap-3">
                 <Construction size={18} className="text-orange-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] text-orange-600 font-bold uppercase leading-relaxed">
                   Integração em fase final de homologação com a instituição parceira.
                 </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
               <button 
                 disabled
                 className="w-full bg-apple-offWhite text-apple-muted font-black py-4 rounded-2xl border border-apple-border flex items-center justify-center gap-2 cursor-not-allowed"
               >
                 <Landmark size={18} /> DISPONÍVEL EM BREVE
               </button>
            </div>
          </div>

          <div className="bg-apple-offWhite border border-dashed border-apple-border rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center opacity-60">
             <div className="w-16 h-16 bg-apple-white rounded-full flex items-center justify-center shadow-inner mb-4">
                <ShoppingBag size={24} className="text-apple-muted" />
             </div>
             <h4 className="text-sm font-black text-apple-muted uppercase tracking-widest">Outras Integrações</h4>
             <p className="text-[10px] text-apple-muted mt-2 font-bold italic">Em breve novas parcerias...</p>
          </div>
        </div>
      </div>

      <Dialog open={isNuvemModalOpen} onOpenChange={setIsNuvemModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-[#2B41FF] rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Cloud size={24} fill="currentColor" />
              </div>
              Vincular Nuvemshop
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Subdomínio da Loja</Label>
              <Input 
                value={storeName} 
                onChange={e => setStoreName(e.target.value)} 
                placeholder="ex: minha-loja" 
                className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-[#2B41FF]/10 text-lg" 
              />
            </div>
            <button onClick={handleRedirectToNuvemshop} className="w-full bg-[#2B41FF] text-white font-black py-5 rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-blue-700 text-base">
              AUTORIZAR ACESSO <ArrowRight size={20} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Integrations;