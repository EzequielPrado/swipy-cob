"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, 
  CheckCircle2, Loader2, PackageOpen, ArrowRight, User, Contact, Tag, Truck, Factory, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import AddProductModal from '@/components/inventory/AddProductModal';

const POS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState('');
  const [freight, setFreight] = useState('');
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState({
    customerId: '',
    sellerId: 'none',
    method: 'pix'
  });

  const [customerRisk, setCustomerRisk] = useState<null | 'low' | 'high'>(null);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [prodRes, custRes, empRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).order('name'),
      supabase.from('customers').select('id, name, tax_id').eq('user_id', user.id).order('name'),
      supabase.from('employees').select('id, full_name').eq('user_id', user.id).eq('status', 'Ativo').order('full_name')
    ]);
    if (prodRes.data) setProducts(prodRes.data);
    if (custRes.data) setCustomers(custRes.data);
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const checkGlobalRisk = async (customerId: string) => {
    if (!customerId) { setCustomerRisk(null); return; }
    const selected = customers.find(c => c.id === customerId);
    if (!selected) return;
    const cleanTaxId = selected.tax_id.replace(/\D/g, '');
    const { data: globalCharges } = await supabase.from('charges').select('status, customers!inner(tax_id)');
    const clientCharges = globalCharges?.filter((c: any) => c.customers.tax_id.replace(/\D/g, '') === cleanTaxId) || [];
    const overdue = clientCharges.filter(c => c.status === 'atrasado').length;
    setCustomerRisk(overdue > 0 ? 'high' : 'low');
  };

  useEffect(() => {
    checkGlobalRisk(checkoutData.customerId);
  }, [checkoutData.customerId]);

  const categories = useMemo(() => {
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
            origin: window.location.origin 
          })
        });
        const result = await response.json();
        navigate(`/financeiro/cobrancas/${result.id}`);
      } else {
        await supabase.from('charges').insert({ 
          user_id: user?.id, 
          customer_id: checkoutData.customerId, 
          amount: totalAmount, 
          status: 'pago', 
          method: checkoutData.method, 
          due_date: new Date().toISOString().split('T')[0] 
        });
        showSuccess("Venda finalizada!");
        setCart([]);
        setDiscount('');
        setFreight('');
        setIsCheckoutOpen(false);
      }
    } catch (err: any) { showError(err.message); } finally { setProcessing(false); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6">
        <div className="flex-1 flex flex-col bg-apple-white border border-apple-border rounded-3xl overflow-hidden shadow-sm relative">
          <div className="p-6 border-b border-apple-border bg-apple-offWhite flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="relative w-full sm:w-80">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
                 <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar produto..." className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all text-apple-black shadow-sm" />
               </div>
               <button onClick={() => setIsAddItemModalOpen(true)} className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all active:scale-95" title="Novo Item">
                 <Plus size={20} />
               </button>
            </div>
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
               <button onClick={() => setCategoryFilter('all')} className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border", categoryFilter === 'all' ? "bg-orange-500 text-white border-orange-600" : "bg-apple-white text-apple-muted")}>Todos</button>
               {categories.map(cat => (<button key={cat} onClick={() => setCategoryFilter(cat)} className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border", categoryFilter === cat ? "bg-orange-500 text-white border-orange-600" : "bg-apple-white text-apple-muted")}>{cat}</button>))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(prod => (<button key={prod.id} onClick={() => addToCart(prod)} className="bg-apple-white border border-apple-border p-4 rounded-2xl hover:border-orange-500 transition-all text-left flex flex-col group relative active:scale-95"><div className="flex justify-between items-start mb-4"><div className="w-10 h-10 rounded-full bg-apple-offWhite border border-apple-border flex items-center justify-center text-apple-muted group-hover:text-orange-500 transition-colors">{prod.name.charAt(0).toUpperCase()}</div>{prod.stock_quantity > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">{prod.stock_quantity} un</span>}</div><p className="font-bold text-apple-black line-clamp-2 mb-1 group-hover:text-orange-500 transition-colors">{prod.name}</p><p className="text-lg font-black text-apple-dark mt-auto">{currencyFormatter.format(prod.price)}</p></button>))}
          </div>
        </div>

        <div className="w-full lg:max-w-[380px] bg-apple-white border border-apple-border rounded-3xl shadow-sm flex flex-col shrink-0">
          <div className="p-6 border-b border-apple-border bg-apple-offWhite flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="text-orange-500" size={20} /> Carrinho</h2> <button onClick={() => setCart([])} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Limpar</button></div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-apple-muted opacity-40">
                <PackageOpen size={48} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Carrinho Vazio</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="bg-apple-white border border-apple-border p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex-1 overflow-hidden pr-2">
                  <p className="text-sm font-bold text-apple-black truncate">{item.name}</p>
                  <p className="text-xs text-orange-500 font-bold mt-0.5">{currencyFormatter.format(item.price * item.qty)}</p>
                </div>
                <div className="flex items-center gap-2 bg-apple-offWhite border border-apple-border rounded-lg p-1">
                  <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty-1)} : i))} className="p-1 text-apple-muted"><Minus size={12} /></button>
                  <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                  <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qty: i.qty+1} : i))} className="p-1 text-apple-muted"><Plus size={12} /></button>
                </div>
                <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="ml-2 p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="p-6 bg-apple-offWhite border-t border-apple-border rounded-b-3xl space-y-4">
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1"><Tag size={10} /> Desconto (R$)</Label>
                 <Input 
                   value={discount} 
                   onChange={(e) => setDiscount(e.target.value)} 
                   placeholder="0,00" 
                   className="h-10 bg-apple-white border-apple-border rounded-xl text-xs font-bold" 
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1"><Truck size={10} /> Frete (R$)</Label>
                 <Input 
                   value={freight} 
                   onChange={(e) => setFreight(e.target.value)} 
                   placeholder="0,00" 
                   className="h-10 bg-apple-white border-apple-border rounded-xl text-xs font-bold" 
                 />
               </div>
            </div>

            <div className="pt-4 border-t border-apple-border flex items-center justify-between">
              <span className="text-apple-muted font-bold uppercase tracking-widest text-xs">Total a Pagar</span>
              <span className="text-3xl font-black text-apple-black">{currencyFormatter.format(totalAmount)}</span>
            </div>
            
            <button 
              onClick={() => setIsCheckoutOpen(true)} 
              disabled={cart.length === 0} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 text-lg active:scale-95 disabled:opacity-50"
            >
              FINALIZAR <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[480px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black">Revisão do Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 text-center">
              <p className="text-[10px] text-orange-600 uppercase tracking-widest font-black mb-2">Total Consolidado</p>
              <p className="text-4xl font-black text-orange-500">{currencyFormatter.format(totalAmount)}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-apple-muted"><User size={14} className="text-orange-500" /> Cliente / Comprador</Label>
                <Select value={checkoutData.customerId} onValueChange={v => setCheckoutData({...checkoutData, customerId: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {customerRisk === 'high' && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                    <AlertTriangle className="text-red-500 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-black text-red-600 uppercase tracking-widest">Alerta de Risco Global</p>
                      <p className="text-[10px] text-red-500 font-medium mt-1 leading-tight">Este CPF possui faturas vencidas em outros estabelecimentos Swipy.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-apple-muted"><Contact size={14} className="text-blue-500" /> Vendedor Responsável</Label>
                <Select value={checkoutData.sellerId} onValueChange={v => setCheckoutData({...checkoutData, sellerId: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Selecione o vendedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    <SelectItem value="none">Venda Direta / Balcão</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-apple-border">
              <Label className="text-[10px] uppercase text-apple-muted font-black tracking-widest">Forma de Recebimento</Label>
              <div className="grid grid-cols-3 gap-3">
                {[{id:'pix', icon:QrCode, label:'PIX'}, {id:'cartao', icon:CreditCard, label:'Cartão'}, {id:'dinheiro', icon:Banknote, label:'Dinheiro'}].map(m => (
                  <button 
                    key={m.id} 
                    type="button"
                    onClick={() => setCheckoutData({...checkoutData, method: m.id})} 
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border transition-all gap-2", 
                      checkoutData.method === m.id ? "bg-orange-50 border-orange-500 text-orange-600 shadow-sm" : "bg-apple-offWhite border-apple-border text-apple-muted hover:border-apple-dark"
                    )}
                  >
                    <m.icon size={24} />
                    <span className="text-[10px] font-black uppercase">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-apple-offWhite border-t border-apple-border">
            <button 
              onClick={handleCheckout} 
              disabled={processing || !checkoutData.customerId} 
              className="w-full bg-apple-black text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              CONFIRMAR E FINALIZAR
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddProductModal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} onSuccess={fetchData} />
    </AppLayout>
  );
};

export default POS;