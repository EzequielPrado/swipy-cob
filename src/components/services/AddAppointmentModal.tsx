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
import { Loader2, CalendarClock, Clock, AlignLeft } from 'lucide-react';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAppointmentModal = ({ isOpen, onClose, onSuccess }: AddAppointmentModalProps) => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && effectiveUserId) {
      supabase.from('customers').select('id, name').eq('user_id', effectiveUserId).order('name')
        .then(({ data }) => { if (data) setCustomers(data); });
        
      const now = new Date();
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
        title: formData.title,
        start_time: new Date(formData.startTime).toISOString(),
        end_time: new Date(formData.endTime).toISOString(),
        notes: formData.notes,
        status: 'agendado'
      };

      const { error } = await supabase.from('appointments').insert(payload);
      if (error) throw error;

      showSuccess('Agendamento registrado com sucesso!');
      onSuccess();
      onClose();
      setFormData({ customerId: '', title: '', startTime: '', endTime: '', notes: '' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <CalendarClock size={20} />
            </div>
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Serviço / Assunto</Label>
            <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" placeholder="Ex: Manutenção Preventiva, Visita Técnica..." />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Cliente</Label>
            <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1.5"><Clock size={12} className="text-emerald-500" /> Início</Label>
                <Input type="datetime-local" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1.5"><Clock size={12} className="text-red-500" /> Término (Previsão)</Label>
                <Input type="datetime-local" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
             </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-1.5"><AlignLeft size={12} /> Observações Internas</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Detalhes adicionais, ferramentas necessárias, endereço..." className="bg-apple-offWhite border-apple-border rounded-2xl p-4 min-h-[100px]" />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CalendarClock size={20} />}
              SALVAR AGENDAMENTO
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentModal;