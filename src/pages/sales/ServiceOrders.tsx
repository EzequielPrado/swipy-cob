"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  Wrench, Plus, Search, Clock, CheckCircle2, AlertCircle, 
  ArrowRight, User, Calendar, Loader2, DollarSign, Tag
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ServiceOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    employeeId: '',
    equipmentInfo: '',
    description: '',
    priority: 'normal',
    estimatedCost: ''
  });

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('service_orders')
      .select('*, customers(name), employees(full_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  };

  const fetchDependencies = async () => {
    if (!user) return;
    const [custRes, empRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('employees').select('id, full_name').eq('user_id', user.id).eq('status', 'Ativo').order('full_name')
    ]);
    if (custRes.data) setCustomers(custRes.data);
    if (empRes.data) setEmployees(empRes.data);
  };

  useEffect(() => {
    fetchOrders();
    fetchDependencies();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.title) return showError("Preencha o título e selecione um cliente.");
    
    setSaving(true);
    try {
      const cost = parseFloat(formData.estimatedCost.replace(',', '.')) || 0;
      
      const { error } = await supabase.from('service_orders').insert({
        user_id: user?.id,
        customer_id: formData.customerId,
        employee_id: formData.employeeId || null,
        title: formData.title,
        description: formData.description,
        equipment_info: formData.equipmentInfo,
        priority: formData.priority,
        estimated_cost: cost,
        status: 'aberto'
      });

      if (error) throw error;

      showSuccess("Ordem de Serviço aberta com sucesso!");
      setIsAddModalOpen(false);
      setFormData({ title: '', customerId: '', employeeId: '', equipmentInfo: '', description: '', priority: 'normal', estimatedCost: '' });
      fetchOrders();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'aberto': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'em_progresso': return "bg-orange-50 text-orange-600 border-orange-100";
      case 'concluido': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-apple-offWhite text-apple-muted border-apple-border";
    }
  };

  const filteredOrders = orders.filter(o => 
    o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Wrench className="text-blue-500" size={32} /> Ordens de Serviço
            </h2>
            <p className="text-apple-muted font-medium mt-1">Controle técnico e manutenção para prestadores de serviços.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/10 flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} /> NOVA ORDEM
          </button>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente ou serviço..." 
                className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">OS # / Serviço</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Responsável</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Valor Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-apple-muted italic">Nenhuma ordem aberta.</td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-apple-light transition-colors group cursor-pointer">
                      <td className="px-8 py-5">
                        <p className="text-[10px] font-black text-apple-muted font-mono uppercase">#{order.id.split('-')[0]}</p>
                        <p className="text-sm font-black text-apple-black group-hover:text-blue-600 transition-colors">{order.title}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-apple-dark">{order.customers?.name}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-medium text-apple-muted">{order.employees?.full_name || '---'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", getStatusStyle(order.status))}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-apple-black">
                        {currency.format(order.estimated_cost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              <Wrench className="text-blue-500" /> Abrir Ordem de Serviço
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Título do Trabalho</Label>
              <Input 
                required
                placeholder="Ex: Troca de Tela iPhone 13" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted">Cliente</Label>
                <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
                  <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted">Técnico / Responsável</Label>
                <Select value={formData.employeeId} onValueChange={v => setFormData({...formData, employeeId: v})}>
                  <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-apple-muted">Prioridade</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                    <SelectTrigger className="bg-apple-offWhite h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-apple-white border-apple-border">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgente">Urgente / Crítica</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-apple-muted">Orçamento Est. (R$)</Label>
                  <Input 
                    placeholder="0,00" 
                    value={formData.estimatedCost}
                    onChange={e => setFormData({...formData, estimatedCost: e.target.value})}
                    className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-apple-black" 
                  />
               </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Dados do Equipamento</Label>
              <Input 
                placeholder="Marca, Modelo, Placa ou Número de Série" 
                value={formData.equipmentInfo}
                onChange={e => setFormData({...formData, equipmentInfo: e.target.value})}
                className="bg-apple-offWhite h-12 rounded-xl" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Laudo Inicial / Defeito</Label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-apple-offWhite border border-apple-border rounded-xl p-4 h-32 outline-none font-medium text-sm" 
                placeholder="O que o cliente relatou e o que precisa ser feito..." 
              />
            </div>

            <DialogFooter className="pt-4 border-t border-apple-border">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                ABRIR ORDEM DE SERVIÇO
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ServiceOrders;