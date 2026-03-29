"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, DollarSign, Settings2, FileText, Calendar, Tag, Hash } from 'lucide-react';

interface EditContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract: any;
}

const CATEGORIES = ["Honorários", "Licença SaaS", "Manutenção", "Suporte Técnico", "Consultoria", "Aluguel", "Mensalidade", "Outros"];

const EditContractModal = ({ isOpen, onClose, onSuccess, contract }: EditContractModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    status: '',
    generationDay: '',
    dueDay: '',
    notes: '',
    endDate: ''
  });

  useEffect(() => {
    if (contract && isOpen) {
      setFormData({
        amount: contract.amount.toString().replace('.', ','),
        description: contract.description || '',
        category: contract.category || CATEGORIES[0],
        status: contract.status,
        generationDay: (contract.generation_day || '1').toString(),
        dueDay: (contract.due_day || '5').toString(),
        notes: contract.notes || '',
        endDate: contract.end_date || ''
      });
    }
  }, [contract, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amountVal = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amountVal)) throw new Error("Valor de reajuste inválido");
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          amount: amountVal,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          generation_day: parseInt(formData.generationDay),
          due_day: parseInt(formData.dueDay),
          notes: formData.notes,
          end_date: formData.endDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      showSuccess('Contrato atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-xl flex items-center gap-2 font-black">
            <Settings2 className="text-orange-500" size={20} />
            Editar Contrato
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono bg-apple-light px-2 py-0.5 rounded border border-apple-border uppercase font-bold text-apple-muted">#{contract?.contract_number || 'S/N'}</span>
            <p className="text-xs text-apple-muted font-bold">Cliente: {contract?.customers?.name}</p>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Situação</Label>
              <Select 
                value={formData.status}
                onValueChange={(val) => setFormData({...formData, status: val})}
              >
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-11 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Categoria</Label>
              <Select 
                value={formData.category}
                onValueChange={(val) => setFormData({...formData, category: val})}
              >
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-11 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-orange-600">Valor Atual / Reajuste (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
              <Input 
                required
                className="bg-apple-offWhite border-orange-200 h-12 pl-9 rounded-xl font-black text-lg text-apple-black"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Geração (Dia)</Label>
              <Select 
                value={formData.generationDay}
                onValueChange={(val) => setFormData({...formData, generationDay: val})}
              >
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {days.map((d) => (
                    <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-apple-muted">Vencimento (Dia)</Label>
              <Select 
                value={formData.dueDay}
                onValueChange={(val) => setFormData({...formData, dueDay: val})}
              >
                <SelectTrigger className="bg-apple-offWhite border-apple-border h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border text-apple-black">
                  {days.map((d) => (
                    <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Descrição da Fatura</Label>
            <Input 
              className="bg-apple-offWhite border-apple-border h-11 rounded-xl"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Término da Vigência</Label>
            <Input 
              type="date"
              className="bg-apple-offWhite border-apple-border h-11 rounded-xl"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-apple-muted">Notas Internas</Label>
            <Textarea 
              className="bg-apple-offWhite border-apple-border rounded-xl min-h-[80px]"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              SALVAR ALTERAÇÕES
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditContractModal;