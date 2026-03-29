"use client";

import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  FileArchive, 
  Download, 
  Loader2, 
  CalendarDays, 
  FileText, 
  CheckCircle2, 
  History,
  RefreshCcw,
  FileSpreadsheet,
  Layers,
  FileDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const FILE_TYPES = [
  { id: 'pdf_report', label: 'Relatório Executivo (PDF)', icon: FileDown, desc: 'Documento formatado com o fechamento do mês, pronto para impressão.' },
  { id: 'consolidated', label: 'Planilha Contábil (CSV)', icon: FileSpreadsheet, desc: 'Lista detalhada de receitas e despesas para importar no Excel.' },
  { id: 'sintegra', label: 'Sintegra (Arquivo Magnético)', icon: FileText, desc: 'Arquivo .TXT para validação em sistemas governamentais.' },
  { id: 'xml_batch', label: 'Lote de Notas (Resumo)', icon: FileArchive, desc: 'Compilado das informações das notas fiscais emitidas no período.' }
];

const FiscalFiles = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('pdf_report');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    today.setDate(1);
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
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

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('fiscal_exports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setHistory(data);
    setHistoryLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [user]);

  // Função para gerar PDF no cliente (mais rápido e bonito)
  const generateClientPDF = async () => {
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const [revRes, expRes] = await Promise.all([
      supabase.from('charges').select('*, customers(name)').eq('user_id', user?.id).gte('due_date', startDate).lte('due_date', endDate),
      supabase.from('expenses').select('*').eq('user_id', user?.id).gte('due_date', startDate).lte('due_date', endDate)
    ]);

    const doc = new jsPDF();
    const periodLabel = monthOptions.find(o => o.value === selectedMonth)?.label;
    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Header
    doc.setFillColor(29, 29, 31);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(22);
    doc.text("FECHAMENTO CONTÁBIL", 14, 20);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`${profile?.company?.toUpperCase() || 'EMPRESA'} | ${periodLabel?.toUpperCase()}`, 14, 30);

    const body = [
      ... (revRes.data || []).map(r => [new Date(r.due_date).toLocaleDateString('pt-BR'), 'RECEITA', r.customers?.name || 'Venda', currency.format(r.amount), r.status.toUpperCase()]),
      ... (expRes.data || []).map(e => [new Date(e.due_date).toLocaleDateString('pt-BR'), 'DESPESA', e.description, currency.format(e.amount), e.status.toUpperCase()])
    ];

    autoTable(doc, {
      head: [['DATA', 'TIPO', 'DESCRIÇÃO / ENTIDADE', 'VALOR', 'STATUS']],
      body: body,
      startY: 50,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] }
    });

    doc.save(`Fechamento_${selectedMonth}.pdf`);
    
    // Registrar no histórico mesmo sendo gerado no cliente
    await supabase.from('fiscal_exports').insert({
      user_id: user?.id,
      file_name: `RELATORIO_PDF_${selectedMonth}.pdf`,
      file_type: 'pdf_report',
      period: selectedMonth,
      status: 'completed',
      file_url: '#'
    });
    fetchHistory();
  };

  const handleGenerate = async () => {
    if (selectedType === 'pdf_report') {
      setLoading(true);
      await generateClientPDF();
      setLoading(false);
      showSuccess("PDF gerado com sucesso!");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/generate-fiscal-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ type: selectedType, period: selectedMonth })
      });

      if (!response.ok) throw new Error("Erro no servidor.");
      showSuccess(`Arquivo ${selectedType.toUpperCase()} solicitado!`);
      setTimeout(fetchHistory, 2000);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <Layers className="text-orange-500" size={32} /> Exportação Contábil
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gere os insumos para o fechamento mensal da sua empresa.</p>
          </div>
          <button onClick={fetchHistory} className="p-2 text-apple-muted hover:text-apple-black transition-all">
             <RefreshCcw size={20} className={historyLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <CalendarDays size={16} className="text-orange-500" /> Painel de Fechamento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-apple-dark ml-1">Mês de Competência</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-14 bg-apple-offWhite border-apple-border rounded-2xl font-bold text-orange-500 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-apple-white border-apple-border">
                      {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold text-apple-dark ml-1">Formato do Arquivo</label>
                   <div className="space-y-3">
                      {FILE_TYPES.map(type => (
                        <button 
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group",
                            selectedType === type.id ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/10" : "bg-apple-offWhite border-apple-border hover:border-apple-dark"
                          )}
                        >
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                             selectedType === type.id ? "bg-orange-500 text-white" : "bg-white text-apple-muted group-hover:text-apple-black shadow-sm"
                           )}>
                              <type.icon size={20} />
                           </div>
                           <div className="overflow-hidden">
                              <p className={cn("text-sm font-black", selectedType === type.id ? "text-orange-600" : "text-apple-black")}>{type.label}</p>
                              <p className="text-[10px] text-apple-muted font-medium leading-tight truncate">{type.desc}</p>
                           </div>
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-apple-border">
                 <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-apple-black text-white font-black py-5 rounded-3xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
                    {selectedType === 'pdf_report' ? 'GERAR PDF IMEDIATO' : 'SOLICITAR PROCESSAMENTO'}
                 </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
                <h3 className="text-xs font-bold text-apple-black uppercase tracking-widest mb-8 flex items-center gap-2">
                  <History size={16} className="text-orange-500" /> Histórico de Exportações
                </h3>
                
                <div className="flex-1 space-y-4">
                   {historyLoading ? (
                      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" /></div>
                   ) : history.length === 0 ? (
                      <div className="py-12 text-center opacity-30 italic text-sm">Nenhum arquivo gerado ainda.</div>
                   ) : history.map((item) => (
                     <div key={item.id} className="p-4 bg-apple-offWhite border border-apple-border rounded-2xl flex items-center justify-between group hover:border-orange-200 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className={cn(
                             "w-10 h-10 rounded-xl bg-white border border-apple-border flex items-center justify-center shadow-sm shrink-0",
                             item.status === 'completed' ? "text-emerald-500" : "text-orange-500"
                           )}>
                              {item.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} className="animate-pulse" />}
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-xs font-black text-apple-black truncate">{item.file_name}</p>
                              <p className="text-[9px] text-apple-muted font-bold uppercase">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                           </div>
                        </div>
                        {item.status === 'completed' && item.file_url !== '#' && (
                          <a href={item.file_url} target="_blank" download className="p-2 text-apple-muted hover:text-orange-500 transition-colors shrink-0">
                             <Download size={16} />
                          </a>
                        )}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FiscalFiles;