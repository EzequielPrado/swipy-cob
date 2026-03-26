"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { ArrowLeft, Plus, Trash2, Save, Calculator, Loader2, Tag, Truck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const QuoteBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // Para edição

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState('');
  const [freight, setFreight] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const loadInitialData = async () => {
      setDataLoading(true);
      // Carrega clientes e produtos
      const [custRes, prodRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('products').select('id, name, price, stock_quantity').eq('user_id', user.id).order('name')
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (prodRes.data) setProducts(prodRes.data);

      // Se tiver ID, carrega o orçamento existente
      if (id) {
        const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).single();
        const { data: itemsData } = await supabase.from('quote_items').select('*').eq('quote_id', id);

        if (quote) {
          setCustomerId(quote.customer_id);
          setExpiresAt(quote.expires_at ? quote.expires_at.split('T')[0] : '');

          if (itemsData && itemsData.length > 0) {
            const mappedItems = itemsData.map((i: any) => ({
              productId: i.product_id,
              quantity: i.quantity,
              unitPrice: i.unit_price,
            }));
            setItems(mappedItems);

            // Calcula o frete/desconto com base na diferença entre o total_amount e a soma dos itens
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

  const subtotalAmount = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  const discountValue = parseFloat(discount.replace(',', '.')) || 0;
  const freightValue = parseFloat(freight.replace(',', '.')) || 0;
  const totalAmount = Math.max(0, subtotalAmount - discountValue + freightValue);

  const handleSave = async () => {
    if (!customerId) return showError("Selecione um cliente.");
    if (items.some(i => !i.productId)) return showError("Selecione os produtos para todos os itens.");
    
    setLoading(true);
    try {
      if (id) {
        // UPDATE (Edição)
        const { error: quoteError } = await supabase
          .from('quotes')
          .update({
            customer_id: customerId,
            total_amount: totalAmount,
            expires_at: expiresAt,
          })
          .eq('id', id);

        if (quoteError) throw quoteError;

        // Limpar itens antigos e inserir os novos
        await supabase.from('quote_items').delete().eq('quote_id', id);

        const quoteItemsToInsert = items.map(item => ({
          quote_id: id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice
        }));

        const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsToInsert);
        if (itemsError) throw itemsError;

        showSuccess("Orçamento atualizado com sucesso!");
      } else {
        // INSERT (Novo)
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .insert({
            user_id: user?.id,
            customer_id: customerId,
            total_amount: totalAmount,
            expires_at: expiresAt,
            status: 'draft'
          })
          .select()
          .single();

        if (quoteError) throw quoteError;

        const quoteItemsToInsert = items.map(item => ({
          quote_id: quote.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice
        }));

        const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsToInsert);
        if (itemsError) throw itemsError;

        showSuccess("Orçamento criado com sucesso!");
      }
      
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
      <div className="flex flex-col gap-8 pb-12 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/vendas/orcamentos" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{id ? "Editar Orçamento" : "Criar Orçamento"}</h2>
              <p className="text-zinc-400 mt-1 text-sm">Monte a proposta comercial para seu cliente.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {id ? "Salvar Alterações" : "Finalizar Orçamento"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calculator size={16} className="text-orange-500" /> Itens do Orçamento
              </h3>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-end gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="w-full md:flex-1 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Produto / Serviço</label>
                      <Select value={item.productId} onValueChange={(v) => handleProductChange(index, v)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} <span className="text-zinc-500 text-xs ml-2">(R$ {p.price})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-24 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Qtd</label>
                      <Input 
                        type="number" min="1" 
                        value={item.quantity} 
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)} 
                        className="bg-zinc-900 border-zinc-800 h-11 text-center font-bold" 
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Total Item</label>
                      <div className="h-11 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center px-4 font-bold text-orange-400">
                        {currencyFormatter.format(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="h-11 px-4 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={addItemRow}
                className="mt-6 w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:border-orange-500/50 hover:text-orange-500 font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Adicionar Linha
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cliente</label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12"><SelectValue placeholder="Vincular a um cliente..." /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Validade da Proposta</label>
                <Input 
                  type="date" 
                  value={expiresAt} 
                  onChange={(e) => setExpiresAt(e.target.value)} 
                  className="bg-zinc-950 border-zinc-800 h-12" 
                />
              </div>

              <div className="pt-6 border-t border-zinc-800 space-y-4">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="font-medium">Subtotal</span>
                  <span>{currencyFormatter.format(subtotalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="flex items-center gap-1 font-medium"><Tag size={14} className="text-orange-500" /> Desconto (R$)</span>
                  <input 
                    type="text"
                    placeholder="0,00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg text-right px-3 py-1.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all text-zinc-100 font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="flex items-center gap-1 font-medium"><Truck size={14} className="text-blue-500" /> Frete / Taxa (R$)</span>
                  <input 
                    type="text"
                    placeholder="0,00"
                    value={freight}
                    onChange={(e) => setFreight(e.target.value)}
                    className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg text-right px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all text-zinc-100 font-bold"
                  />
                </div>
                
                <div className="pt-4 border-t border-zinc-800/50">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex justify-between">
                    Valor Final
                    {(discountValue > 0 || freightValue > 0) && <span className="text-emerald-500">Valores Aplicados</span>}
                  </p>
                  <p className="text-4xl font-black text-zinc-100">{currencyFormatter.format(totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default QuoteBuilder;