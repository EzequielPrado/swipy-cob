"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  Wrench, Plus, Search, Clock, CheckCircle2, AlertCircle, 
  ArrowRight, User, Calendar, Loader2, DollarSign, Tag, Trash2, Edit3, Filter, ChevronRight, MapPin, Share2, Copy, Globe, UserCheck, ExternalLink, Inbox, Users, CreditCard, CalendarClock, CheckSquare, Square, Layers, RefreshCw
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, Link } from 'react-router-dom';

const ServiceOrders = () => {
  const { user, profile, effectiveUserId, activeMerchant } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'web' | 'manual'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '', customerId: '', employeeId: '', equipmentInfo: '', description: '', priority: 'normal', estimatedCost: '',
    billingType: 'imediato', billingDays: '30'
  });

  const fetchOrders = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('service_orders')
      .select('*, customers(id, name, email, phone), employees(full_name), charges(id, status, due_date)')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    
    // ATIVAÇÃO REALTIME: Escutar novas OS (especialmente as do portal)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'service_orders',
        filter: `user_id=eq.${effectiveUserId}` 
      }, (payload) => {
        console.log("Mudança detectada nas OS:", payload);
        fetchOrders(); // Recarrega a lista automaticamente
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [effectiveUserId]);

  useEffect(() => {
    if (!effectiveUserId) return;
    const fetchDeps = async () => {
      const [custRes, empRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('user_id', effectiveUserId).order('name'),
        supabase.from('employees').select('id, full_name').eq('user_id', effectiveUserId).eq('status', 'Ativo').order('full_name')
      ]);
      if (custRes.data) setCustomers(custRes.data);
      if (empRes.data) setEmployees(empRes.data);
    };
    fetchDeps();
  }, [effectiveUserId]);

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setFormData({
      title: order.title,
      customerId: order.customer_id,
      employeeId: order.employee_id || '',
      equipmentInfo: order.equipment_info || '',
      description: order.description || '',
      priority: order.priority || 'normal',
      estimatedCost: order.estimated_cost?.toString().replace('.', ',') || '0,00',
      billingType: order.billing_type || 'imediato',
      billingDays: (order.billing_days || 30).toString()
    });
    setIsModalOpen(true);
  };

  const handleBatchBilling = async () => {
    if (selectedOrders.length === 0) return;
    const firstOrder = orders.find(o => o.id === selectedOrders[0]);
    const differentCustomer = selectedOrders.some(id => orders.find(o => o.id === id).customer_id !== firstOrder.customer_id);
    if (differentCustomer) return showError("Selecione ordens do mesmo parceiro.");

    try {
      setLoading(true);
      const totalAmount = selectedOrders.reduce((acc, id) => acc + Number(orders.find(o => o.id === id).estimated_cost), 0);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data: charge, error: chargeErr } = await supabase.from('charges').insert({
        user_id: effectiveUserId,
        customer_id: firstOrder.customer_id,
        amount: totalAmount,
        description: `Lote Consolidado: ${selectedOrders.length} Serviços Realizados`,
        status: 'pendente',
        due_date: dueDate.toISOString().split('T')[0],
        method: 'pix'
      }).select().single();

      if (chargeErr) throw chargeErr;

      await supabase.from('service_orders').update({
        status: 'concluido',
        charge_id: charge.id,
        completion_date: new Date().toISOString()
      }).in('id', selectedOrders);

      showSuccess("Fatura de lote gerada!");
      setSelectedOrders([]);
      fetchOrders();
    } catch (err: any) { showError(err.message); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cost = parseFloat(formData.estimatedCost.replace(',', '.')) || 0;
      const dataToSave = {
        user_id: effectiveUserId,
        customer_id: formData.customerId,
        employee_id: formData.employeeId || null,
        title: formData.title,
        description: formData.description,
        equipment_info: formData.equipmentInfo,
        priority: formData.priority,
        estimated_cost: cost,
        billing_type: formData.billingType,
        billing_days: parseInt(formData.billingDays)
      };

      if (editingOrder) {
        await supabase.from('service_orders').update(dataToSave).eq('id', editingOrder.id);
        showSuccess("OS Atualizada!");
      } else {
        await supabase.from('service_orders').insert({ ...dataToSave, status: 'aberto', origin: 'manual' });
        showSuccess("OS Criada!");
      }
      setIsModalOpen(false);
      fetchOrders();
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'aberto': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'em_progresso': return "bg-orange-50 text-orange-600 border-orange-100";
      case 'concluido': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-zinc-100 text-zinc-500 border-zinc-200";
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrigin = originFilter === 'all' || o.origin === originFilter;
    return matchesSearch && matchesOrigin;
  });

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const webPendingCount = orders.filter(o => o.origin === 'web' && o.status === 'aberto').length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="text-blue-500" size={20} />
              <span className="text-[10px] font-black uppercase text-apple-muted tracking-widest">
                Gestão de Serviços {activeMerchant ? `• ${activeMerchant.company}` : ''}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black">Painel de Ordens</h2>
          </div>
          <div className="flex gap-3">
             {selectedOrders.length > 0 && (
               <button onClick={handleBatchBilling} className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
                 <Layers size={16} /> Faturar {selectedOrders.length} em Lote
               </button>
             )}
             <button onClick={fetchOrders} className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted shadow-sm hover:bg-apple-light transition-all">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
             </button>
             <button onClick={() => { setEditingOrder(null); setFormData({title:'', customerId:'', employeeId:'', equipmentInfo:'', description:'', priority:'normal', estimatedCost:'', billingType:'imediato', billingDays:'30'}); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"><Plus size={20} /> NOVA OS</button>
          </div>
        </div>

        {webPendingCount > 0 && (
           <div className="bg-purple-600 p-4 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-purple-600/20 animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Globe size={20} /></div>
                 <div>
                    <p className="text-xs font-black uppercase tracking-widest leading-none">Novas Solicitações Web</p>
                    <p className="text-[10px] opacity-80 mt-1">Existem {webPendingCount} ordens vindas do portal aguardando triagem.</p>
                 </div>
              </div>
              <button onClick={() => setOriginFilter('web')} className="bg-white text-purple-600 text-[9px] font-black uppercase px-4 py-2 rounded-lg hover:bg-apple-light transition-all">FILTRAR AGORA</button>
           </div>
        )}

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex flex-col md:flex-row gap-6 items-center justify-between">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar OS ou parceiro..." className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm" />
             </div>
             
             <div className="flex bg-apple-white border border-apple-border p-1 rounded-xl shadow-inner">
                <button onClick={() => setOriginFilter('all')} className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", originFilter === 'all' ? "bg-orange-500 text-white shadow-sm" : "text-apple-muted hover:text-apple-black")}>Todos</button>
                <button onClick={() => setOriginFilter('web')} className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2", originFilter === 'web' ? "bg-purple-600 text-white shadow-sm" : "text-apple-muted hover:text-apple-black")}><Globe size={12}/> Portal Web</button>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5 w-10"></th>
                  <th className="px-8 py-5">Protocolo / Origem</th>
                  <th className="px-8 py-5">Solicitante e Destino</th>
                  <th className="px-8 py-5">Valor / Regra</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-apple-muted italic"><p>Nenhuma ordem de serviço localizada.</p></td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className={cn("hover:bg-apple-light transition-colors group", selectedOrders.includes(order.id) && "bg-orange-50/50")}>
                      <td className="px-8 py-5">
                         {!order.charge_id && order.status !== 'concluido' && (
                           <button onClick={() => toggleSelect(order.id)} className="text-orange-500 transition-transform active:scale-90">
                              {selectedOrders.includes(order.id) ? <CheckSquare size={20} /> : <Square size={20} className="opacity-20 hover:opacity-100" />}
                           </button>
                         )}
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[10px] font-black text-apple-muted font-mono uppercase">#{order.id.split('-')[0]}</p>
                        <p className="text-sm font-black text-apple-black group-hover:text-orange-600 transition-colors">{order.title}</p>
                        <span className={cn(
                          "inline-flex items-center gap-1 mt-1 text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                          order.origin === 'web' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-apple-light text-apple-muted border-apple-border"
                        )}>
                           {order.origin === 'web' ? <Globe size={8} /> : <Wrench size={8} />} {order.origin === 'web' ? 'Portal Web' : 'Balcão'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                           <p className="text-sm font-bold text-apple-black">{order.customers?.name}</p>
                           {order.is_intermediary && (
                             <div className="bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg flex items-center gap-2 w-fit">
                                <Users size={10} className="text-orange-600" />
                                <span className="text-[9px] font-black text-orange-600 uppercase">P/ {order.final_customer_name}</span>
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                           <p className="text-sm font-black text-apple-black">{currency.format(order.estimated_cost)}</p>
                           <span className="text-[9px] font-bold text-apple-muted uppercase">{order.billing_type === 'faturado' ? `Faturado ${order.billing_days} dias` : 'À Vista'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button onClick={() => openEditModal(order)} className="p-3 text-apple-muted hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all" title="Editar / Vincular Parceiro"><Edit3 size={18}/></button>
                           <button onClick={() => { if(confirm("Deseja excluir permanentemente?")) fetchOrders(); }} className="p-3 text-apple-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                {editingOrder ? <Edit3 size={20} /> : <Plus size={20} />}
              </div>
              {editingOrder ? 'Ajustar Ordem de Serviço' : 'Nova Ordem de Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            <div className="space-y-4">
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Serviço Solicitado</Label><Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Solicitante (Parceiro)</Label>
                    <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
                      <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Vincular parceiro..." /></SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Valor de Reparo (R$)</Label><Input value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-apple-black" /></div>
               </div>
            </div>

            <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 space-y-5">
               <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest"><CreditCard size={14}/> Regra Financeira</div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-apple-muted">Modo de Cobrança</Label>
                    <Select value={formData.billingType} onValueChange={v => setFormData({...formData, billingType: v})}>
                      <SelectTrigger className="bg-white h-11 rounded-xl font-bold border-orange-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-orange-200">
                          <SelectItem value="imediato">Individual (À Vista)</SelectItem>
                          <SelectItem value="faturado">Faturado em Lote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-apple-muted">Prazo (Dias)</Label>
                    <Input placeholder="30" value={formData.billingDays} onChange={e => setFormData({...formData, billingDays: e.target.value})} className="bg-white h-11 rounded-xl border-orange-200" />
                  </div>
               </div>
            </div>

            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Equipamento / Modelo</Label><Input value={formData.equipmentInfo} onChange={e => setFormData({...formData, equipmentInfo: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted">Relato do Problema</Label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-xl p-4 h-24 outline-none text-sm font-medium" /></div>

            <DialogFooter className="pt-4 border-t border-apple-border">
              <button type="submit" disabled={saving} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" /> : editingOrder ? <CheckCircle2 size={18} /> : <Wrench size={18} />}
                {editingOrder ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR ABERTURA'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ServiceOrders;