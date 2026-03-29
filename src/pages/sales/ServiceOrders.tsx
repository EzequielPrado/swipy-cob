"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  Wrench, Plus, Search, Clock, CheckCircle2, AlertCircle, 
  ArrowRight, User, Calendar, Loader2, DollarSign, Tag, Trash2, Edit3, Filter, ChevronRight, MapPin, Share2, Copy, Globe, UserCheck, ExternalLink, Inbox, Users, CreditCard, CalendarClock, CheckSquare, Square, Layers, RefreshCw, Eye, Paperclip, FileText, ChevronDown, ListFilter, PlayCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, Link } from 'react-router-dom';

const ServiceOrders = () => {
  const { effectiveUserId, activeMerchant } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'web' | 'manual'>('all');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '', customerId: '', employeeId: '', description: '', priority: 'normal', estimatedCost: '',
    billingType: 'imediato', billingDays: '30'
  });

  const monthOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Todo o Histórico' }];
    const d = new Date();
    d.setDate(1);
    for(let i=0; i<12; i++) {
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() - 1);
    }
    return options;
  }, []);

  const fetchOrders = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('service_orders')
        .select('*, customers(id, name, email, phone, tax_id), employees(full_name)')
        .eq('user_id', effectiveUserId);

      if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-');
        const start = `${year}-${month}-01`;
        const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
        query = query.gte('created_at', start).lte('created_at', `${end}T23:59:59`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      showError("Erro ao carregar ordens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [effectiveUserId, selectedMonth]);

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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      showSuccess(`OS movida para ${newStatus.replace('_', ' ')}!`);
      fetchOrders();
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta OS permanentemente?")) return;
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Ordem de serviço removida.");
      fetchOrders();
    } catch (err: any) { showError(err.message); }
  };

  const handleBatchBilling = async () => {
    if (selectedOrders.length === 0) return;
    const firstOrder = orders.find(o => o.id === selectedOrders[0]);
    const differentCustomer = selectedOrders.some(id => orders.find(o => o.id === id).customer_id !== firstOrder.customer_id);
    if (differentCustomer) return showError("Selecione ordens do mesmo parceiro para faturar em lote.");

    try {
      setSaving(true);
      const total = selectedOrders.reduce((acc, id) => acc + Number(orders.find(o => o.id === id).estimated_cost || 0), 0);
      const { data: charge, error: chargeErr } = await supabase.from('charges').insert({
        user_id: effectiveUserId,
        customer_id: firstOrder.customer_id,
        amount: total,
        description: `Lote Consolidado: ${selectedOrders.length} Ordens de Serviço`,
        status: 'pendente',
        due_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        method: 'manual'
      }).select().single();

      if (chargeErr) throw chargeErr;

      await supabase.from('service_orders').update({
        status: 'concluido',
        updated_at: new Date().toISOString()
      }).in('id', selectedOrders);

      showSuccess("Faturamento em lote gerado com sucesso!");
      setSelectedOrders([]);
      fetchOrders();
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
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
        priority: formData.priority,
        estimated_cost: cost,
        billing_type: formData.billingType,
        billing_days: parseInt(formData.billingDays) || 30,
      };

      if (editingOrder) await supabase.from('service_orders').update(dataToSave).eq('id', editingOrder.id);
      else await supabase.from('service_orders').insert({ ...dataToSave, status: 'aberto', origin: 'manual' });

      setIsModalOpen(false);
      fetchOrders();
      showSuccess("Dados salvos!");
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  const toggleSelect = (id: string) => setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            o.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrigin = originFilter === 'all' || o.origin === originFilter;
      return matchesSearch && matchesOrigin;
    });
  }, [orders, searchTerm, originFilter]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const stats = useMemo(() => ({
    open: orders.filter(o => o.status === 'aberto').length,
    progress: orders.filter(o => o.status === 'em_progresso').length,
    done: orders.filter(o => o.status === 'concluido').length,
    revenue: orders.reduce((acc, o) => acc + Number(o.estimated_cost || 0), 0)
  }), [orders]);

  const selectedTotal = useMemo(() => selectedOrders.reduce((acc, id) => acc + Number(orders.find(o => o.id === id)?.estimated_cost || 0), 0), [selectedOrders, orders]);

  // Função para extrair anexo da descrição
  const getAttachmentUrl = (desc: string) => {
    if (!desc) return null;
    const match = desc.match(/\[Anexo enviado pelo cliente: (.*?)\]/);
    return match ? match[1] : null;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="text-orange-500" size={20} />
              <span className="text-[10px] font-black uppercase text-apple-muted tracking-widest">Serviços {activeMerchant ? `• ${activeMerchant.company}` : ''}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black">Painel de Ordens</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-apple-white border border-apple-border rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                <Calendar size={16} className="text-apple-muted" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                   <SelectTrigger className="w-[180px] border-none bg-transparent h-8 p-0 font-bold text-orange-500 shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                   <SelectContent className="bg-apple-white border-apple-border">{monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <button onClick={() => { setEditingOrder(null); setFormData({title:'', customerId:'', employeeId:'', description:'', priority:'normal', estimatedCost:'0,00', billingType:'imediato', billingDays:'30'}); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"><Plus size={20} /> NOVA OS</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Aguardando Início</p><p className="text-3xl font-black text-apple-black">{stats.open}</p></div>
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm border-l-4 border-l-orange-500"><p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Em Execução</p><p className="text-3xl font-black text-apple-black">{stats.progress}</p></div>
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm border-l-4 border-l-emerald-500"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Concluídas (Mês)</p><p className="text-3xl font-black text-apple-black">{stats.done}</p></div>
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Volume Previsto</p><p className="text-3xl font-black text-blue-600">{currency.format(stats.revenue)}</p></div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm min-h-[400px]">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex flex-col md:flex-row gap-6 items-center justify-between">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar OS..." className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none shadow-sm" />
             </div>
             <div className="flex bg-apple-white border border-apple-border p-1 rounded-xl shadow-inner">
                <button onClick={() => setOriginFilter('all')} className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", originFilter === 'all' ? "bg-orange-50 text-white shadow-sm" : "text-apple-muted hover:text-apple-black")}>Todas</button>
                <button onClick={() => setOriginFilter('web')} className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2", originFilter === 'web' ? "bg-purple-600 text-white shadow-sm" : "text-apple-muted hover:text-apple-black")}><Globe size={12}/> Portal</button>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5 w-10"></th>
                  <th className="px-8 py-5">Protocolo / Data</th>
                  <th className="px-8 py-5">Solicitante / Anexo</th>
                  <th className="px-8 py-5">Situação</th>
                  <th className="px-8 py-5 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (<tr><td colSpan={5} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={40} /></td></tr>) : 
                  filteredOrders.length === 0 ? (<tr><td colSpan={5} className="py-24 text-center text-apple-muted italic"><p>Nenhuma OS encontrada.</p></td></tr>) :
                  filteredOrders.map((order) => {
                    const attachment = getAttachmentUrl(order.description);
                    return (
                      <tr key={order.id} className={cn("hover:bg-apple-light transition-colors group", selectedOrders.includes(order.id) && "bg-orange-50/50")}>
                        <td className="px-8 py-5"><button onClick={() => toggleSelect(order.id)} className="text-orange-500">{selectedOrders.includes(order.id) ? <CheckSquare size={20} /> : <Square size={20} className="opacity-10 hover:opacity-100" />}</button></td>
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-black text-apple-muted font-mono uppercase">#{order.id.split('-')[0]}</p>
                          <p className="text-sm font-black text-apple-black group-hover:text-orange-600 transition-colors">{order.title}</p>
                          <p className="text-[9px] text-apple-muted font-bold mt-1 uppercase flex items-center gap-1"><Calendar size={10} /> {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                        </td>
                        <td className="px-8 py-5">
                           <p className="text-sm font-bold text-apple-black">{order.customers?.name}</p>
                           {attachment && (
                             <a href={attachment} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-all"><Paperclip size={10} /> Abrir Arquivo/Foto</a>
                           )}
                        </td>
                        <td className="px-8 py-5">
                           <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit block mb-1.5", 
                              order.status === 'aberto' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                              order.status === 'em_progresso' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                           )}>{order.status.replace('_', ' ')}</span>
                           <p className="text-sm font-black text-apple-black">{currency.format(order.estimated_cost)}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                             {order.status === 'aberto' && <button onClick={() => handleUpdateStatus(order.id, 'em_progresso')} className="p-2.5 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm" title="Iniciar Execução"><PlayCircle size={18}/></button>}
                             {order.status === 'em_progresso' && <button onClick={() => handleUpdateStatus(order.id, 'concluido')} className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Finalizar Serviço"><CheckCircle2 size={18}/></button>}
                             <button onClick={() => openEditModal(order)} className="p-2.5 text-apple-muted hover:text-blue-500"><Edit3 size={18}/></button>
                             <button onClick={() => handleDelete(order.id)} className="p-2.5 text-apple-muted hover:text-red-500"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-apple-black text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-12 animate-in slide-in-from-bottom-10 duration-500 z-50 border border-white/10">
             <div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg"><Layers size={24}/></div><div><p className="text-sm font-black tracking-tight">{selectedOrders.length} Ordens Selecionadas</p><p className="text-xs text-zinc-400 font-medium">Total: <span className="text-orange-400 font-bold">{currency.format(selectedTotal)}</span></p></div></div>
             <div className="flex gap-4"><button onClick={() => setSelectedOrders([])} className="text-xs font-bold text-zinc-400 hover:text-white">Cancelar</button><button onClick={handleBatchBilling} disabled={saving} className="bg-white text-apple-black px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">{saving ? <Loader2 className="animate-spin" size={16} /> : <><CreditCard size={16} /> FATURAR EM LOTE</>}</button></div>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] p-0 overflow-hidden shadow-2xl rounded-[2.5rem]">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3"><div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">{editingOrder ? <Edit3 size={20} /> : <Plus size={20} />}</div>{editingOrder ? 'Ajustar Solicitação' : 'Novo Chamado de Atendimento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Assunto / Título</Label><Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Solicitante</Label><Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}><SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent className="bg-apple-white border-apple-border">{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Valor Previsto (R$)</Label><Input value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-apple-black" /></div>
               </div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Relato / Instruções</Label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-apple-offWhite border border-apple-border rounded-2xl p-4 h-24 outline-none text-sm font-medium focus:ring-2 focus:ring-orange-500/20" /></div>
            <DialogFooter className="pt-4 border-t border-apple-border"><button type="submit" disabled={saving} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">{saving ? <Loader2 className="animate-spin" /> : editingOrder ? <CheckCircle2 size={18} /> : <Wrench size={18} />}{editingOrder ? 'ATUALIZAR OPERAÇÃO' : 'CONFIRMAR ABERTURA'}</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ServiceOrders;