"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { ArrowLeft, Plus, Trash2, Save, Calculator, Loader2, Tag, Truck, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import AddProductModal from '@/components/inventory/AddProductModal';

const QuoteBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [sellerId, setSellerId] = useState('none');
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState('');
  const [freight, setFreight] = useState('');

  const loadInitialData = async () => {
    if (!user) return;
    setDataLoading(true);
    const [custRes, prodRes, empRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('products').select('id, name, price, stock_quantity').eq('user_id', user.id).order('name'),
      supabase.from('employees').select('id, full_name').eq('user_id', user.id).eq('status', 'Ativo').order('full_name')
    ]);

    if (custRes.data) setCustomers(custRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    if (empRes.data) setEmployees(empRes.data);

    if (id) {
      const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).single();
      const { data: itemsData } = await supabase.from('quote_items').select('*').eq('quote_id', id);

      if (quote) {
        setCustomerId(quote.customer_id || '');
        setSellerId(quote.seller_id || 'none');
        setExpiresAt(quote.expires_at ? quote.expires_at.split('T')[0] : '');

        if (itemsData && itemsData.length > 0) {
          const mappedItems = itemsData.map((i: any) => ({
            productId: i.product_id,
            quantity: i.quantity,
            unitPrice: i.unit_price,
          }));
          setItems(mappedItems);

          const subtotal = mappedItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
          const diff = quote.total_amount - subtotal;
          
          if (diff < 0) {
            setDiscount(Math.abs(diff).toFixed(2).replace('.', ','));
            setFreight('');
          } else if (diff > 0) {
            setFreight(diff.toFixed(2).replace('.', ','));
            setDiscount('');
          }
        }
      }
    }
    setDataLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, [user, id]);

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId,
      unitPrice: product ? product.price : 0
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, qty);
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const subtotalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const discountValue = parseFloat(discount.replace(',', '.')) || 0;
  const freightValue = parseFloat(freight.replace(',', '.')) || 0;
  const totalAmount = Math.max(0, subtotalAmount - discountValue + freightValue);

  const handleSave = async () => {
    if (!customerId) return showError("Selecione um cliente.");
    if (items.some(i => !i.productId)) return showError("Selecione os produtos para todos os itens.");
    
    setLoading(true);
    try {
      const payload = {
        user_id: user?.id,
        customer_id: customerId,
        seller_id: sellerId === 'none' ? null : sellerId,
        total_amount: totalAmount,
        expires_at: expiresAt,
        status: 'draft'
      };

      let quoteIdForItems = id;

      if (id) {
        const { error: quoteError } = await supabase
          .from('quotes')
          .update(payload)
          .eq('id', id);

        if (quoteError) throw quoteError;
        await supabase.from('quote_items').delete().eq('quote_id', id);
      } else {
        const { data: quote, error: quoteError } = await supabase.from('quotes').insert(payload).select().single();
        if (quoteError) throw quoteError;
        quoteIdForItems = quote.id;
      }

      const quoteItemsToInsert = items.map(item => ({
        quote_id: quoteIdForItems,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsToInsert);
      if (itemsError) throw itemsError;

      showSuccess(id ? "Orçamento atualizado!" : "Orçamento criado!");
      navigate('/vendas/orcamentos');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (dataLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/vendas/orcamentos" className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-apple-black">{id ? "Editar Orçamento" : "Montar Proposta"}</h2>
              <p className="text-apple-muted mt-1 text-sm font-medium">Configure os itens e as condições comerciais.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {id ? "SALVAR ALTERAÇÕES" : "FINALIZAR PROPOSTA"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                   <Calculator size={16} className="text-orange-500" /> Detalhamento de Itens
                 </h3>
                 <button 
                   onClick={() => setIsAddItemModalOpen(true)}
                   className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all flex items-center gap-1.5"
                 >
                    <Plus size={12} /> CADASTRAR NOVO ITEM
                 </button>
              </div>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-end gap-4 p-6 bg-apple-offWhite border border-apple-border rounded-[1.5rem] shadow-inner">
                    <div className="w-full md:flex-1 space-y-2">
                      <label className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Produto / Serviço</label>
                      <Select value={item.productId} onValueChange={(v) => handleProductChange(index, v)}>
                        <SelectTrigger className="bg-apple-white border-apple-border h-12 rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} <span className="text-apple-muted text-xs ml-2">({currencyFormatter.format(p.price)})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-24 space-y-2">
                      <label className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Qtd</label>
                      <Input 
                        type="number" min="1" 
                        value={item.quantity} 
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)} 
                        className="bg-apple-white border-apple-border h-12 text-center font-black rounded-xl" 
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                      <label className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Subtotal</label>
                      <div className="h-12 bg-apple-white border border-apple-border rounded-xl flex items-center px-4 font-black text-apple-dark">
                        {currencyFormatter.format(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="h-12 px-4 rounded-xl text-apple-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={addItemRow}
                className="mt-6 w-full py-5 border-2 border-dashed border-apple-border rounded-[1.5rem] text-apple-muted hover:border-orange-500/50 hover:text-orange-600 font-bold transition-all flex items-center justify-center gap-2 group"
              >
                <Plus size={18} className="group-hover:scale-110 transition-transform" /> ADICIONAR LINHA
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">Cliente Destinatário</label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-14 rounded-xl text-sm font-bold"><SelectValue placeholder="Vincular a um cliente..." /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-500" /> Vendedor Responsável
                </label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-14 rounded-xl text-sm font-bold">
                    <SelectValue placeholder="Selecione o vendedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                    <SelectItem value="none">Venda Direta / Sem Vendedor</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">Validade da Proposta</label>
                <Input 
                  type="date" 
                  value={expiresAt} 
                  onChange={(e) => setExpiresAt(e.target.value)} 
                  className="bg-apple-offWhite border-apple-border h-14 rounded-xl font-bold" 
                />
              </div>

              <div className="pt-8 border-t border-apple-border space-y-5">
                <div className="flex items-center justify-between text-sm text-apple-muted font-bold">
                  <span>SUBTOTAL</span>
                  <span className="text-apple-black">{currencyFormatter.format(subtotalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-apple-muted font-bold">
                  <span className="flex items-center gap-2"><Tag size={16} className="text-orange-500" /> DESCONTO (R$)</span>
                  <input 
                    type="text" placeholder="0,00" value={discount} onChange={(e) => setDiscount(e.target.value)}
                    className="w-28 bg-apple-white border border-apple-border rounded-xl text-right px-4 py-2 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-apple-black font-black shadow-sm"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-apple-muted font-bold">
                  <span className="flex items-center gap-2"><Truck size={16} className="text-blue-500" /> FRETE (R$)</span>
                  <input 
                    type="text" placeholder="0,00" value={freight} onChange={(e) => setFreight(e.target.value)}
                    className="w-28 bg-apple-white border border-apple-border rounded-xl text-right px-4 py-2 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-apple-black font-black shadow-sm"
                  />
                </div>
                
                <div className="pt-8 border-t border-apple-border">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">Valor Final da Proposta</p>
                  <p className="text-5xl font-black text-apple-black tracking-tighter">{currencyFormatter.format(totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddProductModal 
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSuccess={loadInitialData}
      />
    </AppLayout>
  );
};

export default QuoteBuilder;