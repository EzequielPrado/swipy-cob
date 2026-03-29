"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Layers, ArrowUpCircle, ArrowDownCircle, Hash, Target } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AddAccountCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REVENUE_GROUPS = [
  { id: 'vendas', label: 'Receita de Vendas' },
  { id: 'servicos', label: 'Receita de Serviços' },
  { id: 'financeiras', label: 'Receitas Financeiras (Juros/Rendimentos)' },
  { id: 'outras', label: 'Outras Receitas' }
];

const EXPENSE_GROUPS = [
  { id: 'adm', label: 'Despesas Administrativas' },
  { id: 'pessoal', label: 'Despesas com Pessoal / RH' },
  { id: 'financeiras', label: 'Despesas Financeiras (Taxas/Juros)' },
  { id: 'tributarias', label: 'Despesas Tributárias (Impostos)' },
  { id: 'comerciais', label: 'Despesas Comerciais / Marketing' },
  { id: 'operacionais', label: 'Custos Operacionais / Produção' }
];

const AddAccountCategoryModal = ({ isOpen, onClose, onSuccess }: AddAccountCategoryModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingCode, setFetchingCode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'revenue' | 'expense',
    macro_group: 'adm',
    code: ''
  });

  // Gerar código automático quando mudar o tipo
  useEffect(() => {
    const generateCode = async () => {
      if (!isOpen || !user) return;
      setFetchingCode(true);
      
      const prefix = formData.type === 'revenue' ? '1.' : '2.';
      
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('code')
        .eq('user_id', user.id)
        .eq('type', formData.type)
        .order('code', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0 && data[0].code) {
        const lastParts = data[0].code.split('.');
        const lastNum = parseInt(lastParts[lastParts.length - 1]);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }

      const finalCode = `${prefix}${nextNumber.toString().padStart(2, '0')}`;
      setFormData(prev => ({ 
        ...prev, 
        code: finalCode,
        macro_group: formData.type === 'revenue' ? 'vendas' : 'adm'
      }));
      setFetchingCode(false);
    };

    generateCode();
  }, [formData.type, isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('chart_of_accounts').insert({
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        code: formData.code,
        // Usamos uma coluna extra metadata ou adaptamos para macro_group se você criou no SQL
        // Nota: Vou enviar como name prefixado ou podemos adicionar a coluna macro_group no SQL se preferir
        is_active: true
      });

      if (error) throw error;

      showSuccess('Categoria configurada com sucesso!');
      onSuccess();
      onClose();
      setFormData(prev => ({ ...prev, name: '' }));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentGroups = formData.type === 'revenue' ? REVENUE_GROUPS : EXPENSE_GROUPS;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Layers size={20} />
            </div>
            Nova Categoria
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase text-apple-muted tracking-widest ml-1">Natureza Financeira</Label>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'revenue'})}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-2xl border font-bold transition-all",
                    formData.type === 'revenue' ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-inner" : "bg-apple-offWhite border-apple-border text-apple-muted opacity-60"
                  )}
                >
                   <ArrowUpCircle size={20} /> <span className="text-[10px] uppercase">Receita</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'expense'})}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-2xl border font-bold transition-all",
                    formData.type === 'expense' ? "bg-red-50 border-red-500 text-red-600 shadow-inner" : "bg-apple-offWhite border-apple-border text-apple-muted opacity-60"
                  )}
                >
                   <ArrowDownCircle size={20} /> <span className="text-[10px] uppercase">Despesa</span>
                </button>
             </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark">Nome da Categoria</Label>
            <Input required className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Aluguel, Venda de Teclado..." />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark flex items-center gap-2"><Target size={14} className="text-blue-500" /> Grupo Gerencial (DRE)</Label>
            <Select value={formData.macro_group} onValueChange={v => setFormData({...formData, macro_group: v})}>
              <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">
                {currentGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-apple-dark flex items-center gap-2"><Hash size={14} className="text-orange-500" /> Código Sugerido</Label>
            <div className="relative">
              <Input className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono font-bold text-orange-600" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
              {fetchingCode && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-apple-muted" size={16} />}
            </div>
            <p className="text-[9px] text-apple-muted italic">Gerado automaticamente seguindo a hierarquia contábil.</p>
          </div>

          <DialogFooter className="pt-4 border-t border-apple-border">
            <button 
              type="submit" 
              disabled={loading || fetchingCode}
              className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "VINCULAR E SALVAR"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountCategoryModal;