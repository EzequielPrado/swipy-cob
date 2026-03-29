"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  FileSpreadsheet, 
  Loader2, 
  CalendarDays, 
  FileDown, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const DRE = () => {
  const { effectiveUserId, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'monthly' | 'annual'>('monthly');
  
  // Controle de Data
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  const [categories, setCategories] = useState<any[]>([]);
  const [data, setData] = useState({
    revenues: [] as any[],
    expenses: [] as any[],
    cpv: 0
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

  const yearOptions = [
    { value: '2025', label: 'Exercício 2025' },
    { value: '2024', label: 'Exercício 2024' }
  ];

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
      // 1. Buscar Plano de Contas
      const { data: chart } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('code', { ascending: true });
      
      setCategories(chart || []);

      // 2. Buscar Receitas (Charges Pagas)
      const { data: revRes } = await supabase
        .from('charges')
        .select('amount, category_id, status')
        .eq('user_id', effectiveUserId)
        .eq('status', 'pago')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // 3. Buscar Despesas (Expenses Pagas)
      const { data: expRes } = await supabase
        .from('expenses')
        .select('amount, category_id, status')
        .eq('user_id', effectiveUserId)
        .eq('status', 'pago')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // 4. Calcular CPV via Itens de Pedidos (Custo de Venda)
      const { data: quoteItems } = await supabase
        .from('quote_items')
        .select('quantity, products!inner (cost_price)')
        .eq('products.user_id', effectiveUserId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      const totalCPV = quoteItems?.reduce((acc, curr) => acc + (curr.quantity * Number((curr.products as any)?.cost_price || 0)), 0) || 0;

      setData({
        revenues: revRes || [],
        expenses: expRes || [],
        cpv: totalCPV
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [effectiveUserId, viewType, selectedMonth, selectedYear]);

  // Cálculos Gerenciais
  const totals = useMemo(() => {
    const revenueByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};

    data.revenues.forEach(r => {
      const catId = r.category_id || 'none';
      revenueByCat[catId] = (revenueByCat[catId] || 0) + Number(r.amount);
    });

    data.expenses.forEach(e => {
      const catId = e.category_id || 'none';
      expenseByCat[catId] = (expenseByCat[catId] || 0) + Number(e.amount);
    });

    const totalGrossRevenue = data.revenues.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalExpenses = data.expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    // Deduções (ex: Impostos) - Inferimos por nome ou código 1.9, 2.9 etc no futuro
    // Por enquanto pegamos categorias que contenham "Imposto" no nome
    const taxDeductions = data.expenses
      .filter(e => {
        const cat = categories.find(c => c.id === e.category_id);
        return cat?.name.toLowerCase().includes('imposto') || cat?.name.toLowerCase().includes('taxa');
      })
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const netRevenue = totalGrossRevenue - taxDeductions;
    const grossProfit = netRevenue - data.cpv;
    const netProfit = grossProfit - (totalExpenses - taxDeductions); // Removemos impostos pois já foram deduzidos acima

    return {
      revenueByCat,
      expenseByCat,
      totalGrossRevenue,
      taxDeductions,
      netRevenue,
      cpv: data.cpv,
      grossProfit,
      totalExpenses,
      netProfit
    };
  }, [data, categories]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const companyName = profile?.company || profile?.full_name || 'Nossa Empresa';
    const period = viewType === 'monthly' 
      ? monthOptions.find(o => o.value === selectedMonth)?.label 
      : `ANO ${selectedYear}`;

    doc.setFillColor(29, 29, 31);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(22);
    doc.text("DRE CONTÁBIL", 14, 22);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`EMPRESA: ${companyName.toUpperCase()}`, 14, 32);
    doc.text(`PERÍODO: ${period?.toUpperCase()}`, 14, 38);

    const dreRows = [
      [{ content: "1. RECEITA OPERACIONAL BRUTA", styles: { fontStyle: 'bold' } }, currency.format(totals.totalGrossRevenue)],
    ];

    // Detalhar Receitas por Categoria
    categories.filter(c => c.type === 'revenue').forEach(cat => {
      const val = totals.revenueByCat[cat.id] || 0;
      if (val > 0) dreRows.push([`   (+) ${cat.name}`, currency.format(val)]);
    });

    dreRows.push([{ content: "2. (-) DEDUÇÕES E IMPOSTOS", styles: { fontStyle: 'bold' } }, currency.format(-totals.taxDeductions)]);
    dreRows.push([{ content: "3. = RECEITA OPERACIONAL LÍQUIDA", styles: { fontStyle: 'bold', fillColor: [245, 245, 247] } }, currency.format(totals.netRevenue)]);
    dreRows.push([{ content: "4. (-) CUSTO DE VENDAS (CPV)", styles: { fontStyle: 'bold' } }, currency.format(-totals.cpv)]);
    dreRows.push([{ content: "5. = RESULTADO OPERACIONAL BRUTO", styles: { fontStyle: 'bold', fillColor: [245, 245, 247] } }, currency.format(totals.grossProfit)]);
    
    dreRows.push([{ content: "6. (-) DESPESAS OPERACIONAIS", styles: { fontStyle: 'bold' } }, ""]);
    
    // Detalhar Despesas por Categoria (exceto impostos que já foram no item 2)
    categories.filter(c => c.type === 'expense' && !c.name.toLowerCase().includes('imposto')).forEach(cat => {
      const val = totals.expenseByCat[cat.id] || 0;
      if (val > 0) dreRows.push([`   (-) ${cat.name}`, currency.format(-val)]);
    });

    dreRows.push([{ content: "7. = LUCRO / PREJUÍZO LÍQUIDO", styles: { fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [249, 115, 22] } }, { content: currency.format(totals.netProfit), styles: { fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [249, 115, 22] } }]);

    autoTable(doc, {
      body: dreRows,
      startY: 60,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 1: { halign: 'right' } }
    });

    doc.save(`DRE_${viewType}_${period?.replace(' ', '_')}.pdf`);
  };

  const DRERow = ({ label, value, isTotal = false, negative = false, indent = false }: any) => (
    <div className={cn(
      "flex items-center justify-between py-4 px-8 border-b border-apple-border transition-all",
      isTotal ? "bg-apple-offWhite" : "hover:bg-apple-light/50",
      indent && "pl-14"
    )}>
      <span className={cn(
        "text-[10px] uppercase font-black tracking-widest",
        isTotal ? "text-apple-black" : "text-apple-muted"
      )}>{label}</span>
      <span className={cn(
        "text-sm font-black font-mono",
        isTotal ? "text-apple-black" : negative ? "text-red-500" : "text-apple-dark"
      )}>
        {negative && value > 0 ? "- " : ""}{currency.format(value)}
      </span>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <FileSpreadsheet className="text-orange-500" size={32} /> DRE Gerencial
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Demonstrativo de Resultados baseado no seu Plano de Contas.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-apple-white border border-apple-border p-1 rounded-xl shadow-sm">
               <button 
                onClick={() => setViewType('monthly')}
                className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", viewType === 'monthly' ? "bg-orange-500 text-white shadow-md" : "text-apple-muted hover:text-apple-black")}
               >Mensal</button>
               <button 
                onClick={() => setViewType('annual')}
                className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", viewType === 'annual' ? "bg-orange-500 text-white shadow-md" : "text-apple-muted hover:text-apple-black")}
               >Anual</button>
            </div>

            {viewType === 'monthly' ? (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] h-11 rounded-xl bg-apple-white border border-apple-border font-bold text-orange-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">{monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px] h-11 rounded-xl bg-apple-white border border-apple-border font-bold text-orange-500"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-apple-white border-apple-border">{yearOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            )}

            <button onClick={handleExportPDF} className="bg-apple-black text-white px-6 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><FileDown size={16} /> PDF EXECUTIVO</button>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4 text-orange-500">
               <Loader2 className="animate-spin" size={40} />
               <p className="text-[10px] font-black uppercase tracking-widest">Processando Demonstrativo...</p>
            </div>
          ) : (
            <>
              {/* SEÇÃO 1: RECEITA BRUTA */}
              <DRERow label="1. Receita Operacional Bruta" value={totals.totalGrossRevenue} isTotal />
              {categories.filter(c => c.type === 'revenue').map(cat => {
                const val = totals.revenueByCat[cat.id] || 0;
                if (val === 0) return null;
                return <DRERow key={cat.id} label={cat.name} value={val} indent />;
              })}

              {/* SEÇÃO 2: DEDUÇÕES */}
              <DRERow label="2. (-) Deduções e Impostos S/ Vendas" value={totals.taxDeductions} negative />

              {/* SEÇÃO 3: RECEITA LÍQUIDA */}
              <DRERow label="3. = Receita Operacional Líquida" value={totals.netRevenue} isTotal />

              {/* SEÇÃO 4: CPV */}
              <DRERow label="4. (-) Custo das Mercadorias / Serv. (CPV)" value={totals.cpv} negative />

              {/* SEÇÃO 5: MARGEM BRUTA */}
              <DRERow label="5. = Resultado Operacional Bruto" value={totals.grossProfit} isTotal />

              {/* SEÇÃO 6: DESPESAS OPERACIONAIS */}
              <DRERow label="6. (-) Despesas Operacionais (Fixas/Variáveis)" value={totals.totalExpenses - totals.taxDeductions} negative />
              {categories.filter(c => c.type === 'expense' && !c.name.toLowerCase().includes('imposto')).map(cat => {
                const val = totals.expenseByCat[cat.id] || 0;
                if (val === 0) return null;
                return <DRERow key={cat.id} label={cat.name} value={val} indent negative />;
              })}

              {/* RESULTADO FINAL */}
              <div className="bg-apple-black p-10 flex flex-col md:flex-row items-center justify-between text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} className="text-orange-500" /></div>
                <div className="relative z-10 text-center md:text-left">
                   <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.25em] mb-2 flex items-center justify-center md:justify-start gap-2">
                     <CheckCircle2 size={16} /> Lucro Líquido do Exercício (LLE)
                   </h4>
                   <p className="text-zinc-400 text-xs font-medium">Resultado final após todas as deduções de custo, impostos e despesas fixas.</p>
                </div>
                <div className="relative z-10 mt-6 md:mt-0 text-center md:text-right">
                   <p className={cn("text-5xl font-black tracking-tighter", totals.netProfit >= 0 ? "text-white" : "text-red-500")}>
                     {currency.format(totals.netProfit)}
                   </p>
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Margem Líquida: {totals.totalGrossRevenue > 0 ? ((totals.netProfit / totals.totalGrossRevenue) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* INFO ADICIONAL */}
        <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] flex items-start gap-4">
           <Layers className="text-orange-500 shrink-0" size={24} />
           <div>
              <p className="text-sm font-black text-orange-600 uppercase tracking-widest mb-1">Nota de Auditoria</p>
              <p className="text-xs text-orange-800 leading-relaxed font-medium">
                Este DRE utiliza o **Regime de Competência**. Valores de "Custo de Vendas (CPV)" são extraídos automaticamente da margem de custo cadastrada nos produtos vendidos no período, mesmo que a nota do fornecedor ainda não tenha sido paga.
              </p>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DRE;