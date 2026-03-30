"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { ArrowLeft, Plus, Trash2, Save, Calculator, Loader2, Tag, Wrench, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const ServiceQuoteBuilder = () => {
  const { effectiveUserId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [sellerId, setSellerId] = useState('none');
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  
  const [items, setItems] = useState([{ serviceId: '', quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState('');

  const loadInitialData = async () => {
    if (!effectiveUserId) return;
    setDataLoading(true);
    const [custRes, prodRes, empRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', effectiveUserId).order('name'),
      supabase.from('products').select('id, name, price').eq('user_id', effectiveUserId).ilike('category', '%serviço%').order('name'),
      supabase.from('employees').select('id, full_name').eq('user_id', effectiveUserId).eq('status', 'Ativo').order('full_name')
    ]);

    if (custRes.data) setCustomers(custRes.data);
    if (prodRes.data) setServices(prodRes.data);
    if (empRes.data) setEmployees(empRes.data);

    setDataLoading(false);
  };

  useEffect(() => { loadInitialData(); }, [effectiveUserId]);

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    const newItems = [...items];
    newItems[index] = { ...newItems[index], serviceId, unitPrice: service ? service.price : 0 };
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
    setItems([...items, { serviceId: '', quantity: 1, unitPrice: 0 }]);
  };

  const subtotalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const discountValue = parseFloat(discount.replace(',', '.')) || 0;
  const totalAmount = Math.max(0, subtotalAmount - discountValue);

  const handleSave = async () => {
    if (!customerId) return showError("Selecione um cliente.");
    if (items.some(i => !i.serviceId)) return showError("Selecione os serviços para todos os itens.");
    
    setLoading(true);
    try {
      const payload = {
        user_id: effectiveUserId,
        customer_id: customerId,
        seller_id: sellerId === 'none' ? null : sellerId,
        total_amount: totalAmount,
        expires_at: expiresAt,
        status: 'draft',
        quote_type: 'service' // DIFERENCIAÇÃO: Tipo Serviço
      };

      const { data: quote, error: quoteError } = await supabase.from('quotes').insert(payload).select().single();
      if (quoteError) throw quoteError;

      const quoteItemsToInsert = items.map(item => ({
        quote_id: quote.id,
        product_id: item.serviceId, // Serviços são salvos na tabela products
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsToInsert);
      if (itemsError) throw itemsError;

      showSuccess("Orçamento de serviço criado!");
      navigate('/servicos/orcamentos');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (dataLoading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/servicos/orcamentos" className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-apple-black">Nova Proposta de Serviços</h2>
              <p className="text-apple-muted mt-1 text-sm font-medium">Crie orçamentos focados na sua prestação de serviços.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            FINALIZAR PROPOSTA
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                   <Wrench size={16} className="text-orange-500" /> Serviços Inclusos
                 </h3>
              </div>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-end gap-4 p-6 bg-apple-offWhite border border-apple-border rounded-[1.5rem] shadow-inner">
                    <div className="w-full md:flex-1 space-y-2">
                      <label className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Serviço Prestado</label>
                      <Select value={item.serviceId} onValueChange={(v) => handleServiceChange(index, v)}>
                        <SelectTrigger className="bg-apple-white border-apple-border h-12 rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                          {services.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} <span className="text-apple-muted text-xs ml-2">({currencyFormatter.format(s.price)})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-24 space-y-2">
                      <label className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Qtd / Horas</label>
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
                <Plus size={18} className="group-hover:scale-110 transition-transform" /> ADICIONAR SERVIÇO
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">Cliente Solicitante</label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-14 rounded-xl text-sm font-bold"><SelectValue placeholder="Vincular a um cliente..." /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-500" /> Técnico / Responsável
                </label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-14 rounded-xl text-sm font-bold">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                    <SelectItem value="none">Não Atribuído</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">Validade da Proposta</label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="bg-apple-offWhite border-apple-border h-14 rounded-xl font-bold" />
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
                
                <div className="pt-8 border-t border-apple-border">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">Valor Final da Proposta</p>
                  <p className="text-5xl font-black text-apple-black tracking-tighter">{currencyFormatter.format(totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ServiceQuoteBuilder;