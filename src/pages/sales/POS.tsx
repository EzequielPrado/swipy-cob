"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, 
  CheckCircle2, Loader2, PackageOpen, ArrowRight, User, Contact, Tag, Truck, AlertTriangle, Layers, Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from 'qrcode.react';

const POS = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState('');
  const [freight, setFreight] = useState('');
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Estados Pix Automatizados
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [activePixCharge, setActivePixCharge] = useState<any>(null);
  const [pollingStatus, setPollingStatus] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState({
    customerId: '',
    sellerId: 'none',
    method: 'pix',
    categoryId: ''
  });

  const [customerRisk, setCustomerRisk] = useState<null | 'low' | 'high'>(null);
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [prodRes, custRes, empRes, catRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).order('name'),
      supabase.from('customers').select('id, name, tax_id').eq('user_id', user.id).order('name'),
      supabase.from('employees').select('id, full_name').eq('user_id', user.id).eq('status', 'Ativo').order('full_name'),
      supabase.from('chart_of_accounts').select('id, name').eq('user_id', user.id).eq('type', 'revenue').order('name')
    ]);
    if (prodRes.data) setProducts(prodRes.data);
    
    let finalCustomers = custRes.data || [];
    let finalId = '';

    const generic = finalCustomers.find(c => c.name.toLowerCase().includes('consumidor final'));
    if (generic) {
      finalId = generic.id;
    } else {
      const { data: newCust } = await supabase.from('customers').insert({
        user_id: user.id,
        name: 'Consumidor Final',
        tax_id: '00000000000',
        email: 'consumidor@swipy.com.br',
        phone: '00000000000'
      }).select().single();
      if (newCust) {
        finalCustomers = [...finalCustomers, newCust];
        finalId = newCust.id;
      }
    }

    setCustomers(finalCustomers);
    setCheckoutData(prev => ({ ...prev, customerId: finalId }));

    if (empRes.data) setEmployees(empRes.data);

    let finalCategories = catRes.data || [];
    let defaultCatId = '';

    const coa = finalCategories.find(c => c.name.toLowerCase().includes('frente de caixa')) || 
                finalCategories.find(c => c.name.toLowerCase().includes('venda'));

    if (coa) {
      defaultCatId = coa.id;
    } else {
      const { data: newCoa } = await supabase.from('chart_of_accounts').insert({
        user_id: user.id,
        name: 'Vendas Frente de Caixa',
        type: 'revenue',
        code: '1.01.01'
      }).select().single();
      if (newCoa) {
        finalCategories = [...finalCategories, newCoa];
        defaultCatId = newCoa.id;
      }
    }

    setCategories(finalCategories);
    setCheckoutData(prev => ({ ...prev, categoryId: defaultCatId }));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const checkGlobalRisk = async (customerId: string) => {
    if (!customerId) { setCustomerRisk(null); return; }
    const selected = customers.find(c => c.id === customerId);
    if (!selected) return;
    const cleanTaxId = selected.tax_id?.replace(/\D/g, '') || '';
    if (!cleanTaxId) return;
    
    const { data: globalCharges } = await supabase.from('charges').select('status, customers!inner(tax_id)');
    const clientCharges = globalCharges?.filter((c: any) => c.customers.tax_id?.replace(/\D/g, '') === cleanTaxId) || [];
    const overdue = clientCharges.filter(c => c.status === 'atrasado').length;
    setCustomerRisk(overdue > 0 ? 'high' : 'low');
  };

  useEffect(() => {
    checkGlobalRisk(checkoutData.customerId);
  }, [checkoutData.customerId]);

  // Polling automático do Pix
  useEffect(() => {
    if (!isPixModalOpen || !activePixCharge?.id) return;
    setPollingStatus(true);

    const interval = setInterval(async () => {
      const { data } = await supabase.from('charges').select('status').eq('id', activePixCharge.id).single();
      if (data?.status === 'pago') {
        showSuccess("Pagamento PIX Confirmado com Sucesso!");
        setIsPixModalOpen(false);
        setActivePixCharge(null);
        setPollingStatus(false);
        setCart([]);
        setDiscount('');
        setFreight('');
        setIsCheckoutOpen(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      setPollingStatus(false);
    };
  }, [isPixModalOpen, activePixCharge]);

  const categoriesList = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const subtotalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const discountValue = parseFloat(discount.replace(',', '.')) || 0;
  const freightValue = parseFloat(freight.replace(',', '.')) || 0;
  const totalAmount = Math.max(0, subtotalAmount - discountValue + freightValue);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleCheckout = async () => {
    if (!checkoutData.customerId) return showError("Selecione um cliente.");
    if (!checkoutData.categoryId) return showError("Selecione a classificação contábil.");
    
    setProcessing(true);
    try {
      const { data: quote } = await supabase.from('quotes').insert({ 
        user_id: user?.id, 
        customer_id: checkoutData.customerId, 
        seller_id: checkoutData.sellerId === 'none' ? null : checkoutData.sellerId, 
        total_amount: totalAmount, 
        status: 'completed' 
      }).select().single();
      
      for (const item of cart) {
        await supabase.from('quote_items').insert({ 
          quote_id: quote.id, 
          product_id: item.id, 
          quantity: item.qty, 
          unit_price: item.price, 
          total_price: item.price * item.qty 
        });
      }

      if (checkoutData.method === 'pix') {
        const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ 
            customerId: checkoutData.customerId, 
            amount: totalAmount, 
            description: `Venda PDV #${quote.id.split('-')[0].toUpperCase()}`, 
            method: 'pix', 
            dueDate: new Date().toISOString().split('T')[0], 
            userId: user?.id, 
            origin: window.location.origin,
            quoteId: quote.id
          })
        });
        const result = await response.json();
        
        await supabase.from('charges').update({ category_id: checkoutData.categoryId }).eq('id', result.id);
        
        // Ativar modal Pix em tempo real
        setActivePixCharge({
          id: result.id,
          amount: totalAmount,
          pix_qr_code: result.pix_qr_code,
          pix_qr_image_base64: result.pix_qr_image_base64
        });
        setIsCheckoutOpen(false);
        setIsPixModalOpen(true);
      } else {
        await supabase.from('charges').insert({ 
          user_id: user?.id, 
          customer_id: checkoutData.customerId, 
          amount: totalAmount, 
          status: 'pago', 
          method: checkoutData.method, 
          due_date: new Date().toISOString().split('T')[0],
          category_id: checkoutData.categoryId,
          description: `Venda PDV #${quote.id.split('-')[0].toUpperCase()}`
        });
        showSuccess("Venda finalizada com sucesso!");
        setCart([]);
        setDiscount('');
        setFreight('');
        setIsCheckoutOpen(false);
      }
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setProcessing(false); 
    }
  };

  const getSlickColor = (name: string) => {
    const colors = [
      'from-blue-500 to-indigo-500 text-blue-50',
      'from-purple-500 to-pink-500 text-purple-50',
      'from-orange-500 to-red-500 text-orange-50',
      'from-emerald-500 to-teal-500 text-emerald-50',
      'from-sky-500 to-cyan-500 text-sky-50'
    ];
    let index = 0;
    if (name) index = name.length % colors.length;
    return colors[index];
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6 antialiased">
        {/* Lado Esquerdo - Grade de Produtos Premium */}
        <div className="flex-1 flex flex-col bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm relative">
          <div className="p-6 border-b border-apple-border bg-apple-offWhite/50 backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 z-10">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Pesquisar código, nome ou SKU..." 
                className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all text-apple-black shadow-sm" 
              />
            </div>
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar">
              <button 
                onClick={() => setCategoryFilter('all')} 
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300", 
                  categoryFilter === 'all' 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                    : "bg-apple-white border border-apple-border text-apple-muted hover:border-apple-black hover:text-apple-black"
                )}
              >
                Tudo
              </button>
              {categoriesList.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setCategoryFilter(cat)} 
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300", 
                    categoryFilter === cat 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                      : "bg-apple-white border border-apple-border text-apple-muted hover:border-apple-black hover:text-apple-black"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-apple-muted py-20 opacity-40">
                <PackageOpen size={60} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum produto cadastrado</p>
              </div>
            ) : filteredProducts.map(prod => (
              <button 
                key={prod.id} 
                onClick={() => addToCart(prod)} 
                className="bg-apple-white border border-apple-border/80 p-5 rounded-[2rem] hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300 text-left flex flex-col group relative active:scale-[0.97]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={cn("w-14 h-14 rounded-3xl bg-gradient-to-tr flex items-center justify-center text-lg font-black shadow-md group-hover:scale-105 transition-transform", getSlickColor(prod.name))}>
                    {prod.name.charAt(0).toUpperCase()}
                  </div>
                  {prod.stock_quantity > 0 && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                      Estoque: {prod.stock_quantity}
                    </span>
                  )}
                </div>
                <p className="font-black text-apple-black text-sm line-clamp-2 leading-snug mb-2 group-hover:text-orange-500 transition-colors">
                  {prod.name}
                </p>
                {prod.sku && <p className="text-[10px] text-apple-muted font-bold font-mono tracking-wider mb-4">{prod.sku}</p>}
                <p className="text-xl font-black text-apple-dark mt-auto tracking-tighter">
                  {currencyFormatter.format(prod.price)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito - Carrinho e Subtotal */}
        <div className="w-full lg:max-w-[400px] bg-apple-white border border-apple-border rounded-[2.5rem] shadow-sm flex flex-col shrink-0">
          <div className="p-6 border-b border-apple-border bg-apple-offWhite/50 flex items-center justify-between">
            <h2 className="text-base font-black flex items-center gap-2 text-apple-black">
              <ShoppingCart className="text-orange-500" size={20} /> Checkout PDV
            </h2> 
            <button 
              onClick={() => setCart([])} 
              disabled={cart.length === 0}
              className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline"
            >
              Esvaziar
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-apple-muted py-20 opacity-30">
                <ShoppingCart size={64} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Carrinho Vazio</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="bg-apple-white border border-apple-border p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-orange-500/30 transition-all duration-300">
                <div className="flex-1 overflow-hidden pr-3">
                  <p className="text-sm font-black text-apple-black truncate leading-tight mb-1">{item.name}</p>
                  <p className="text-[11px] text-orange-600 font-bold">{currencyFormatter.format(item.price * item.qty)}</p>
                </div>
                <div className="flex items-center gap-1 bg-apple-offWhite border border-apple-border rounded-xl p-1.5 shadow-inner">
                  <button 
                    onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty-1)} : i))} 
                    className="p-1.5 text-apple-muted hover:text-apple-black transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-black w-6 text-center text-apple-black">{item.qty}</span>
                  <button 
                    onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qty: i.qty+1} : i))} 
                    className="p-1.5 text-apple-muted hover:text-apple-black transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button 
                  onClick={() => setCart(cart.filter(i => i.id !== item.id))} 
                  className="ml-3 p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all duration-300 active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-6 bg-apple-offWhite border-t border-apple-border rounded-b-[2.5rem] space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1"><Tag size={12} /> Desconto (R$)</Label>
                <Input 
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)} 
                  placeholder="0,00" 
                  className="h-12 bg-apple-white border-apple-border rounded-xl text-xs font-black focus:ring-4 focus:ring-orange-500/10" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1"><Truck size={12} /> Frete (R$)</Label>
                <Input 
                  value={freight} 
                  onChange={(e) => setFreight(e.target.value)} 
                  placeholder="0,00" 
                  className="h-12 bg-apple-white border-apple-border rounded-xl text-xs font-black focus:ring-4 focus:ring-orange-500/10" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-apple-border flex items-center justify-between">
              <span className="text-apple-muted font-black uppercase tracking-widest text-[10px]">Total do Pedido</span>
              <span className="text-3xl font-black text-apple-black tracking-tighter">{currencyFormatter.format(totalAmount)}</span>
            </div>
            
            <button 
              onClick={() => setIsCheckoutOpen(true)} 
              disabled={cart.length === 0} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-500/10 text-base active:scale-95 disabled:opacity-30 disabled:active:scale-100"
            >
              FINALIZAR VENDA <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Dialog de Checkout (Revisão e Opções de Pagamento) */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[480px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black">Finalização do Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 text-center shadow-inner">
              <p className="text-[10px] text-orange-600 uppercase tracking-widest font-black mb-1">Total a Receber</p>
              <p className="text-4xl font-black text-orange-500 tracking-tighter">{currencyFormatter.format(totalAmount)}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-apple-muted ml-1"><User size={14} className="text-orange-500" /> Cliente</Label>
                <Select value={checkoutData.customerId} onValueChange={v => setCheckoutData({...checkoutData, customerId: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-xs">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    {customers.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {customerRisk === 'high' && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in duration-300 mt-2">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-black text-red-600 uppercase tracking-widest">Alerta de Inadimplência</p>
                      <p className="text-[10px] text-red-500 font-bold mt-0.5 leading-tight">Este cliente possui faturas vencidas em outros estabelecimentos.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-apple-muted ml-1"><Layers size={14} className="text-orange-500" /> Classificação Contábil</Label>
                <Select value={checkoutData.categoryId} onValueChange={v => setCheckoutData({...checkoutData, categoryId: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    {categories.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-apple-muted ml-1"><Contact size={14} className="text-blue-500" /> Vendedor</Label>
                <Select value={checkoutData.sellerId} onValueChange={v => setCheckoutData({...checkoutData, sellerId: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-xs">
                    <SelectValue placeholder="Selecione o vendedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    <SelectItem value="none" className="font-bold">Venda Direta / Balcão</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id} className="font-bold">{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-apple-border">
              <Label className="text-[10px] uppercase text-apple-muted font-black tracking-widest ml-1">Forma de Recebimento</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {id:'pix', icon:QrCode, label:'PIX'}, 
                  {id:'cartao', icon:CreditCard, label:'Cartão'}, 
                  {id:'dinheiro', icon:Banknote, label:'Dinheiro'}
                ].map(m => (
                  <button 
                    key={m.id} 
                    type="button"
                    onClick={() => setCheckoutData({...checkoutData, method: m.id})} 
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border transition-all gap-2 duration-300", 
                      checkoutData.method === m.id 
                        ? "bg-orange-50 border-orange-500 text-orange-600 shadow-md" 
                        : "bg-apple-offWhite border-apple-border text-apple-muted hover:border-apple-black hover:text-apple-black"
                    )}
                  >
                    <m.icon size={24} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-apple-offWhite border-t border-apple-border">
            <button 
              onClick={handleCheckout} 
              disabled={processing || !checkoutData.customerId} 
              className="w-full bg-apple-black text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:active:scale-100"
            >
              {processing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              CONFIRMAR E FINALIZAR
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pix em Tempo Real (Pop-up do QR Code) */}
      <Dialog open={isPixModalOpen} onOpenChange={setIsPixModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[420px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border text-center flex flex-col items-center">
            <DialogTitle className="text-xl font-black text-apple-black">Aguardando Pagamento Pix</DialogTitle>
            <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest flex items-center gap-1.5 mt-2">
              <Loader2 className="animate-spin" size={12} /> Verificação em tempo real ativa
            </p>
          </DialogHeader>
          
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-apple-offWhite border border-apple-border p-5 rounded-[2rem] shadow-inner flex items-center justify-center bg-white">
              {activePixCharge?.pix_qr_image_base64 ? (
                <img src={activePixCharge.pix_qr_image_base64} className="w-52 h-52 bg-white p-2 rounded-2xl shadow-sm" alt="QR Code PIX" />
              ) : activePixCharge?.pix_qr_code ? (
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <QRCodeSVG value={activePixCharge.pix_qr_code} size={200} />
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-apple-muted uppercase font-black tracking-widest mb-1">Valor Total</p>
              <p className="text-3xl font-black text-apple-black tracking-tighter">
                {activePixCharge && currencyFormatter.format(activePixCharge.amount)}
              </p>
            </div>

            {activePixCharge?.pix_qr_code && (
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(activePixCharge.pix_qr_code); 
                  showSuccess("Código Copia e Cola copiado!"); 
                }} 
                className="w-full bg-apple-offWhite border border-apple-border text-apple-black hover:border-apple-dark font-bold text-xs py-3.5 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Copy size={16} className="text-orange-500" /> Copiar Código Pix
              </button>
            )}
          </div>

          <DialogFooter className="p-6 bg-apple-offWhite border-t border-apple-border flex justify-center text-center">
            <p className="text-[10px] text-apple-muted font-bold italic">O painel será atualizado automaticamente quando o pagamento cair.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default POS;