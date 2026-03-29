"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountId: string;
  accountName: string;
}

const ImportStatementModal = ({ isOpen, onClose, onSuccess, accountId, accountName }: ImportStatementModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const processCSV = async () => {
    if (!file || !user) return;
    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const transactions = [];

      // Pula o cabeçalho (ajustar conforme padrão de extrato)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(/[,;]/); // Suporta vírgula ou ponto-e-vírgula
        
        // Exemplo esperado: Data, Descrição, Valor
        // 2024-05-20, "Venda Cliente A", 150.00
        const date = columns[0];
        const description = columns[1]?.replace(/"/g, '');
        const amount = parseFloat(columns[2]?.replace(',', '.'));

        if (date && description && !isNaN(amount)) {
          transactions.push({
            user_id: user.id,
            bank_account_id: accountId,
            date,
            description,
            amount: Math.abs(amount),
            type: amount >= 0 ? 'credit' : 'debit',
            status: 'pending'
          });
        }
      }

      if (transactions.length === 0) throw new Error("Nenhuma transação válida encontrada no arquivo.");

      const { error } = await supabase.from('bank_transactions').insert(transactions);
      if (error) throw error;

      showSuccess(`${transactions.length} transações importadas!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
            <Upload className="text-orange-500" /> Importar Extrato
          </DialogTitle>
          <p className="text-xs text-apple-muted font-bold mt-2">Conta: {accountName}</p>
        </DialogHeader>
        
        <div className="p-8 space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-apple-border rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-orange-500 transition-all bg-apple-offWhite group"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <FileText className="text-apple-muted group-hover:text-orange-500" size={32} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-apple-black">{file ? file.name : "Clique para selecionar o CSV"}</p>
              <p className="text-[10px] text-apple-muted font-medium mt-1 uppercase tracking-widest">Padrão esperado: Data;Descrição;Valor</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
             <AlertCircle className="text-blue-500 shrink-0" size={18} />
             <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
               Dica: Você pode exportar o extrato do seu banco em CSV. O Swipy irá identificar duplicidades automaticamente para não poluir sua conta.
             </p>
          </div>

          <DialogFooter>
            <button 
              onClick={processCSV}
              disabled={!file || loading}
              className="w-full bg-apple-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              PROCESSAR ARQUIVO
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStatementModal;