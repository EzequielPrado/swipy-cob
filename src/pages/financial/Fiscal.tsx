"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  FileText, 
  Plus, 
  Search, 
  Loader2, 
  CalendarDays, 
  CheckCircle2, 
  History,
  RefreshCcw,
  FileDown,
  Code,
  AlertCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Fiscal = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Alterado para 'all' por padrão para garantir que nenhuma nota fique oculta
  const [selectedMonth, setSelectedMonth] = useState('all');

  const monthOptions = useMemo(() => {
    const options = [];
    options.push({ value: 'all', label: 'Histórico Completo' });

    const d = new Date();
    d.setDate(1); 
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() - 1);
    }
    return options;
  }, []);

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/list-woovi-invoices`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao conectar com a Woovi");

      console.log("[Fiscal] Resposta bruta da Woovi:", data);

      // Varredura profunda para encontrar a lista de notas
      let invoiceList = [];
      if (data.invoices && Array.isArray(data.invoices)) invoiceList = data.invoices;
      else if (data.data && Array.isArray(data.data)) invoiceList = data.data;
      else if (Array.isArray(data)) invoiceList = data;
      else {
        // Se a Woovi mandar os dados dentro de outro objeto misterioso, procuramos qualquer array dentro dele
        const possibleArray = Object.values(data).find(val => Array.isArray(val));
        if (possibleArray) invoiceList = possibleArray as any[];
      }

      setInvoices(invoiceList);
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchInvoices(); }, [user]);

  const handleDownloadFile = async (correlationID: string, format: 'pdf' | 'xml') => {
    if (!correlationID) return showError("ID da nota indisponível.");
    setDownloadingId(`${correlationID}-${format}`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/download-woovi-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ correlationID, format })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao baixar o arquivo da Woovi.");
      }

      // Trata a resposta como binário (Blob)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nota_${correlationID}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess(`Arquivo ${format.toUpperCase()} baixado com sucesso!`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(inv => {
        const dateStr = inv.billingDate || inv.createdAt || inv.updatedAt;
        if (!dateStr) return true;
        const invDate = new Date(dateStr);
        return invDate.getFullYear() === Number(year) && (invDate.getMonth() + 1) === Number(month);
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.correlationID?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [invoices, searchTerm, selectedMonth]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusIcon = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('COMPLETED') || s.includes('AUTHORIZED')) return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (s.includes('PENDING') || s.includes('PROCESSING')) return <Clock size={14} className="text-orange-500" />;
    if (s.includes('CANCELED') || s.includes('ERROR')) return <XCircle size={14} className="text-red-500" />;
    return <AlertCircle size={14} className="text-apple-muted" />;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
              <FileText className="text-orange-500" size={32} /> Central Fiscal
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Monitoramento de faturas emitidas e download de PDF / XML.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-apple-white border border-apple-border rounded-xl px-4 py-2 shadow-sm">
              <History size={16} className="text-apple-muted mr-3" />
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
              onClick={fetchInvoices}
              className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black shadow-sm transition-all"
              title="Recarregar Notas"
            >
              <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/10 flex items-center gap-2 active:scale-95"
            >
              <Plus size={18} /> EMITIR NOTA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <p className="text-[10px] text-apple-muted font-black uppercase tracking-widest mb-2">Total de Registros</p>
            <p className="text-3xl font-black text-apple-black">{filteredInvoices.length}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><FileText size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm border-l-emerald-500 border-l-4">
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle2 size={12}/> Emitidas com Sucesso</p>
            <p className="text-3xl font-black text-apple-black">{filteredInvoices.filter(i => (i.status||'').toUpperCase().includes('COMPLETED')).length}</p>
          </div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm border-l-orange-500 border-l-4">
            <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Clock size={12}/> Pendentes / Processando</p>
            <p className="text-3xl font-black text-apple-black">{filteredInvoices.filter(i => (i.status||'').toUpperCase().includes('PENDING')).length}</p>
          </div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm border-l-red-500 border-l-4">
            <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><XCircle size={12}/> Canceladas / Erros</p>
            <p className="text-3xl font-black text-apple-black">{filteredInvoices.filter(i => (i.status||'').toUpperCase().includes('CANCELED') || (i.status||'').toUpperCase().includes('ERROR')).length}</p>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente ou ID da nota..." 
                className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-orange-500">
              <Loader2 className="animate-spin" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando notas fiscais...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-24 text-apple-muted font-bold italic">
               <AlertCircle size={48} className="mx-auto opacity-10 mb-4" />
               <p>Nenhuma nota fiscal encontrada neste período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-5">Entidade / Identificador</th>
                    <th className="px-8 py-5 text-center">Data / Competência</th>
                    <th className="px-8 py-5 text-right">Valor Bruto</th>
                    <th className="px-8 py-5 text-center">Status Fiscal</th>
                    <th className="px-8 py-5 text-right">Download (Arquivos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {filteredInvoices.map((inv) => {
                    // Tenta encontrar o ID único retornado pela Woovi
                    const targetId = inv.correlationID || inv.identifier || inv.id;

                    return (
                      <tr key={targetId} className="hover:bg-apple-light transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-apple-offWhite border border-apple-border flex items-center justify-center text-apple-muted group-hover:bg-orange-500 group-hover:text-white transition-all font-black text-xs shrink-0">
                                {inv.customer?.name?.charAt(0).toUpperCase() || 'C'}
                             </div>
                             <div className="overflow-hidden">
                                <p className="text-sm font-bold text-apple-black truncate">{inv.customer?.name || 'Cliente Indefinido'}</p>
                                <p className="text-[10px] text-apple-muted font-bold font-mono truncate max-w-[150px]">Ref: {targetId}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center text-sm font-medium text-apple-dark">
                          {new Date(inv.billingDate || inv.createdAt || new Date()).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-8 py-5 text-right text-sm font-black text-apple-black">
                          {currency.format((inv.value || 0) / 100)}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            (inv.status||'').toUpperCase().includes('COMPLETED') ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            (inv.status||'').toUpperCase().includes('PENDING') ? "bg-orange-50 text-orange-600 border-orange-100" :
                            (inv.status||'').toUpperCase().includes('CANCELED') ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-apple-offWhite text-apple-muted border-apple-border"
                          )}>
                            {getStatusIcon(inv.status)}
                            {(inv.status||'').toUpperCase().includes('COMPLETED') ? 'Emitida' : inv.status || 'PROCESSANDO'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => handleDownloadFile(targetId, 'pdf')}
                               disabled={downloadingId === `${targetId}-pdf`}
                               className="inline-flex items-center gap-1.5 bg-apple-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-apple-border text-apple-muted text-[9px] font-black uppercase px-3 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
                             >
                               {downloadingId === `${targetId}-pdf` ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                               PDF
                             </button>
                             <button 
                               onClick={() => handleDownloadFile(targetId, 'xml')}
                               disabled={downloadingId === `${targetId}-xml`}
                               className="inline-flex items-center gap-1.5 bg-apple-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-apple-border text-apple-muted text-[9px] font-black uppercase px-3 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
                             >
                               {downloadingId === `${targetId}-xml` ? <Loader2 size={12} className="animate-spin" /> : <Code size={12} />}
                               XML
                             </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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