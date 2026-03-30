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
import { Loader2, Palmtree, User, Calendar, FileText } from 'lucide-react';

interface AddAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES = ["Férias", "Afastamento Médico", "Licença Maternidade/Paternidade", "Folga", "Outros"];

const AddAbsenceModal = ({ isOpen, onClose, onSuccess }: AddAbsenceModalProps) => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'Férias',
    startDate: '',
    endDate: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && effectiveUserId) {
      supabase.from('employees').select('id, full_name').eq('user_id', effectiveUserId).eq('status', 'Ativo').order('full_name')
        .then(({ data }) => { if (data) setEmployees(data); });
    }
  }, [isOpen, effectiveUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return showError("Selecione um colaborador.");
    
    setLoading(true);
    try {
      const { error } = await supabase.from('employee_absences').insert({
        user_id: effectiveUserId,
        employee_id: formData.employeeId,
        type: formData.type,
        start_date: formData.startDate,
        end_date: formData.endDate,
        notes: formData.notes,
        status: 'Agendado'
      });

      if (error) throw error;

      showSuccess('Ausência agendada com sucesso!');
      onSuccess();
      onClose();
      setFormData({ employeeId: '', type: 'Férias', startDate: '', endDate: '', notes: '' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Palmtree size={20} />
            </div>
            Novo Afastamento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Colaborador</Label>
            <Select value={formData.employeeId} onValueChange={v => setFormData({...formData, employeeId: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione o membro do time..." /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Tipo de Ausência</Label>
            <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Data Início</Label>
              <Input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Data Fim</Label>
              <Input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted ml-1">Observações Internas</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Motivo detalhado ou observações..." className="bg-apple-offWhite border-apple-border rounded-2xl p-4 min-h-[80px]" />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "CONFIRMAR AGENDAMENTO"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAbsenceModal;