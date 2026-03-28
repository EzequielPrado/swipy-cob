"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, 
  CheckCircle2, Loader2, PackageOpen, ArrowRight, User, Contact, Tag, Truck, Factory
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import AddCustomerModal from '@/components/customers/AddCustomerModal';

const POS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Estado do Carrinho, Desconto e Frete
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState('');
  const [freight, setFreight] = useState('');
  
  // Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    customerId: '',
    sellerId: 'none',
    method: 'pix'
  });

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      
      const [prodRes, custRes, empRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('name'),
        supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('employees').select('id, full_name').eq('user_id', user.id).eq('status', 'Ativo').order('full_name')
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (custRes.data) setCustomers(custRes.data);
      if (empRes.data) setEmployees(empRes.data);
      
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

  const subtotalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const discountValue = parseFloat(discount.replace(',', '.')) || 0;
  const freightValue = parseFloat(freight.replace(',', '.')) || 0;
  const totalAmount = Math.max(0, subtotalAmount - discountValue + freightValue);

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
      if (!product.is_produced && product.stock_quantity <= 0) {
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
          if (!item.is_produced && newQty > item.stock_quantity) {
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

  const resetCart = () => {
    setCart([]);
    setDiscount('');
    setFreight('');
    setIsCheckoutOpen(false);
  };

  const handleCustomerAdded = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false }); 

    if (data) {
      setCustomers(data.sort((a, b) => a.name.localeCompare(b.name))); 
      if (data.length > 0) {
        setCheckoutData(prev => ({ ...prev, customerId: data[0].id }));
      }
    }
  };

  const handleCheckout = async () => {
    if (!checkoutData.customerId) return showError("Selecione um cliente para a venda.");
    if (cart.length === 0) return showError("O carrinho está vazio.");
    if (totalAmount <= 0) return showError("O valor total da venda deve ser maior que zero.");

    setProcessing(true);
    try {
      const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
        user_id: user?.id,
        customer_id: checkoutData.customerId,
        seller_id: checkoutData.sellerId === 'none' ? null : checkoutData.sellerId,
        total_amount: totalAmount,
        status: 'completed',
        expires_at: new Date().toISOString()
      }).select().single();

      if (quoteError) throw quoteError;

      const quoteItems = [];
      const movements = [];
      const productionOrders = [];
      
      for (const item of cart) {
        quoteItems.push({
          quote_id: quote.id,
          product_id: item.id,
          quantity: item.qty,
          unit_price: item.price,
          total_price: item.price * item.qty
        });

        if (!item.is_produced) {
          movements.push({
            user_id: user?.id,
            product_id: item.id,
            type: 'out',
            quantity: item.qty,
            notes: `Venda PDV #${quote.id.split('-')[0].toUpperCase()}`
          });

          await supabase.from('products')
            .update({ stock_quantity: Math.max(0, item.stock_quantity - item.qty) })
            .eq('id', item.id);
        } else {
          productionOrders.push({
            user_id: user?.id,
            product_id: item.id,
            quote_id: quote.id,
            quantity: item.qty,
            status: 'pending',
            notes: `Venda PDV Cliente: ${customers.find(c => c.id === checkoutData.customerId)?.name}`
          });
        }
      }

      await supabase.from('quote_items').insert(quoteItems);
      if (movements.length > 0) await supabase.from('inventory_movements').insert(movements);
      if (productionOrders.length > 0) {
        await supabase.from('production_orders').insert(productionOrders);
        showSuccess(`${productionOrders.length} Ordens de Produção geradas.`);
      }

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
        resetCart();
        navigate(`/financeiro/cobrancas/${result.id}`);

      } else {
        const { error: chargeError } = await supabase.from('charges').insert({
          user_id: user?.id,
          customer_id: checkoutData.customerId,
          amount: totalAmount,
          description: `Venda PDV #${quote.id.split('-')[0].toUpperCase()} (${checkoutData.method})`,
          method: checkoutData.method,
          due_date: new Date().toISOString().split('T')[0],
          status: 'pago' 
        });

        if (chargeError) throw chargeError;

        showSuccess("Venda finalizada com sucesso!");
        resetCart();
        
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
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6">
        
        {/* LADO ESQUERDO: CATÁLOGO */}
        <div className="flex-1 flex flex-col bg-apple-white border border-apple-border rounded-3xl overflow-hidden shadow-sm relative min-h-[500px] lg:min-h-0">
          
          <div className="p-6 border-b border-apple-border bg-apple-offWhite flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 z-10">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto por nome ou SKU..." 
                className="w-full bg-white border border-apple-border rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all text-apple-black shadow-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
              <button 
                onClick={() => setCategoryFilter('all')}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border", categoryFilter === 'all' ? "bg-orange-500 text-white border-orange-600 shadow-sm" : "bg-white text-apple-muted border-apple-border hover:bg-apple-light")}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border", categoryFilter === cat ? "bg-orange-500 text-white border-orange-600 shadow-sm" : "bg-white text-apple-muted border-apple-border hover:bg-apple-light")}
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
              <div className="flex flex-col items-center justify-center h-full text-apple-muted">
                <PackageOpen size={48} className="mb-4 opacity-20" />
                <p>Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="bg-white border border-apple-border p-4 rounded-2xl hover:border-orange-500 hover:shadow-md transition-all text-left flex flex-col group relative overflow-hidden active:scale-95"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-full bg-apple-offWhite flex items-center justify-center text-apple-muted border border-apple-border group-hover:bg-orange-50 group-hover:text-orange-500 group-hover:border-orange-200 transition-colors">
                        {prod.is_produced ? <Factory size={20} className="text-orange-500" /> : prod.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md border",
                        prod.is_produced ? "bg-orange-50 text-orange-600 border-orange-200" :
                        prod.stock_quantity > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                      )}>
                        {prod.is_produced ? 'INDUSTRIAL' : `${prod.stock_quantity} un`}
                      </span>
                    </div>
                    <p className="font-bold text-apple-black line-clamp-2 mb-1 group-hover:text-orange-500 transition-colors">{prod.name}</p>
                    <p className="text-[10px] text-apple-muted font-mono mb-4">{prod.sku || 'Sem SKU'}</p>
                    <p className="text-lg font-black text-apple-dark mt-auto">{currencyFormatter.format(prod.price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: CARRINHO */}
        <div className="w-full lg:max-w-[380px] bg-apple-white border border-apple-border rounded-3xl shadow-sm flex flex-col shrink-0">
          <div className="p-6 border-b border-apple-border bg-apple-offWhite shrink-0 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 text-apple-black">
              <ShoppingCart className="text-orange-500" size={20} />
              Carrinho Ativo
            </h2>
            {cart.length > 0 && (
              <button onClick={resetCart} className="text-xs font-bold text-apple-muted hover:text-red-500 transition-colors">
                Limpar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 min-h-[300px] lg:min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-apple-muted opacity-80">
                <ShoppingCart size={40} className="mb-4" />
                <p className="text-sm font-medium">Carrinho Vazio</p>
                <p className="text-[10px] mt-1 text-center px-4">Selecione produtos no catálogo ao lado para iniciar uma venda.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-white border border-apple-border p-3 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="text-sm font-bold text-apple-black truncate">{item.name}</p>
                    <p className="text-xs text-orange-500 font-bold mt-0.5">{currencyFormatter.format(item.price * item.qty)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => removeFromCart(item.id)} className="text-apple-muted hover:text-red-500 p-1">
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-2 bg-apple-offWhite border border-apple-border rounded-lg p-1">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1 text-apple-muted hover:text-apple-black hover:bg-apple-light rounded">
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center text-apple-black">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1 text-apple-muted hover:text-apple-black hover:bg-apple-light rounded">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RESUMO DO CARRINHO */}
          <div className="p-6 bg-apple-offWhite border-t border-apple-border shrink-0 rounded-b-3xl">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-sm text-apple-dark">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold">{currencyFormatter.format(subtotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-apple-dark">
                <span className="flex items-center gap-1 font-medium"><Tag size={14} className="text-orange-500" /> Desconto (R$)</span>
                <input 
                  type="text"
                  placeholder="0,00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 bg-white border border-apple-border rounded-lg text-right px-3 py-1.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all text-apple-black font-bold shadow-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm text-apple-dark">
                <span className="flex items-center gap-1 font-medium"><Truck size={14} className="text-blue-500" /> Frete / Taxa (R$)</span>
                <input 
                  type="text"
                  placeholder="0,00"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  className="w-24 bg-white border border-apple-border rounded-lg text-right px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all text-apple-black font-bold shadow-sm"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-apple-border">
                <span className="text-apple-muted font-bold uppercase tracking-widest text-xs">Total da Venda</span>
                <span className="text-3xl font-black text-apple-black">{currencyFormatter.format(totalAmount)}</span>
              </div>
            </div>

            <button 
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-apple-border disabled:text-apple-muted text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm text-lg"
            >
              COBRAR <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CHECKOUT */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Finalizar Venda</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-apple-offWhite border border-apple-border rounded-2xl p-6 text-center shadow-inner">
              <p className="text-[10px] text-apple-muted uppercase tracking-widest font-bold mb-2">Valor a Cobrar</p>
              <p className="text-4xl font-black text-orange-500">{currencyFormatter.format(totalAmount)}</p>
              {(discountValue > 0 || freightValue > 0) && (
                <div className="flex justify-center gap-2 mt-3">
                  {discountValue > 0 && <span className="text-[10px] text-apple-muted font-bold bg-white px-2 py-1 rounded-md border border-apple-border">- {currencyFormatter.format(discountValue)} (Desc)</span>}
                  {freightValue > 0 && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md border border-blue-200">+ {currencyFormatter.format(freightValue)} (Frete)</span>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><User size={14} className="text-orange-500" /> Cliente</Label>
                <button 
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-[10px] text-orange-500 font-bold uppercase tracking-widest hover:underline flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md border border-orange-100"
                >
                  <Plus size={12} /> Novo Cliente
                </button>
              </div>
              <Select value={checkoutData.customerId} onValueChange={v => setCheckoutData({...checkoutData, customerId: v})}>
                <SelectTrigger className="bg-white border-apple-border h-12 rounded-xl focus:ring-orange-500">
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-apple-border text-apple-black">
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Contact size={14} className="text-blue-500" /> Vendedor (Opcional)</Label>
              <Select value={checkoutData.sellerId} onValueChange={v => setCheckoutData({...checkoutData, sellerId: v})}>
                <SelectTrigger className="bg-white border-apple-border h-12 rounded-xl focus:ring-orange-500">
                  <SelectValue placeholder="Selecione quem realizou a venda..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-apple-border text-apple-black">
                  <SelectItem value="none">Nenhum (Venda Direta)</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase text-apple-muted font-bold tracking-widest">Método de Pagamento</Label>
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
                        ? "bg-orange-50 border-orange-500 text-orange-600 shadow-sm" 
                        : "bg-white border-apple-border text-apple-muted hover:border-apple-dark hover:text-apple-dark"
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
              className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Confirmar Pagamento
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCustomerModal 
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSuccess={handleCustomerAdded}
      />
    </AppLayout>
  );
};

export default POS;