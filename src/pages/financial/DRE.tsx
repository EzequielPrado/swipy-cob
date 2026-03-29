"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  FileSpreadsheet, 
  Loader2, 
  FileDown, 
  TrendingUp, 
  Layers,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const DRE = () => {
  const { effectiveUserId, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'monthly' | 'annual'>('monthly');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  const [categories, setCategories] = useState<any[]>([]);
  const [data, setData] = useState({ revenues: [] as any[], expenses: [] as any[], cpv: 0 });

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

  const yearOptions = [{ value: '2025', label: 'Exercício 2025' }, { value: '2024', label: 'Exercício 2024' }];

  const fetchData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);

    let startDate, endDate;
    if (viewType === 'monthly') {
      const [year, month] = selectedMonth.split('-');
      startDate = `${year}-${month}-01`;
      endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    } else {
      startDate = `${selectedYear}-01-01`;
      endDate = `${selectedYear}-12-31`;
    }

    try {
      const { data: chart } = await supabase.from('chart_of_accounts').select('*').eq('user_id', effectiveUserId).order('code', { ascending: true });
      setCategories(chart || []);

      const { data: revRes } = await supabase.from('charges').select('amount, category_id').eq('user_id', effectiveUserId).eq('status', 'pago').gte('due_date', startDate).lte('due_date', endDate);
      const { data: expRes } = await supabase.from('expenses').select('amount, category_id').eq('user_id', effectiveUserId).eq('status', 'pago').gte('due_date', startDate).lte('due_date', endDate);

      const { data: quoteItems } = await supabase.from('quote_items').select('quantity, products!inner (cost_price)').eq('products.user_id', effectiveUserId).gte('created_at', startDate).lte('created_at', endDate);
      const totalCPV = quoteItems?.reduce((acc, curr) => acc + (curr.quantity * Number((curr.products as any)?.cost_price || 0)), 0) || 0;

      setData({ revenues: revRes || [], expenses: expRes || [], cpv: totalCPV });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [effectiveUserId, viewType, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    const revenueByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};
    data.revenues.forEach(r => { revenueByCat[r.category_id || 'none'] = (revenueByCat[r.category_id || 'none'] || 0) + Number(r.amount); });
    data.expenses.forEach(e => { expenseByCat[e.category_id || 'none'] = (expenseByCat[e.category_id || 'none'] || 0) + Number(e.amount); });

    const totalGrossRevenue = data.revenues.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalExpenses = data.expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const taxDeductions = data.expenses.filter(e => {
        const cat = categories.find(c => c.id === e.category_id);
        return cat?.name.toLowerCase().includes('imposto') || cat?.name.toLowerCase().includes('taxa');
      }).reduce((acc, curr) => acc + Number(curr.amount), 0);

    const netRevenue = totalGrossRevenue - taxDeductions;
    const grossProfit = netRevenue - data.cpv;
    const netProfit = grossProfit - (totalExpenses - taxDeductions);

    return { revenueByCat, expenseByCat, totalGrossRevenue, taxDeductions, netRevenue, cpv: data.cpv, grossProfit, totalExpenses, netProfit };
  }, [data, categories]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const companyName = profile?.company || profile?.full_name || 'Nossa Empresa';
    const period = viewType === 'monthly' ? monthOptions.find(o => o.value === selectedMonth)?.label : `ANO ${selectedYear}`;

    // Cabeçalho Premium Dark
    doc.setFillColor(29, 29, 31);
    doc.roundedRect(10, 10, 190, 45, 5, 5, 'F');
    
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(8);
    doc.text("• DRE CONTÁBIL", 20, 22);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyName.toUpperCase(), 20, 32);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(period || '', 20, 40);

    // Badge de Resultado no PDF
    doc.setFillColor(255, 255, 255, 0.1);
    doc.roundedRect(145, 18, 45, 28, 14, 14, 'F');
    doc.setTextColor(totals.netProfit >= 0 ? 16 : 244, totals.netProfit >= 0 ? 185 : 63, totals.netProfit >= 0 ? 129 : 94);
    doc.setFontSize(14);
    doc.text(currency.format(totals.netProfit), 167, 32, { align: 'center' });
    doc.setFontSize(7);
    doc.text("RESULTADO LÍQUIDO", 167, 38, { align: 'center' });

    const rows = [
      ["1.", "RECEITA OPERACIONAL BRUTA", currency.format(totals.totalGrossRevenue)],
      ["2.", "(-) DEDUÇÕES E IMPOSTOS", currency.format(-totals.taxDeductions)],
      ["3.", "= RECEITA OPERACIONAL LÍQUIDA", currency.format(totals.netRevenue)],
      ["4.", "(-) CUSTO DE VENDAS (CPV)", currency.format(-totals.cpv)],
      ["5.", "= RESULTADO OPERACIONAL BRUTO", currency.format(totals.grossProfit)],
      ["6.", "(-) DESPESAS OPERACIONAIS", currency.format(-(totals.totalExpenses - totals.taxDeductions))],
      ["7.", "= LUCRO / PREJUÍZO LÍQUIDO", currency.format(totals.netProfit)]
    ];

    autoTable(doc, {
      body: rows,
      startY: 65,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 6, textColor: [40, 40, 40] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.row.index === 2 || data.row.index === 4 || data.row.index === 6) {
          data.cell.styles.fontStyle = 'bold';
          if (data.row.index === 6) {
            data.cell.styles.fillColor = [29, 29, 31];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    doc.save(`DRE_${companyName}_${period}.pdf`);
  };

  const DRERow = ({ number, label, value, isTotal = false, negative = false, indent = false }: any) => (
    <div className={cn(
      "flex items-center justify-between py-5 px-8 border-b border-white/5 transition-all",
      isTotal ? "bg-white/5" : "hover:bg-white/[0.02]",
      indent && "pl-16"
    )}>
      <div className="flex items-center gap-6">
        {number && <span className="text-[10px] font-mono text-zinc-500 w-4">{number}</span>}
        <span className={cn(
          "text-[11px] uppercase font-bold tracking-wider",
          isTotal ? "text-white" : "text-zinc-400"
        )}>{label}</span>
      </div>
      <span className={cn(
        "text-sm font-bold font-mono",
        isTotal ? "text-white" : negative ? "text-red-400" : "text-zinc-300"
      )}>
        {negative && value > 0 ? "- " : ""}{currency.format(value)}
      </span>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
        
        {/* CABEÇALHO DE CONTROLES */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm">
          <div className="flex bg-apple-offWhite border border-apple-border p-1.5 rounded-2xl shadow-inner">
             <button onClick={() => setViewType('monthly')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all", viewType === 'monthly' ? "bg-white text-orange-600 shadow-md" : "text-apple-muted hover:text-apple-black")}>Mensal</button>
             <button onClick={() => setViewType('annual')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all", viewType === 'annual' ? "bg-white text-orange-600 shadow-md" : "text-apple-muted hover:text-apple-black")}>Anual</button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {viewType === 'monthly' ? (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full md:w-[220px] h-12 rounded-2xl bg-apple-white border-apple-border font-bold text-orange-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">{monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full md:w-[220px] h-12 rounded-2xl bg-apple-white border-apple-border font-bold text-orange-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">{yearOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            )}

            <button onClick={handleExportPDF} className="flex-1 md:flex-none bg-apple-black hover:bg-zinc-800 text-white px-8 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"><FileDown size={18} /> GERAR PDF</button>
          </div>
        </div>

        {/* CONTAINER DRE DARK (CONFORME DESIGN) */}
        <div className="bg-[#1d1d1f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
           
           {/* HEADER DRE INTERNO */}
           <div className="p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 relative">
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">DRE Contábil</span>
                 </div>
                 <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">
                    {profile?.company || 'Sua Empresa'}
                 </h2>
                 <p className="text-orange-500 font-bold text-sm tracking-wide">
                    {viewType === 'monthly' ? monthOptions.find(o => o.value === selectedMonth)?.label : `Exercício Fiscal ${selectedYear}`}
                 </p>
              </div>

              {/* BADGE DE RESULTADO CIRCULAR */}
              <div className="mt-8 md:mt-0 flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-white/5 bg-white/5 relative group">
                 <div className={cn(
                   "absolute inset-0 rounded-full blur-2xl opacity-20 transition-all duration-1000 group-hover:opacity-40",
                   totals.netProfit >= 0 ? "bg-emerald-500" : "bg-red-500"
                 )} />
                 <div className="relative text-center">
                    <p className={cn("text-lg font-black tracking-tighter", totals.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                       {totals.netProfit < 0 ? "-" : ""}{currency.format(Math.abs(totals.netProfit))}
                    </p>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-1">Resultado</p>
                 </div>
              </div>
           </div>

           {loading ? (
             <div className="py-32 flex flex-col items-center gap-4 text-orange-500">
                <Loader2 className="animate-spin" size={48} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Consolidando Livros...</p>
             </div>
           ) : (
             <div className="divide-y divide-white/5">
                <DRERow number="1." label="Receita operacional bruta" value={totals.totalGrossRevenue} />
                {categories.filter(c => c.type === 'revenue').map(cat => {
                  const val = totals.revenueByCat[cat.id] || 0;
                  if (val === 0) return null;
                  return <DRERow key={cat.id} label={cat.name} value={val} indent />;
                })}

                <DRERow number="2." label="(-) Deduções e impostos" value={totals.taxDeductions} negative />
                <DRERow number="3." label="= Receita operacional líquida" value={totals.netRevenue} isTotal />
                <DRERow number="4." label="(-) Custo de vendas (CPV)" value={totals.cpv} negative />
                <DRERow number="5." label="= Resultado operacional bruto" value={totals.grossProfit} isTotal />
                
                <DRERow number="6." label="(-) Despesas operacionais" value={totals.totalExpenses - totals.taxDeductions} negative />
                {categories.filter(c => c.type === 'expense' && !c.name.toLowerCase().includes('imposto')).map(cat => {
                  const val = totals.expenseByCat[cat.id] || 0;
                  if (val === 0) return null;
                  return <div key={cat.id} className="flex justify-between py-3 px-16 border-b border-white/[0.02]">
                    <span className="text-[10px] font-bold text-zinc-500">{cat.name}</span>
                    <span className="text-xs font-mono text-red-400/80">-{currency.format(val)}</span>
                  </div>;
                })}

                {/* LINHA FINAL DE LUCRO REALÇADA */}
                <div className="bg-white p-10 md:p-14 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-zinc-400">7.</span>
                      <h3 className="text-2xl font-black text-black tracking-tighter uppercase">= Lucro / Prejuízo Líquido</h3>
                   </div>
                   <div className="text-right">
                      <p className={cn("text-3xl font-black tracking-tighter", totals.netProfit >= 0 ? "text-black" : "text-red-600")}>
                        {currency.format(totals.netProfit)}
                      </p>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Fechamento do Exercício</p>
                   </div>
                </div>
             </div>
           )}

           {/* RODAPÉ DO DRE */}
           <div className="p-8 bg-black/40 flex flex-col md:flex-row items-center justify-between border-t border-white/5 gap-4">
              <p className="text-[9px] font-medium text-zinc-500">Página 1 de 1 — {profile?.company || 'Swipy ERP'} — Gerado via Swipy Fintech LTDA</p>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                 <ShieldCheck size={14} className="text-orange-500" />
                 <span className="text-[9px] font-black text-white uppercase tracking-widest">Seguro</span>
              </div>
           </div>
        </div>

        {/* INFO ADICIONAL */}
        <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2.5rem] flex items-start gap-4">
           <Layers className="text-orange-500 shrink-0" size={24} />
           <div>
              <p className="text-sm font-black text-orange-600 uppercase tracking-widest mb-1">Padrão de Auditoria</p>
              <p className="text-xs text-orange-800 leading-relaxed font-medium">
                Este relatório segue o padrão de Demonstração de Resultados (DRE) exigido por bancos e órgãos fiscalizadores. As despesas são deduzidas pelo **Regime de Caixa** (data de pagamento efetivo).
              </p>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DRE;