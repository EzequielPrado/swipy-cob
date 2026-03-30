"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  CreditCard, 
  Zap, 
  Loader2, 
  Plus, 
  ShoppingCart, 
  ArrowUpRight, 
  CheckCircle2, 
  Smartphone,
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BenefitsManagement = () => {
  const { effectiveUserId, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'VR',
    amount: ''
  });

  const fetchData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const [empRes, ordRes] = await Promise.all([
        supabase.from('employees').select('id, full_name, department, job_role').eq('user_id', effectiveUserId).eq('status', 'Ativo'),
        supabase.from('benefit_orders').select('*, employees(full_name)').eq('user_id', effectiveUserId).order('created_at', { ascending: false }).limit(10)
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (ordRes.data) setOrders(ordRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [effectiveUserId]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.amount) return showError("Preencha todos os campos.");
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('benefit_orders').insert({
        user_id: effectiveUserId,
        employee_id: formData.employeeId,
        type: formData.type,
        amount: parseFloat(formData.amount.replace(',', '.')),
        status: 'Processado' // Mock: Simula que o cartão foi carregado instantaneamente
      });

      if (error) throw error;

      showSuccess(`Crédito ${formData.type} enviado para o Swipy Card!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md uppercase tracking-widest">Powered by Vale Presente</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
              <CreditCard className="text-orange-500" size={32} /> Swipy Card
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão integrada de cartões benefício e premiações.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-apple-black text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-xl active:scale-95"
          >
            <Plus size={20} /> RECARREGAR CARTÃO
          </button>
        </div>

        {/* MOCK DE CARTÃO FÍSICO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-10"><Zap size={180} fill="white" /></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                 <div className="flex justify-between items-start">
                    <img src="/logo-swipy.png" className="w-12 h-12 brightness-0 invert" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Swipy Card Business</span>
                 </div>
                 <div className="mt-16">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Empresa Vinculada</p>
                    <p className="text-3xl font-black tracking-tighter uppercase">{profile?.company || 'Nossa Empresa'}</p>
                 </div>
                 <div className="mt-10 flex gap-12">
                    <div>
                       <p className="text-[9px] font-black uppercase opacity-60 mb-1">Taxa de Emissão</p>
                       <p className="text-lg font-black">Isento</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black uppercase opacity-60 mb-1">Rede de Aceitação</p>
                       <p className="text-lg font-black">Mastercard®</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
                 <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4">Total Desembolsado (Mês)</p>
                 <h3 className="text-3xl font-black text-apple-black">
                   {currency.format(orders.reduce((acc, curr) => acc + Number(curr.amount), 0))}
                 </h3>
                 <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <ArrowUpRight size={14} /> 12% mais que o mês anterior
                 </div>
              </div>
              <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
                 <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-4">Cartões Ativos</p>
                 <div className="flex items-center gap-4">
                    <h3 className="text-3xl font-black text-apple-black">{employees.length}</h3>
                    <div className="flex -space-x-2">
                       {employees.slice(0, 3).map((e, i) => (
                         <div key={i} className="w-8 h-8 rounded-full bg-orange-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-orange-500 shadow-sm">{e.full_name.charAt(0)}</div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
           <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
              <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-orange-500" /> Últimas Recargas
              </h3>
           </div>
           <div className="p-2">
              {loading ? (
                <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-apple-muted italic">Nenhum pedido de crédito processado.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="text-[9px] font-black text-apple-muted uppercase bg-apple-offWhite">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Colaborador</th>
                      <th className="px-6 py-4">Benefício</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-apple-border">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-apple-light transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-apple-muted">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}</td>
                        <td className="px-6 py-4 font-black text-sm text-apple-black">{order.employees?.full_name}</td>
                        <td className="px-6 py-4">
                           <span className={cn(
                             "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border",
                             order.type === 'VR' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                           )}>{order.type}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-apple-black">{currency.format(order.amount)}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-1.5 text-[10px] font-black text-emerald-600 uppercase">
                              <CheckCircle2 size={12} /> {order.status}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
           </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <DialogHeader className="p-8 bg-apple-offWhite border-b border-apple-border">
              <DialogTitle className="text-xl font-black flex items-center gap-3">
                 <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Zap size={20} /></div>
                 Recarregar Swipy Card
              </DialogTitle>
           </DialogHeader>
           <form onSubmit={handleOrder} className="p-8 space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black text-apple-muted uppercase ml-1">Colaborador</Label>
                 <Select value={formData.employeeId} onValueChange={v => setFormData({...formData, employeeId: v})}>
                    <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione o beneficiário..." /></SelectTrigger>
                    <SelectContent className="bg-apple-white border-apple-border">
                       {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black text-apple-muted uppercase ml-1">Tipo de Crédito</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                       <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                       <SelectContent className="bg-apple-white border-apple-border">
                          <SelectItem value="VR">VR (Refeição)</SelectItem>
                          <SelectItem value="VA">VA (Alimentação)</SelectItem>
                          <SelectItem value="PREMIO">Premiação / Incentivo</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black text-apple-muted uppercase ml-1">Valor (R$)</Label>
                    <Input required placeholder="0,00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-orange-500" />
                 </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
                 <ShieldCheck className="text-orange-500 shrink-0 mt-0.5" size={16} />
                 <p className="text-[10px] text-orange-800 leading-relaxed font-medium">
                   O crédito ficará disponível no cartão do colaborador em até 10 minutos. O valor será deduzido do saldo da sua <strong>Swipy Conta</strong>.
                 </p>
              </div>

              <DialogFooter>
                 <button type="submit" disabled={submitting} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> CONFIRMAR PEDIDO</>}
                 </button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default BenefitsManagement;