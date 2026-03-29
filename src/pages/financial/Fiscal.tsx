"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  FileText, 
  Plus, 
  Search, 
  Loader2, 
  ExternalLink, 
  CalendarDays, 
  CheckCircle2, 
  ShieldCheck,
  Filter,
  ArrowRight,
  User,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Fiscal = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() + 1);
    }
    return options.reverse();
  }, []);

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/list-woovi-invoices?start=${startDate}&end=${endDate}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Falha ao conectar com a Woovi");

      // A API retorna { invoices: [...] }
      setInvoices(data.invoices || []);
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchInvoices(); }, [user, selectedMonth]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
              <FileText className="text-orange-500" size={32} /> Notas Fiscais
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Histórico oficial de faturas e documentos fiscais integrados à Woovi.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-apple-white border border-apple-border rounded-xl px-4 py-2 shadow-sm">
              <CalendarDays size={16} className="text-apple-muted mr-3" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 text-sm font-bold text-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">
                  {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="focus:bg-apple-light">{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/10 flex items-center gap-2 active:scale-95"
            >
              <Plus size={18} /> EMITIR NOVA NOTA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-100"><ShieldCheck size={24} /></div>
            <div>
              <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest">Motor Fiscal</p>
              <p className="text-lg font-black text-apple-black uppercase">Ambiente Ativo</p>
            </div>
          </div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-100"><FileText size={24} /></div>
            <div>
              <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest">Docs no Período</p>
              <p className="text-3xl font-black text-apple-black">{invoices.length}</p>
            </div>
          </div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-100"><CheckCircle2 size={24} /></div>
            <div>
              <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest">Total Faturado</p>
              <p className="text-3xl font-black text-orange-500">{currency.format(invoices.reduce((acc, c) => acc + (c.value / 100), 0))}</p>
            </div>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
            <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} className="text-orange-500" /> Relatório de Faturas Emitidas
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-orange-500" size={40} />
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Sincronizando com a Woovi...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-24 text-apple-muted font-bold italic">
               <AlertCircle size={48} className="mx-auto opacity-10 mb-4" />
               <p>Nenhuma nota fiscal encontrada para o período selecionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-5">Identificação / Cliente</th>
                    <th className="px-8 py-5 text-center">Data Emissão</th>
                    <th className="px-8 py-5 text-right">Valor Líquido</th>
                    <th className="px-8 py-5 text-center">Status Fiscal</th>
                    <th className="px-8 py-5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-apple-offWhite border border-apple-border flex items-center justify-center text-apple-muted group-hover:bg-orange-500 group-hover:text-white transition-all font-black text-[10px]">
                              {inv.customer?.name?.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-apple-black">{inv.customer?.name}</p>
                              <p className="text-[9px] text-apple-muted font-bold font-mono">ID: {inv.identifier}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center text-sm font-medium text-apple-dark">
                        {new Date(inv.billingDate || inv.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-8 py-5 text-right text-sm font-black text-apple-black">
                        {currency.format(inv.value / 100)}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          inv.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          inv.status === 'PENDING' ? "bg-orange-50 text-orange-600 border-orange-100" :
                          "bg-red-50 text-red-600 border-red-100"
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <a 
                          href={inv.linkUrl || inv.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-2 bg-apple-white hover:bg-apple-offWhite border border-apple-border text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all shadow-sm text-apple-dark group-hover:border-orange-200"
                        >
                          Visualizar <ExternalLink size={12} className="text-orange-500" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <IssueInvoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchInvoices} />
    </AppLayout>
  );
};

export default Fiscal;