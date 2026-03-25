"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, FileText, Send, User } from 'lucide-react';

interface IssueInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const IssueInvoiceModal = ({ isOpen, onClose, onSuccess }: IssueInvoiceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      supabase.from('customers').select('id, name').order('name').then(({ data }) => {
        if (data) setCustomers(data);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/create-woovi-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          amount: parseFloat(formData.amount.replace(',', '.')),
          description: formData.description
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      showSuccess("Nota emitida e enviada via WhatsApp!");
      onSuccess();
      onClose();
      setFormData({ customerId: '', amount: '', description: '' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            Emitir Fatura / NF
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Cliente Destinatário</Label>
            <Select 
              value={formData.customerId}
              onValueChange={(val) => setFormData({...formData, customerId: val})}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor da Nota (R$)</Label>
            <Input 
              required
              placeholder="0,00"
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição dos Serviços</Label>
            <Input 
              placeholder="Ex: Consultoria técnica, licença mensal..."
              className="bg-zinc-950 border-zinc-800 h-11"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
             <Send className="text-blue-400 mt-1" size={16} />
             <p className="text-[11px] text-zinc-400 leading-relaxed">
               Ao confirmar, o sistema gerará o link oficial na Woovi e disparará uma mensagem para o WhatsApp do cliente com o PDF da fatura.
             </p>
          </div>

          <DialogFooter>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              Emitir e Enviar Nota
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueInvoiceModal;