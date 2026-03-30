"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, CalendarClock, Clock, User, UserCheck, Plus } from 'lucide-react';
import AddCustomerModal from '@/components/customers/AddCustomerModal';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAppointmentModal = ({ isOpen, onClose, onSuccess }: AddAppointmentModalProps) => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isNewCustOpen, setIsNewCustOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: '',
    employeeId: 'none',
    title: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  const fetchData = async () => {
    if (!effectiveUserId) return;
    const [custRes, empRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('user_id', effectiveUserId).order('name'),
      supabase.from('employees').select('id, full_name').eq('user_id', effectiveUserId).eq('status', 'Ativo').order('full_name')
    ]);
    if (custRes.data) setCustomers(custRes.data);
    if (empRes.data) setEmployees(empRes.data);
  };

  useEffect(() => {
    if (isOpen && effectiveUserId) {
      fetchData();
      const now = new Date();
      now.setMinutes(0);
      const start = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const end = new Date(now.getTime() - now.getTimezoneOffset() * 60000 + 60 * 60000).toISOString().slice(0, 16);
      setFormData(prev => ({ ...prev, startTime: start, endTime: end }));
    }
  }, [isOpen, effectiveUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return showError("Selecione um cliente");
    
    setLoading(true);
    try {
      const payload = {
        user_id: effectiveUserId,
        customer_id: formData.customerId,
        employee_id: formData.employeeId === 'none' ? null : formData.employeeId,
        title: formData.title,
        start_time: new Date(formData.startTime).toISOString(),
        end_time: new Date(formData.endTime).toISOString(),
        notes: formData.notes,
        status: 'agendado'
      };

      const { error } = await supabase.from('appointments').insert(payload);
      if (error) throw error;

      showSuccess('Agendamento registrado!');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <CalendarClock size={20} />
              </div>
              Reservar Horário
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Cliente</Label>
                <button type="button" onClick={() => setIsNewCustOpen(true)} className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1 hover:bg-orange-100"><Plus size={10} /> NOVO CLIENTE</button>
              </div>
              <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Para quem é o atendimento?" /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">O que será feito?</Label>
              <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" placeholder="Ex: Revisão, Banho & Tosa, Mentoria..." />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1 flex items-center gap-2"><UserCheck size={12} className="text-blue-500" /> Profissional Responsável</Label>
              <Select value={formData.employeeId} onValueChange={v => setFormData({...formData, employeeId: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  <SelectItem value="none">Qualquer um / Sem responsável</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1.5"><Clock size={12} className="text-emerald-500" /> Início</Label>
                  <Input type="datetime-local" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1.5"><Clock size={12} className="text-red-500" /> Fim Estimado</Label>
                  <Input type="datetime-local" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
               </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Instruções ou Notas</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Instruções para o técnico ou observações do cliente..." className="bg-apple-offWhite border-apple-border rounded-2xl p-4 min-h-[80px]" />
            </div>

            <DialogFooter className="pt-4 border-t border-apple-border">
              <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : "CONFIRMAR RESERVA"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddCustomerModal isOpen={isNewCustOpen} onClose={() => setIsNewCustOpen(false)} onSuccess={fetchData} />
    </>
  );
};

export default AddAppointmentModal;