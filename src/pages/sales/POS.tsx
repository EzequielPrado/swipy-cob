"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, 
  CheckCircle2, Loader2, PackageOpen, ArrowRight, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';

const POS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Estado do Carrinho
  const [cart, setCart] = useState<any[]>([]);
  
  // Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    customerId: '',
    method: 'pix'
  });

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      
      const [prodRes, custRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('name'),
        supabase.from('customers').select('id, name').eq('user_id', user.id).order('name')
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (custRes.data) setCustomers(custRes.data);
      
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock_quantity) {
          showError("Estoque insuficiente!");
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock_quantity <= 0) {
        showError("Produto sem estoque!");
        return prev;
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          if (newQty < 1) return item;
          if (newQty > item.stock_quantity) {
            showError("Estoque máximo atingido.");
            return item;
          }
          return { ...item, qty: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCheckout = async () => {
    if (!checkoutData.customerId) return showError("Selecione um cliente para a venda.");
    if (cart.length === 0) return showError("O carrinho está vazio.");

    setProcessing(true);
    try {
      // 1. Criar Venda (Quote aprovada)
      const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
        user_id: user?.id,
        customer_id: checkoutData.customerId,
        total_amount: totalAmount,
        status: 'approved',
        expires_at: new Date().toISOString()
      }).select().single();

      if (quoteError) throw quoteError;

      // 2. Inserir Itens e Baixar Estoque
      const quoteItems = [];
      const movements = [];
      
      for (const item of cart) {
        quoteItems.push({
          quote_id: quote.id,
          product_id: item.id,
          quantity: item.qty,
          unit_price: item.price,
          total_price: item.price * item.qty
        });

        movements.push({
          user_id: user?.id,
          product_id: item.id,
          type: 'out',
          quantity: item.qty,
          notes: `Venda PDV #${quote.id.split('-')[0].toUpperCase()}`
        });

        // Atualizar estoque real
        await supabase.from('products')
          .update({ stock_quantity: item.stock_quantity - item.qty })
          .eq('id', item.id);
      }

      await supabase.from('quote_items').insert(quoteItems);
      await supabase.from('inventory_movements').insert(movements);

      // 3. Processar Pagamento
      if (checkoutData.method === 'pix') {
        const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-charge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            customerId: checkoutData.customerId,
            amount: totalAmount,
            description: `Venda PDV #${quote.id.split('-')[0].toUpperCase()}`,
            method: 'pix',
            dueDate: new Date().toISOString().split('T')[0],
            userId: user?.id,
            origin: window.location.origin
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        showSuccess("Venda PIX gerada! Direcionando para o QRCode...");
        setIsCheckoutOpen(false);
        setCart([]);
        navigate(`/financeiro/cobrancas/${result.id}`);

      } else {
        // Dinheiro ou Cartão -> Pagamento Local e Liquidado
        const { error: chargeError } = await supabase.from('charges').insert({
          user_id: user?.id,
          customer_id: checkoutData.customerId,
          amount: totalAmount,
          description: `Venda PDV #${quote.id.split('-')[0].toUpperCase()} (${checkoutData.method})`,
          method: checkoutData.method,
          due_date: new Date().toISOString().split('T')[0],
          status: 'pago' // Já entra como pago
        });

        if (chargeError) throw chargeError;

        showSuccess("Venda finalizada com sucesso!");
        setIsCheckoutOpen(false);
        setCart([]);
        // Atualiza a listagem de produtos para refletir o estoque
        const { data } = await supabase.from('products').select('*').eq('user_id', user?.id).order('name');
        if (data) setProducts(data);
      }

    } catch (err: any) {
      showError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        
        {/* LADO ESQUERDO: CATÁLOGO */}
        <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
          
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 z-10">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto por nome ou SKU..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
              <button 
                onClick={() => setCategoryFilter('all')}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all", categoryFilter === 'all' ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all", categoryFilter === cat ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <PackageOpen size={48} className="mb-4 opacity-20" />
                <p>Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 transition-all text-left flex flex-col group relative overflow-hidden active:scale-95"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-800 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                        {prod.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md",
                        prod.stock_quantity > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {prod.stock_quantity} un
                      </span>
                    </div>
                    <p className="font-bold text-zinc-200 line-clamp-2 mb-1 group-hover:text-orange-400 transition-colors">{prod.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mb-4">{prod.sku || 'Sem SKU'}</p>
                    <p className="text-lg font-black text-zinc-100 mt-auto">{currencyFormatter.format(prod.price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: CARRINHO */}
        <div className="w-full max-w-[380px] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col shrink-0">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="text-orange-500" size={20} />
              Carrinho Ativo
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50">
                <ShoppingCart size={40} className="mb-4" />
                <p className="text-sm font-medium">Carrinho Vazio</p>
                <p className="text-[10px] mt-1 text-center px-4">Selecione produtos no catálogo ao lado para iniciar uma venda.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="text-sm font-bold text-zinc-200 truncate">{item.name}</p>
                    <p className="text-xs text-orange-400 font-bold mt-0.5">{currencyFormatter.format(item.price * item.qty)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-zinc-950 border-t border-zinc-800 shrink-0 rounded-b-3xl">
            <div className="flex items-center justify-between mb-6">
              <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Total da Venda</span>
              <span className="text-3xl font-black text-zinc-100">{currencyFormatter.format(totalAmount)}</span>
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 text-lg"
            >
              COBRAR <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CHECKOUT */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Finalizar Venda</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Valor a Cobrar</p>
              <p className="text-4xl font-black text-orange-500">{currencyFormatter.format(totalAmount)}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User size={14} className="text-orange-500" /> Cliente</Label>
              <Select value={checkoutData.customerId} onValueChange={v => setCheckoutData({...checkoutData, customerId: v})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Método de Pagamento</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'pix', icon: QrCode, label: 'PIX (Woovi)' },
                  { id: 'cartao', icon: CreditCard, label: 'Cartão' },
                  { id: 'dinheiro', icon: Banknote, label: 'Dinheiro' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setCheckoutData({...checkoutData, method: method.id})}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-2",
                      checkoutData.method === method.id 
                        ? "bg-orange-500/10 border-orange-500 text-orange-400" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    <method.icon size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button 
              onClick={handleCheckout}
              disabled={processing || !checkoutData.customerId}
              className="w-full bg-orange-500 text-zinc-950 font-bold py-4 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Confirmar Pagamento
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default POS;