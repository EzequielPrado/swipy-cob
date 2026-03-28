"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, FileText, Send } from 'lucide-react';

interface IssueInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultData?: {
    customerId: string;
    amount: string;
    description: string;
  };
}

const IssueInvoiceModal = ({ isOpen, onClose, onSuccess, defaultData }: IssueInvoiceModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      supabase.from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')
        .then(({ data }) => {
          if (data) setCustomers(data);
        });

      // Se houver dados padrão (vindos de uma cobrança paga), preenche o form
      if (defaultData) {
        setFormData(defaultData);
      } else {
        setFormData({ customerId: '', amount: '', description: '' });
      }
    }
  }, [isOpen, user, defaultData]);

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
          <DialogTitle className="text-xl flex items-center gap-3 font-black">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
               <FileText size={20} />
            </div>
            Emitir Fatura / NF
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-muted uppercase">Cliente Destinatário</Label>
            <Select 
              value={formData.customerId}
              onValueChange={(val) => setFormData({...formData, customerId: val})}
            >
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="focus:bg-apple-light">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-muted uppercase">Valor da Nota (R$)</Label>
            <Input 
              required
              placeholder="0,00"
              className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-black text-apple-black"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-muted uppercase">Descrição dos Serviços</Label>
            <Input 
              placeholder="Ex: Consultoria técnica, licença mensal..."
              className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-medium"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
             <Send className="text-orange-500 mt-1" size={16} />
             <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
               Ao confirmar, o sistema gerará o link oficial na Woovi e disparará uma mensagem para o WhatsApp do cliente com o link da fatura.
             </p>
          </div>

          <DialogFooter className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-apple-black hover:bg-zinc-800 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              EMITIR E ENVIAR NOTA
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueInvoiceModal;