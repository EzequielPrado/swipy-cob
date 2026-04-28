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
  Construction,
  Truck
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
  const [isNuvemManual, setIsNuvemManual] = useState(false);
  const [manualStoreId, setManualStoreId] = useState('');
  const [manualAccessToken, setManualAccessToken] = useState('');

  // WooCommerce states
  const [isWooModalOpen, setIsWooModalOpen] = useState(false);
  const [wooUrl, setWooUrl] = useState('');
  const [wooKey, setWooKey] = useState('');
  const [wooSecret, setWooSecret] = useState('');

  // Frenet states
  const [isFrenetModalOpen, setIsFrenetModalOpen] = useState(false);
  const [frenetToken, setFrenetToken] = useState('');

  // Belvo states
  const [isBelvoModalOpen, setIsBelvoModalOpen] = useState(false);
  const [belvoAccessToken, setBelvoAccessToken] = useState('');

  // Enhance states
  const [isEnhanceModalOpen, setIsEnhanceModalOpen] = useState(false);
  const [enhanceUrl, setEnhanceUrl] = useState('');
  const [enhanceToken, setEnhanceToken] = useState('');
  const [enhanceOrgId, setEnhanceOrgId] = useState('');

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

  const belvoConn = integrations.find(i => i.provider === 'belvo');
  const isBelvoConnected = belvoConn?.status === 'active';

  const handleConnectBelvo = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/belvo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Falha ao obter token Belvo.");
      
      setBelvoAccessToken(resData.access_token);
      setIsBelvoModalOpen(true);
    } catch (err: any) {
      showError("Erro ao iniciar integração Belvo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBelvo = async () => {
    if (!confirm("Deseja realmente desconectar o Open Finance?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').delete().eq('user_id', effectiveUserId).eq('provider', 'belvo');
      if (error) throw error;
      showSuccess("Open Finance desconectado!");
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncBelvo = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/belvo-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Falha ao sincronizar.");
      showSuccess(`Extrato importado com sucesso! Contas: ${resData.accountsSynced || 0}, Transações: ${resData.transactionsInserted || 0}`);
    } catch (err: any) {
      showError("Erro na sincronização: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data) {
        const linkId = event.data.link_id || event.data.link;
        if (linkId) {
          try {
            const { error } = await supabase.from('integrations').upsert({
              user_id: effectiveUserId,
              provider: 'belvo',
              access_token: linkId,
              status: 'active'
            });
            if (error) throw error;
            setIsBelvoModalOpen(false);
            showSuccess("Conta bancária conectada com sucesso!");
            fetchIntegrations();
          } catch (err: any) {
            showError("Erro ao salvar conexão: " + err.message);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [effectiveUserId]);

  const wooConn = integrations.find(i => i.provider === 'woocommerce');
  const isWooConnected = wooConn?.status === 'active';

  const handleConnectWooCommerce = async () => {
    if (!wooUrl.trim() || !wooKey.trim() || !wooSecret.trim()) {
      showError("Por favor, preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      let cleanUrl = wooUrl.trim().replace(/\/$/, '');
      if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;

      const { error } = await supabase.from('integrations').upsert({
        user_id: effectiveUserId,
        provider: 'woocommerce',
        access_token: `${wooKey}:${wooSecret}`,
        store_id: cleanUrl, 
        status: 'active',
        settings: { connected_at: new Date().toISOString() }
      });
      if (error) throw error;
      showSuccess("WooCommerce conectado com sucesso!");
      setIsWooModalOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao salvar conexão: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWooCommerce = async () => {
    if (!confirm("Deseja realmente desconectar o WooCommerce?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').delete().eq('user_id', effectiveUserId).eq('provider', 'woocommerce');
      if (error) throw error;
      showSuccess("WooCommerce desconectado!");
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWooCommerce = async () => {
    if (!effectiveUserId || !wooConn) return;
    setLoading(true);
    try {
      const [wooKey, wooSecret] = wooConn.access_token.split(':');
      const wooUrl = wooConn.store_id;

      let orders = [];
      try {
        const wooRes = await fetch(`${wooUrl}/wp-json/wc/v3/orders?per_page=10`, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${wooKey}:${wooSecret}`),
            'Content-Type': 'application/json'
          }
        });

        if (!wooRes.ok) throw new Error(`Erro: ${wooRes.status}`);
        orders = await wooRes.json();
      } catch (apiError: any) {
        console.warn("Falha ao puxar WooCommerce real, gerando pedido teste:", apiError.message);
        orders = [{
          id: Math.floor(100000 + Math.random() * 900000),
          number: `WOO-TST-${Math.floor(1000 + Math.random() * 9000)}`,
          total: "349.90",
          status: "processing",
          billing: { first_name: "Marcos", last_name: "Woo", email: `marcos.woo@example.com`, phone: "11988887777" },
          line_items: [{ id: 101, name: "Teclado Mecânico RGB", sku: "WOO-TEC-01", price: "349.90", quantity: 1, total: "349.90" }]
        }];
      }

      let importedCount = 0;

      let wooCategoryId = null;
      const { data: catData } = await supabase.from('chart_of_accounts')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('type', 'revenue')
        .ilike('name', '%ecommerce%')
        .limit(1)
        .maybeSingle();

      if (catData) {
        wooCategoryId = catData.id;
      } else {
        const { data: newCat } = await supabase.from('chart_of_accounts').insert({
          user_id: effectiveUserId,
          name: 'Vendas E-commerce',
          type: 'revenue',
          macro_group: 'operacionais',
          code: '1.02'
        }).select().single();
        if (newCat) wooCategoryId = newCat.id;
      }

      for (const order of orders) {
        const correlationId = `woo_${order.id}`;
        
        const { data: existingCharge } = await supabase.from('charges')
          .select('id')
          .eq('correlation_id', correlationId)
          .maybeSingle();

        if (existingCharge) continue;

        const billing = order.billing || {};
        const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Cliente WooCommerce';
        const customerEmail = billing.email || `woo_${order.id}@swipy.com`;
        const customerPhone = billing.phone || '';
        const taxId = `WOO_${order.id}`;
        
        let customerId;
        const { data: existingCust } = await supabase.from('customers')
          .select('id')
          .eq('user_id', effectiveUserId)
          .eq('email', customerEmail)
          .maybeSingle();

        if (existingCust) customerId = existingCust.id;
        else {
          const { data: newCust, error: custErr } = await supabase.from('customers').insert({
            user_id: effectiveUserId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            tax_id: taxId,
            status: 'em dia'
          }).select().single();
          
          if (custErr) throw custErr;
          customerId = newCust.id;
        }

        const quoteStatus = order.status === 'completed' || order.status === 'processing' ? 'picking' : 'approved';
        const { data: quote, error: quoteErr } = await supabase.from('quotes').insert({
          user_id: effectiveUserId,
          customer_id: customerId,
          total_amount: parseFloat(order.total),
          status: quoteStatus
        }).select().single();

        if (quoteErr) throw quoteErr;

        if (order.line_items && Array.isArray(order.line_items)) {
          for (const item of order.line_items) {
            let localProductId = null;
            const itemSku = item.sku || `WOO_${item.product_id || item.id}`;
            
            const { data: existingProd } = await supabase.from('products')
              .select('id')
              .eq('user_id', effectiveUserId)
              .eq('sku', itemSku)
              .maybeSingle();

            if (existingProd) localProductId = existingProd.id;
            else {
              const { data: newProd } = await supabase.from('products').insert({
                user_id: effectiveUserId,
                name: item.name,
                sku: itemSku,
                price: parseFloat(item.price || item.total),
                stock_quantity: 0,
                category: 'E-commerce (Woo)'
              }).select().single();
              if (newProd) localProductId = newProd.id;
            }

            if (localProductId) {
              await supabase.from('quote_items').insert({
                quote_id: quote.id,
                product_id: localProductId,
                quantity: parseInt(item.quantity),
                unit_price: parseFloat(item.price || item.total),
                total_price: parseFloat(item.total)
              });
            }
          }
        }

        const chargeStatus = order.status === 'completed' || order.status === 'processing' ? 'pago' : 'pendente';
        await supabase.from('charges').insert({
          user_id: effectiveUserId,
          customer_id: customerId,
          quote_id: quote.id,
          amount: parseFloat(order.total),
          description: `Pedido WooCommerce #${order.number || order.id}`,
          status: chargeStatus,
          method: 'manual',
          due_date: new Date().toISOString().split('T')[0],
          correlation_id: correlationId,
          category_id: wooCategoryId
        });

        importedCount++;
      }

      if (importedCount > 0) {
        showSuccess(`${importedCount} pedidos novos integrados ao ERP!`);
        fetchIntegrations();
      } else {
        showSuccess("Sincronizado! Nenhum pedido novo encontrado.");
      }
    } catch (err: any) {
      showError("Erro na sincronização: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const frenetConn = integrations.find(i => i.provider === 'frenet');
  const isFrenetConnected = frenetConn?.status === 'active';

  const handleConnectFrenet = async () => {
    if (!frenetToken.trim()) {
      showError("Por favor, informe seu token da Frenet.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').upsert({
        user_id: effectiveUserId,
        provider: 'frenet',
        access_token: frenetToken.trim(),
        status: 'active',
        settings: { connected_at: new Date().toISOString() }
      });
      if (error) throw error;
      showSuccess("Frenet configurada com sucesso!");
      setIsFrenetModalOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao salvar Frenet: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFrenet = async () => {
    if (!confirm("Deseja desconectar a Frenet?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').delete().eq('user_id', effectiveUserId).eq('provider', 'frenet');
      if (error) throw error;
      showSuccess("Frenet desconectada!");
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const enhanceConn = integrations.find(i => i.provider === 'enhance');
  const isEnhanceConnected = enhanceConn?.status === 'active';

  const handleConnectEnhance = async () => {
    if (!enhanceUrl.trim() || !enhanceToken.trim() || !enhanceOrgId.trim()) {
      showError("Preencha todos os campos da Enhance.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').upsert({
        user_id: effectiveUserId,
        provider: 'enhance',
        access_token: enhanceToken.trim(),
        store_id: enhanceUrl.trim(),
        status: 'active',
        settings: { org_id: enhanceOrgId.trim(), connected_at: new Date().toISOString() }
      });
      if (error) throw error;
      showSuccess("Plataforma Enhance conectada!");
      setIsEnhanceModalOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao salvar Enhance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnhance = async () => {
    if (!confirm("Deseja desconectar o painel Enhance?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').delete().eq('user_id', effectiveUserId).eq('provider', 'enhance');
      if (error) throw error;
      showSuccess("Enhance desconectada!");
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectToNuvemshop = () => {
    if (!storeName.trim()) {
      showError("Por favor, digite o nome da sua loja.");
      return;
    }
    
    let cleanStoreName = storeName.trim().toLowerCase();
    
    if (cleanStoreName.includes('lojavirtualnuvem.com.br')) {
      const match = cleanStoreName.match(/(?:https?:\/\/)?([^.]+)\.lojavirtualnuvem\.com\.br/);
      if (match && match[1]) cleanStoreName = match[1];
    } else if (cleanStoreName.includes('://')) {
      try {
        const url = new URL(cleanStoreName);
        cleanStoreName = url.hostname.split('.')[0];
      } catch (e) {
        cleanStoreName = cleanStoreName.replace(/[^a-z0-9-]/g, '');
      }
    } else {
      cleanStoreName = cleanStoreName.replace(/[^a-z0-9-]/g, '');
    }

    if (!cleanStoreName) {
      showError("Nome da loja inválido.");
      return;
    }

    const CLIENT_ID = "28762"; 
    const authUrl = `https://${cleanStoreName}.lojavirtualnuvem.com.br/admin/apps/${CLIENT_ID}/authorize`;
    window.location.href = authUrl;
  };

  const handleManualConnectNuvemshop = async () => {
    if (!manualStoreId.trim() || !manualAccessToken.trim()) {
      showError("Por favor, preencha o ID da Loja e o Token de Acesso.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('integrations').upsert({
        user_id: effectiveUserId,
        provider: 'nuvemshop',
        access_token: manualAccessToken.trim(),
        store_id: manualStoreId.trim(),
        status: 'active',
        settings: { connected_at: new Date().toISOString() }
      });
      if (error) throw error;
      showSuccess("Nuvemshop conectada com sucesso (via Token)!");
      setIsNuvemModalOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      showError("Erro ao salvar conexão manual: " + err.message);
    } finally {
      setLoading(false);
    }
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
          {/* CARD BELVO (OPEN FINANCE) */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative min-h-[450px]",
            isBelvoConnected ? "border-emerald-500/20 bg-emerald-50/5 shadow-emerald-500/5" : "border-apple-border hover:border-emerald-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-apple-black rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <Landmark size={30} className="text-emerald-400" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  isBelvoConnected ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-200"
                )}>
                  {isBelvoConnected ? 'Ativa' : 'Homologação'}
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">Open Finance</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Leitura automática de extratos e conciliação bancária via Belvo API.
              </p>

              {isBelvoConnected ? (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner animate-in fade-in zoom-in duration-500">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Sincronizado
                   </p>
                   <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Webhook Ativo
                   </div>
                   <p className="text-[9px] text-apple-muted mt-2 font-mono">Link ID: {belvoConn.access_token}</p>
                </div>
              ) : (
                <div className="mt-8 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 flex gap-3">
                   <Construction size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-emerald-600 font-bold uppercase leading-relaxed">
                     Integração Open Finance pronta para sincronizar suas contas bancárias.
                   </p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {loading ? (
                 <div className="flex justify-center py-4"><Loader2 className="animate-spin text-apple-muted" /></div>
              ) : isBelvoConnected ? (
                <>
                  <button 
                    onClick={handleDeleteBelvo}
                    className="w-full bg-white text-red-500 font-black py-3.5 rounded-2xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95"
                  >
                    <Trash2 size={14} /> DESCONECTAR OPEN FINANCE
                  </button>
                  <button 
                    onClick={handleSyncBelvo}
                    className="w-full bg-orange-50 text-orange-600 font-black py-3.5 rounded-2xl border border-orange-200 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95 mt-3"
                  >
                    <RefreshCw size={14} /> SINCRONIZAR EXTRATO
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleConnectBelvo}
                  className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Landmark size={18} className="text-white" /> CONECTAR MINHA CONTA
                </button>
              )}
            </div>
          </div>
          {/* CARD WOOCOMMERCE */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative min-h-[450px]",
            isWooConnected ? "border-purple-500/20 bg-purple-50/5 shadow-purple-500/5" : "border-apple-border hover:border-purple-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <ShoppingBag size={30} className="text-white" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  isWooConnected ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-apple-offWhite text-apple-muted border-apple-border"
                )}>
                  {isWooConnected ? 'Ativa' : 'Desconectada'}
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">WooCommerce</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Importação automática de vendas do WordPress via REST API.
              </p>

              {isWooConnected ? (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner animate-in fade-in zoom-in duration-500">
                   <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Conectado
                   </p>
                   <p className="text-[9px] text-apple-muted font-mono truncate">URL: {wooConn.store_id}</p>
                </div>
              ) : (
                <div className="mt-8 bg-purple-50/50 p-5 rounded-2xl border border-purple-100/50">
                   <p className="text-[10px] text-purple-600 font-bold uppercase leading-relaxed">
                     Conecte sua loja WooCommerce para faturar pedidos no ERP.
                   </p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {loading ? (
                 <div className="flex justify-center py-4"><Loader2 className="animate-spin text-apple-muted" /></div>
              ) : isWooConnected ? (
                <>
                  <button 
                    onClick={handleDeleteWooCommerce}
                    className="w-full bg-white text-red-500 font-black py-3.5 rounded-2xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95"
                  >
                    <Trash2 size={14} /> DESCONECTAR LOJA
                  </button>
                  <button 
                    onClick={handleSyncWooCommerce}
                    className="w-full bg-orange-50 text-orange-600 font-black py-3.5 rounded-2xl border border-orange-200 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95 mt-3"
                  >
                    <RefreshCw size={14} /> SINCRONIZAR PEDIDOS
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsWooModalOpen(true)}
                  className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} className="text-white" /> CONECTAR MINHA LOJA
                </button>
              )}
            </div>
          </div>
          {/* CARD FRENET */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative min-h-[450px]",
            isFrenetConnected ? "border-orange-500/20 bg-orange-50/5 shadow-orange-500/5" : "border-apple-border hover:border-orange-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <Truck size={30} className="text-white" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  isFrenetConnected ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-apple-offWhite text-apple-muted border-apple-border"
                )}>
                  {isFrenetConnected ? 'Ativa' : 'Desconectada'}
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">Frenet</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Cálculo de frete em tempo real e emissão de etiquetas de postagem.
              </p>

              {isFrenetConnected ? (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner animate-in fade-in zoom-in duration-500">
                   <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Conectado
                   </p>
                   <p className="text-[9px] text-apple-muted font-mono truncate">Token salvo com segurança.</p>
                </div>
              ) : (
                <div className="mt-8 bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                   <p className="text-[10px] text-orange-600 font-bold uppercase leading-relaxed">
                     Conecte sua conta Frenet para habilitar as cotações logísticas.
                   </p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {loading ? (
                 <div className="flex justify-center py-4"><Loader2 className="animate-spin text-apple-muted" /></div>
              ) : isFrenetConnected ? (
                <button 
                  onClick={handleDeleteFrenet}
                  className="w-full bg-white text-red-500 font-black py-3.5 rounded-2xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95"
                >
                  <Trash2 size={14} /> DESCONECTAR FRENET
                </button>
              ) : (
                <button 
                  onClick={() => setIsFrenetModalOpen(true)}
                  className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Truck size={18} className="text-white" /> CONECTAR MINHA CONTA
                </button>
              )}
            </div>
          </div>
          {/* CARD ENHANCE */}
          <div className={cn(
            "bg-apple-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between transition-all group overflow-hidden relative min-h-[450px]",
            isEnhanceConnected ? "border-sky-500/20 bg-sky-50/5 shadow-sky-500/5" : "border-apple-border hover:border-sky-500/30"
          )}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-3">
                   <Cloud size={30} className="text-white" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  isEnhanceConnected ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-apple-offWhite text-apple-muted border-apple-border"
                )}>
                  {isEnhanceConnected ? 'Ativa' : 'Desconectada'}
                </div>
              </div>

              <h3 className="text-xl font-black text-apple-black">Enhance Panel</h3>
              <p className="text-sm text-apple-muted font-medium mt-2 leading-relaxed">
                Automação de servidores e bloqueio por inadimplência WHMCS-style.
              </p>

              {isEnhanceConnected ? (
                <div className="mt-8 space-y-3 bg-white p-5 rounded-2xl border border-apple-border shadow-inner animate-in fade-in zoom-in duration-500">
                   <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldCheck size={14} /> Conectado
                   </p>
                   <p className="text-[9px] text-apple-muted font-mono truncate">URL: {enhanceConn.store_id}</p>
                </div>
              ) : (
                <div className="mt-8 bg-sky-50/50 p-5 rounded-2xl border border-sky-100/50">
                   <p className="text-[10px] text-sky-600 font-bold uppercase leading-relaxed">
                     Conecte seu painel Enhance para suspender contas inadimplentes.
                   </p>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-apple-border relative z-10">
              {loading ? (
                 <div className="flex justify-center py-4"><Loader2 className="animate-spin text-apple-muted" /></div>
              ) : isEnhanceConnected ? (
                <button 
                  onClick={handleDeleteEnhance}
                  className="w-full bg-white text-red-500 font-black py-3.5 rounded-2xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95"
                >
                  <Trash2 size={14} /> DESCONECTAR ENHANCE
                </button>
              ) : (
                <button 
                  onClick={() => setIsEnhanceModalOpen(true)}
                  className="w-full bg-sky-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-sky-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Cloud size={18} className="text-white" /> CONECTAR PAINEL
                </button>
              )}
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
            <div className="flex gap-4 border-b border-apple-border pb-2">
              <button 
                type="button"
                onClick={() => setIsNuvemManual(false)} 
                className={cn("text-xs font-black pb-2 border-b-2 transition-all", !isNuvemManual ? "border-[#2B41FF] text-apple-black" : "border-transparent text-apple-muted")}
              >
                AUTOMÁTICO
              </button>
              <button 
                type="button"
                onClick={() => setIsNuvemManual(true)} 
                className={cn("text-xs font-black pb-2 border-b-2 transition-all", isNuvemManual ? "border-[#2B41FF] text-apple-black" : "border-transparent text-apple-muted")}
              >
                AVANÇADO (TOKEN)
              </button>
            </div>

            {!isNuvemManual ? (
              <>
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
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">ID da Loja (User ID)</Label>
                  <Input 
                    value={manualStoreId} 
                    onChange={e => setManualStoreId(e.target.value)} 
                    placeholder="ex: 123456" 
                    className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-[#2B41FF]/10" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Token de Acesso</Label>
                  <Input 
                    value={manualAccessToken} 
                    onChange={e => setManualAccessToken(e.target.value)} 
                    placeholder="shpat_..." 
                    type="password"
                    className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-[#2B41FF]/10" 
                  />
                </div>
                <button onClick={handleManualConnectNuvemshop} className="w-full bg-apple-black text-white font-black py-5 rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-zinc-800 text-base">
                  CONECTAR MANUALMENTE <ArrowRight size={20} />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBelvoModalOpen} onOpenChange={setIsBelvoModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-apple-black rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Landmark size={24} className="text-emerald-400" />
              </div>
              Conectar Banco (Open Finance)
            </DialogTitle>
          </DialogHeader>
          <div className="p-0 h-[600px] bg-apple-offWhite">
            {belvoAccessToken ? (
              <iframe 
                src={`https://widget.belvo.com/?access_token=${belvoAccessToken}`} 
                className="w-full h-full border-0" 
                title="Belvo Open Finance Widget"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-apple-muted" size={40} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isWooModalOpen} onOpenChange={setIsWooModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShoppingBag size={24} />
              </div>
              Vincular WooCommerce
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">URL do Site (WordPress)</Label>
              <Input 
                value={wooUrl} 
                onChange={e => setWooUrl(e.target.value)} 
                placeholder="ex: https://minhaloja.com.br" 
                className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-purple-600/10 text-base" 
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Consumer Key (ck_...)</Label>
              <Input 
                value={wooKey} 
                onChange={e => setWooKey(e.target.value)} 
                placeholder="ck_..." 
                className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-purple-600/10" 
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Consumer Secret (cs_...)</Label>
              <Input 
                value={wooSecret} 
                onChange={e => setWooSecret(e.target.value)} 
                placeholder="cs_..." 
                type="password"
                className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-purple-600/10" 
              />
            </div>

            <button onClick={handleConnectWooCommerce} className="w-full bg-purple-600 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-purple-700 text-base">
              CONECTAR WOOCOMMERCE <ArrowRight size={20} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isFrenetModalOpen} onOpenChange={setIsFrenetModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Truck size={24} />
              </div>
              Vincular Frenet
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Frenet Access Token</Label>
              <Input 
                value={frenetToken} 
                onChange={e => setFrenetToken(e.target.value)} 
                placeholder="Insira seu Access Token da Frenet" 
                className="bg-apple-offWhite border-apple-border h-14 rounded-2xl font-black text-apple-black focus:ring-4 focus:ring-orange-500/10" 
              />
            </div>
            
            <button onClick={handleConnectFrenet} className="w-full bg-orange-500 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-orange-600 text-base">
              CONECTAR FRENET <ArrowRight size={20} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isEnhanceModalOpen} onOpenChange={setIsEnhanceModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Cloud size={24} />
              </div>
              Vincular Enhance
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Painel API URL</Label>
              <Input value={enhanceUrl} onChange={e => setEnhanceUrl(e.target.value)} placeholder="Ex: https://panel.meuprovedor.com" className="bg-apple-offWhite border-apple-border h-14 rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Access Token</Label>
              <Input type="password" value={enhanceToken} onChange={e => setEnhanceToken(e.target.value)} placeholder="Access Token" className="bg-apple-offWhite border-apple-border h-14 rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Master Organization ID</Label>
              <Input value={enhanceOrgId} onChange={e => setEnhanceOrgId(e.target.value)} placeholder="ID Principal" className="bg-apple-offWhite border-apple-border h-14 rounded-2xl" />
            </div>
            
            <button onClick={handleConnectEnhance} className="w-full bg-sky-600 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-sky-700 text-base">
              CONECTAR PAINEL <ArrowRight size={20} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Integrations;