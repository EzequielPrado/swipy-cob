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
    deducoes: 0, // Impostos e Taxas de Venda
    cpv: 0, // Custo de Mercadoria (Preço de Custo)
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
      // 1. RECEITA BRUTA
      const { data: charges } = await supabase
        .from('charges')
        .select('amount')
        .eq('user_id', user.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      const totalReceita = charges?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 2. CPV/CMV (Apenas custo de aquisição/produção dos itens vendidos)
      const { data: quoteItems } = await supabase
        .from('quote_items')
        .select(`
          quantity,
          products!inner (cost_price)
        `)
        .eq('products.user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const totalCPV = quoteItems?.reduce((acc, curr) => {
        // Corrigido: fazendo cast para 'any' para evitar erro TS2339 de tipagem automática do Supabase
        const cost = Number((curr.products as any)?.cost_price || 0);
        return acc + (curr.quantity * cost);
      }, 0) || 0;

      // 3. DESPESAS E DEDUÇÕES
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
      let outras = 0;

      expenses?.forEach(exp => {
        const val = Number(exp.amount);
        const cat = exp.category?.toLowerCase() || '';

        // Ajuste de Mapeamento:
        // Taxas de cartão, impostos diretos sobre venda e comissões são DEDUÇÕES
        if (cat.includes('impostos') || cat.includes('taxas') || cat.includes('gateway')) {
          deducoes += val;
        } 
        // Marketing e comissões de vendedores são DESPESAS DE VENDAS
        else if (cat.includes('marketing') || cat.includes('vendas')) {
          despesasVendas += val;
        } 
        // Retirada de sócios
        else if (cat.includes('pro labore')) {
          proLabore += val;
        } 
        // Administrativas e Folha
        else if (cat.includes('folha') || cat.includes('infraestrutura') || cat.includes('administrativa')) {
          despesasAdms += val;
        } 
        else {
          outras += val;
        }
      });

      setDreData({
        receitaBruta: totalReceita,
        deducoes,
        cpv: totalCPV,
        despesasVendas,
        despesasAdms,
        proLabore,
        impostosIR: 0,
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
    doc.text(`Empresa: ${companyName} | Período: ${monthLabel}`, 14, 28);

    const rows = [
      ["RECEITA OPERACIONAL BRUTA", currency.format(dreData.receitaBruta)],
      ["(-) DEDUÇÕES (Taxas, Impostos de Venda)", currency.format(-dreData.deducoes)],
      ["= RECEITA OPERACIONAL LÍQUIDA", currency.format(receitaLiquida)],
      ["(-) CUSTO DAS VENDAS (CPV/CMV)", currency.format(-dreData.cpv)],
      ["= RESULTADO OPERACIONAL BRUTO (Margem)", currency.format(resultadoBruto)],
      ["(-) DESPESAS OPERACIONAIS", ""],
      ["   Comerciais / Marketing", currency.format(-dreData.despesasVendas)],
      ["   Administrativas / Pessoal", currency.format(-dreData.despesasAdms)],
      ["   Outras Despesas", currency.format(-dreData.outrasDespesas)],
      ["= RESULTADO LÍQUIDO DO EXERCÍCIO", currency.format(resultadoFinal)],
      ["   (-) Pro Labore", currency.format(-dreData.proLabore)],
      ["(=) LUCRO LÍQUIDO DISPONÍVEL", currency.format(resultadoFinal)]
    ];

    autoTable(doc, {
      body: rows,
      startY: 40,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.row.raw[0].startsWith('=') || data.row.raw[0].startsWith('RECEITA OPERACIONAL BRUTA')) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.fillColor = [245, 245, 245];
        }
        if (data.row.raw[0].includes('LÍQUIDO DISPONÍVEL')) {
           data.cell.styles.fillColor = [249, 115, 22];
           data.cell.styles.textColor = [255, 255, 255];
        }
      }
    });

    doc.save(`DRE_${companyName}_${selectedMonth}.pdf`);
    showSuccess("PDF gerado!");
  };

  const DRERow = ({ label, value, isTotal = false, isSubItem = false, negative = false }: any) => (
    <div className={cn(
      "flex items-center justify-between py-4 px-6 border-b border-zinc-800/50",
      isTotal ? "bg-zinc-800/20" : "hover:bg-zinc-900/30",
      isSubItem && "pl-12 opacity-80"
    )}>
      <span className={cn("text-xs uppercase tracking-widest font-bold", isTotal ? "text-zinc-100" : "text-zinc-500")}>{label}</span>
      <span className={cn("text-sm font-mono font-bold", isTotal ? "text-lg text-zinc-100" : "text-zinc-300", negative && value > 0 && "text-red-400")}>
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
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 h-12 shadow-xl">
              <CalendarDays size={18} className="text-zinc-500 mr-2" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-transparent border-none text-orange-400 font-black"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <button onClick={handleExportPDF} className="bg-zinc-100 hover:bg-white text-zinc-950 font-black px-6 h-12 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2">
              <FileDown size={18} /> Exportar PDF
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
             <h3 className="text-lg font-bold text-zinc-100">Resultado do Período</h3>
             <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[9px] font-bold uppercase">
               <Info size={14} /> Competência Base
             </div>
          </div>

          <div className="flex flex-col">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
            ) : (
              <>
                <DRERow label="RECEITA OPERACIONAL BRUTA" value={dreData.receitaBruta} isTotal />
                <DRERow label="(-) DEDUÇÕES (Taxas Financeiras e Impostos)" value={dreData.deducoes} negative />
                <DRERow label="= RECEITA OPERACIONAL LÍQUIDA" value={receitaLiquida} isTotal />
                <DRERow label="(-) CUSTOS DAS VENDAS (CPV/CMV)" value={dreData.cpv} negative />
                <DRERow label="= RESULTADO OPERACIONAL BRUTO" value={resultadoBruto} isTotal />
                
                <div className="bg-zinc-950/30 py-2 px-6 border-b border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">(-) DESPESAS OPERACIONAIS</span>
                </div>
                <DRERow label="Comerciais / Marketing / Vendas" value={dreData.despesasVendas} isSubItem negative />
                <DRERow label="Administrativas / Fixas / Pessoal" value={dreData.despesasAdms} isSubItem negative />
                <DRERow label="Outras Despesas Variáveis" value={dreData.outrasDespesas} isSubItem negative />
                
                <div className="bg-orange-500 p-8 flex items-center justify-between shadow-2xl">
                  <div>
                    <h4 className="text-zinc-950 text-xs font-black uppercase tracking-widest mb-1">Lucro Líquido do Exercício</h4>
                    <p className="text-zinc-950/70 text-[10px] font-medium">Após deduções, custos e despesas fixas.</p>
                  </div>
                  <p className="text-4xl font-black text-zinc-950">{currency.format(resultadoFinal)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DRE;