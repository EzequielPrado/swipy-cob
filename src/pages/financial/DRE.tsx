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
  TrendingDown,
  Info,
  ChevronDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { showSuccess } from '@/utils/toast';

const DRE = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 11); 
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() + 1);
    }
    return options.reverse();
  }, []);

  const [dreData, setDreData] = useState({
    receitaBruta: 0,
    deducoes: 0,
    cpv: 0,
    despesasVendas: 0,
    despesasAdms: 0,
    proLabore: 0,
    impostosIR: 0,
    outrasDespesas: 0
  });

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

    try {
      // 1. Receitas (Competência: Vencimento ou Data do Pedido)
      const { data: charges } = await supabase
        .from('charges')
        .select('amount, status, method')
        .eq('user_id', user.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      const totalReceita = charges?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 2. Custos de Produtos Vendidos (CPV)
      // Buscamos itens de orçamentos aprovados no mês
      const { data: quoteItems } = await supabase
        .from('quote_items')
        .select(`
          quantity,
          products!inner (
            cost_price,
            user_id
          ),
          quotes!inner (
            status,
            created_at,
            user_id
          )
        `)
        .eq('quotes.user_id', user.id)
        .neq('quotes.status', 'draft')
        .gte('quotes.created_at', startDate)
        .lte('quotes.created_at', endDate);

      const totalCPV = quoteItems?.reduce((acc, curr) => {
        const cost = Number(curr.products?.cost_price || 0);
        return acc + (curr.quantity * cost);
      }, 0) || 0;

      // 3. Despesas (Contas a Pagar)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      let deducoes = 0;
      let despesasVendas = 0;
      let despesasAdms = 0;
      let proLabore = 0;
      let impostosIR = 0;
      let outras = 0;

      expenses?.forEach(exp => {
        const val = Number(exp.amount);
        const cat = exp.category?.toLowerCase() || '';

        if (cat.includes('impostos')) deducoes += val;
        else if (cat.includes('marketing') || cat.includes('vendas')) despesasVendas += val;
        else if (cat.includes('pro labore')) proLabore += val;
        else if (cat.includes('folha') || cat.includes('infraestrutura') || cat.includes('administrativa')) despesasAdms += val;
        else outras += val;
      });

      setDreData({
        receitaBruta: totalReceita,
        deducoes: deducoes,
        cpv: totalCPV,
        despesasVendas,
        despesasAdms,
        proLabore,
        impostosIR: 0, // Pode ser calculado como % do faturamento se quiser
        outrasDespesas: outras
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedMonth]);

  // Totais Calculados
  const receitaLiquida = dreData.receitaBruta - dreData.deducoes;
  const resultadoBruto = receitaLiquida - dreData.cpv;
  const resultadoAntesIR = resultadoBruto - dreData.despesasVendas - dreData.despesasAdms - dreData.outrasDespesas;
  const lucroLiquidoSocio = resultadoAntesIR - dreData.impostosIR;
  const resultadoFinal = lucroLiquidoSocio - dreData.proLabore;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const companyName = profile?.company || profile?.full_name || 'Nossa Empresa';
    const monthLabel = monthOptions.find(o => o.value === selectedMonth)?.label;

    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("DRE - Demonstrativo de Resultado", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Empresa: ${companyName}`, 14, 28);
    doc.text(`Período: ${monthLabel}`, 14, 34);

    const rows = [
      ["RECEITA OPERACIONAL BRUTA", currency.format(dreData.receitaBruta)],
      ["(-) DEDUÇÕES DA RECEITA BRUTA", currency.format(-dreData.deducoes)],
      ["= RECEITA OPERACIONAL LÍQUIDA", currency.format(receitaLiquida)],
      ["(-) CUSTO DAS VENDAS (CPV/CMV)", currency.format(-dreData.cpv)],
      ["= RESULTADO OPERACIONAL BRUTO", currency.format(resultadoBruto)],
      ["(-) DESPESAS OPERACIONAIS", ""],
      ["   Despesas com Vendas/Marketing", currency.format(-dreData.despesasVendas)],
      ["   Despesas Administrativas/Fixas", currency.format(-dreData.despesasAdms)],
      ["   Outras Despesas/Receitas", currency.format(-dreData.outrasDespesas)],
      ["= RESULTADO ANTES DO IR E CSLL", currency.format(resultadoAntesIR)],
      ["(-) Provisão para IR e CSLL", currency.format(-dreData.impostosIR)],
      ["= LUCRO LÍQUIDO ANTES DAS PARTICIPAÇÕES", currency.format(lucroLiquidoSocio)],
      ["(-) PRO LABORE", currency.format(-dreData.proLabore)],
      ["(=) RESULTADO LÍQUIDO DO EXERCÍCIO", currency.format(resultadoFinal)]
    ];

    autoTable(doc, {
      body: rows,
      startY: 45,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.row.raw[0].startsWith('=') || data.row.raw[0].startsWith('RECEITA OPERACIONAL BRUTA')) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.fillColor = [245, 245, 245];
        }
        if (data.row.raw[0].includes('RESULTADO LÍQUIDO')) {
           data.cell.styles.fillColor = [249, 115, 22];
           data.cell.styles.textColor = [255, 255, 255];
        }
      }
    });

    doc.save(`DRE_${companyName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
    showSuccess("PDF gerado com sucesso!");
  };

  const DRERow = ({ label, value, isTotal = false, isSubItem = false, negative = false }: any) => (
    <div className={cn(
      "flex items-center justify-between py-4 px-6 border-b border-zinc-800/50 transition-colors",
      isTotal ? "bg-zinc-800/20" : "hover:bg-zinc-900/30",
      isSubItem && "pl-12 opacity-80"
    )}>
      <span className={cn(
        "text-xs uppercase tracking-widest font-bold",
        isTotal ? "text-zinc-100" : "text-zinc-500",
        isSubItem && "text-[10px]"
      )}>{label}</span>
      <span className={cn(
        "text-sm font-mono font-bold",
        isTotal ? "text-lg text-zinc-100" : "text-zinc-300",
        negative && value > 0 && "text-red-400"
      )}>
        {negative && value > 0 ? "- " : ""}{currency.format(value)}
      </span>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="text-orange-500" size={32} />
              DRE Contábil
            </h2>
            <p className="text-zinc-400 mt-1">Análise de competência: Receitas, Custos e Lucro Líquido.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden pr-2 h-12 shadow-xl">
              <div className="pl-3 text-zinc-500"><CalendarDays size={18} /></div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px] bg-transparent border-none focus:ring-0 text-sm font-black text-orange-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <button 
              onClick={handleExportPDF}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-black px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg h-12 text-xs uppercase tracking-widest"
            >
              <FileDown size={18} /> Gerar PDF
            </button>
          </div>
        </div>

        {/* CARDS DE PERFORMANCE RÁPIDA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp size={80} /></div>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Margem Bruta</p>
             <p className="text-3xl font-black text-zinc-100">
               {receitaLiquida > 0 ? ((resultadoBruto / receitaLiquida) * 100).toFixed(1) : 0}%
             </p>
           </div>
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingDown size={80} /></div>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Margem Líquida</p>
             <p className="text-3xl font-black text-zinc-100">
                {receitaLiquida > 0 ? ((resultadoFinal / receitaLiquida) * 100).toFixed(1) : 0}%
             </p>
           </div>
           <div className={cn(
             "p-6 rounded-[2rem] shadow-xl border relative overflow-hidden",
             resultadoFinal >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
           )}>
             <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", resultadoFinal >= 0 ? "text-emerald-500" : "text-red-500")}>Lucro do Mês</p>
             <p className={cn("text-3xl font-black", resultadoFinal >= 0 ? "text-emerald-400" : "text-red-400")}>{currency.format(resultadoFinal)}</p>
           </div>
        </div>

        {/* ESTRUTURA DO DRE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
             <div>
               <h3 className="text-lg font-bold text-zinc-100">Demonstrativo de Resultado do Exercício</h3>
               <p className="text-xs text-zinc-500 mt-1 uppercase tracking-tighter">Valores baseados em competência (datas de vencimento/geração)</p>
             </div>
             <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
               <Info size={14} className="text-blue-500" />
               <p className="text-[9px] text-blue-400 font-bold uppercase">Consolidado em Tempo Real</p>
             </div>
          </div>

          <div className="flex flex-col">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-orange-500" size={40} />
                <p className="text-xs text-zinc-500 font-bold uppercase">Calculando indicadores...</p>
              </div>
            ) : (
              <>
                <DRERow label="RECEITA OPERACIONAL BRUTA" value={dreData.receitaBruta} isTotal />
                <DRERow label="(-) DEDUÇÕES DA RECCEITA BRUTA (IMPOSTOS)" value={dreData.deducoes} negative />
                <DRERow label="= RECEITA OPERACIONAL LÍQUIDA" value={receitaLiquida} isTotal />
                <DRERow label="(-) CUSTOS DAS VENDAS (CPV/CMV)" value={dreData.cpv} negative />
                <DRERow label="= RESULTADO OPERACIONAL BRUTO" value={resultadoBruto} isTotal />
                
                <div className="bg-zinc-950/30 py-2 px-6 border-b border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">(-) DESPESAS OPERACIONAIS</span>
                </div>
                <DRERow label="Despesas com Vendas / Marketing" value={dreData.despesasVendas} isSubItem negative />
                <DRERow label="Despesas Administrativas" value={dreData.despesasAdms} isSubItem negative />
                <DRERow label="Outras Receitas e Despesas" value={dreData.outrasDespesas} isSubItem negative />
                
                <DRERow label="= RESULTADO OPERACIONAL ANTES DO IR E CSLL" value={resultadoAntesIR} isTotal />
                <DRERow label="(-) Provisão para IR e CSLL" value={dreData.impostosIR} negative />
                
                <DRERow label="= LUCRO LÍQUIDO ANTES DAS PARTICIPAÇÕES" value={lucroLiquidoSocio} isTotal />
                <DRERow label="(-) PRO LABORE" value={dreData.proLabore} negative />
                
                <div className="bg-orange-500 p-8 flex items-center justify-between shadow-2xl">
                  <div>
                    <h4 className="text-zinc-950 text-xs font-black uppercase tracking-[0.2em] mb-1">Resultado Líquido do Exercício</h4>
                    <p className="text-zinc-950/70 text-[10px] font-medium italic">Lucro real disponível após todas as obrigações e retiradas.</p>
                  </div>
                  <p className="text-4xl font-black text-zinc-950">{currency.format(resultadoFinal)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl opacity-40">
           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">
             Este relatório é gerencial. Para fins legais, consulte seu contador.
           </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default DRE;