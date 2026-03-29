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
import { Loader2, FileText, Calendar, RefreshCcw, Hash, Tag, Info, DollarSign } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WEEKDAYS = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
];

const CATEGORIES = ["Licença SaaS", "Manutenção", "Suporte Técnico", "Consultoria", "Aluguel", "Mensalidade", "Outros"];

const AddContractModal = ({ isOpen, onClose, onSuccess }: AddContractModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    contractNumber: '',
    category: CATEGORIES[0],
    amount: '',
    description: '',
    frequency: 'monthly',
    generationDay: '1',
    dueDay: '5',
    generationWeekday: '1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      supabase.from('customers').select('id, name').eq('user_id', user.id).eq('status', 'em dia').order('name')
        .then(({ data }) => { if (data) setCustomers(data); });
      
      // Gerar número de contrato sugerido
      setFormData(prev => ({ ...prev, contractNumber: `CTR-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}` }));
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return showError("Selecione um cliente");
    
    setLoading(true);
    try {
      const amountVal = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amountVal) || amountVal <= 0) throw new Error("Valor inválido");

      const payload = {
        user_id: user?.id,
        customer_id: formData.customerId,
        contract_number: formData.contractNumber,
        category: formData.category,
        amount: amountVal,
        description: formData.description,
        frequency: formData.frequency,
        generation_day: formData.frequency === 'monthly' ? parseInt(formData.generationDay) : null,
        due_day: formData.frequency === 'monthly' ? parseInt(formData.dueDay) : null,
        generation_weekday: formData.frequency === 'weekly' ? parseInt(formData.generationWeekday) : null,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        notes: formData.notes,
        status: 'active'
      };

      const { error } = await supabase.from('subscriptions').insert(payload);
      if (error) throw error;

      showSuccess('Contrato registrado com sucesso!');
      onSuccess();
      onClose();
      setFormData({
        customerId: '', contractNumber: '', category: CATEGORIES[0], amount: '', description: '',
        frequency: 'monthly', generationDay: '1', dueDay: '5', generationWeekday: '1',
        startDate: new Date().toISOString().split('T')[0], endDate: '', notes: ''
      });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[650px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <FileText size={20} />
            </div>
            Novo Contrato de Prestação
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-2"><Hash size={12} /> Número do Contrato</Label>
              <Input required value={formData.contractNumber} onChange={e => setFormData({...formData, contractNumber: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted flex items-center gap-2"><Tag size={12} /> Categoria</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Cliente Contratante</Label>
            <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-orange-600">Frequência de Cobrança</Label>
                <div className="flex gap-2">
                   {['monthly', 'weekly'].map(f => (
                     <button key={f} type="button" onClick={() => setFormData({...formData, frequency: f})} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all", formData.frequency === f ? "bg-orange-500 border-orange-600 text-white shadow-sm" : "bg-white border-orange-200 text-orange-400")}>
                       {f === 'monthly' ? 'Mensal' : 'Semanal'}
                     </button>
                   ))}
                </div>
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-orange-600">Valor Recorrente (R$)</Label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={14} />
                   <Input required placeholder="0,00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="bg-white border-orange-200 h-11 pl-8 rounded-xl font-black text-apple-black" />
                </div>
             </div>
          </div>

          {formData.frequency === 'monthly' ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted">Dia da Geração</Label>
                <Select value={formData.generationDay} onValueChange={v => setFormData({...formData, generationDay: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">{days.map(d => <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-apple-muted">Dia do Vencimento</Label>
                <Select value={formData.dueDay} onValueChange={v => setFormData({...formData, dueDay: v})}>
                  <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-apple-white border-apple-border">{days.map(d => <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Dia da Semana (Geração)</Label>
              <Select value={formData.generationWeekday} onValueChange={v => setFormData({...formData, generationWeekday: v})}>
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  {WEEKDAYS.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-apple-muted italic">A fatura será gerada toda {WEEKDAYS.find(w => w.id.toString() === formData.generationWeekday)?.label}.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Início de Vigência</Label>
              <Input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Término (Opcional)</Label>
              <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Notas Internas / Cláusulas</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Informações relevantes sobre este contrato..." className="bg-apple-offWhite border-apple-border rounded-2xl p-4 min-h-[100px]" />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
              REGISTRAR CONTRATO
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddContractModal;