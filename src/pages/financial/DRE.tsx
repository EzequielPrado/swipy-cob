"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { FileSpreadsheet, Loader2, CalendarDays, FileDown, Info, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

  const [dreData, setDreData] = useState({ receitaBruta: 0, deducoes: 0, cpv: 0, despesasVendas: 0, despesasAdms: 0, proLabore: 0, impostosIR: 0, outrasDespesas: 0 });

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

    try {
      const { data: charges } = await supabase.from('charges').select('amount').eq('user_id', user.id).gte('due_date', startDate).lte('due_date', endDate);
      const totalReceita = charges?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const { data: quoteItems } = await supabase.from('quote_items').select('quantity, products!inner (cost_price)').eq('products.user_id', user.id).gte('created_at', startDate).lte('created_at', endDate);
      const totalCPV = quoteItems?.reduce((acc, curr) => acc + (curr.quantity * Number((curr.products as any)?.cost_price || 0)), 0) || 0;

      const { data: expenses } = await supabase.from('expenses').select('amount, category').eq('user_id', user.id).gte('due_date', startDate).lte('due_date', endDate);

      let deducoes = 0, despesasVendas = 0, despesasAdms = 0, proLabore = 0, outras = 0;
      expenses?.forEach(exp => {
        const val = Number(exp.amount), cat = exp.category?.toLowerCase() || '';
        if (cat.includes('impostos') || cat.includes('taxas')) deducoes += val;
        else if (cat.includes('marketing') || cat.includes('vendas')) despesasVendas += val;
        else if (cat.includes('pro labore')) proLabore += val;
        else if (cat.includes('folha') || cat.includes('administrativa')) despesasAdms += val;
        else outras += val;
      });

      setDreData({ receitaBruta: totalReceita, deducoes, cpv: totalCPV, despesasVendas, despesasAdms, proLabore, impostosIR: 0, outrasDespesas: outras });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user, selectedMonth]);

  const receitaLiquida = dreData.receitaBruta - dreData.deducoes;
  const resultadoBruto = receitaLiquida - dreData.cpv;
  const resultadoFinal = resultadoBruto - dreData.despesasVendas - dreData.despesasAdms - dreData.outrasDespesas - dreData.proLabore;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const companyName = profile?.company || profile?.full_name || 'Nossa Empresa';
    const period = monthOptions.find(o => o.value === selectedMonth)?.label;

    // Cabeçalho Premium
    doc.setFillColor(29, 29, 31); // Apple Black
    doc.rect(0, 0, 210, 50, 'F');
    
    doc.setTextColor(249, 115, 22); // Swipy Orange
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("DRE GERENCIAL", 14, 22);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`EMPRESA: ${companyName.toUpperCase()}`, 14, 32);
    doc.text(`PERÍODO: ${period?.toUpperCase()}`, 14, 38);
    doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 14, 44);

    autoTable(doc, {
      body: [
        [{ content: "RECEITA OPERACIONAL BRUTA", styles: { fontStyle: 'bold' } }, currency.format(dreData.receitaBruta)],
        ["(-) Deduções de Vendas e Impostos", currency.format(-dreData.deducoes)],
        [{ content: "RECEITA OPERACIONAL LÍQUIDA", styles: { fontStyle: 'bold', fillColor: [245, 245, 247] } }, currency.format(receitaLiquida)],
        ["(-) Custo das Mercadorias / Serv. (CPV)", currency.format(-dreData.cpv)],
        [{ content: "RESULTADO OPERACIONAL BRUTO", styles: { fontStyle: 'bold', fillColor: [245, 245, 247] } }, currency.format(resultadoBruto)],
        ["(-) Despesas Comerciais / Marketing", currency.format(-dreData.despesasVendas)],
        ["(-) Despesas Administrativas / Pessoal", currency.format(-dreData.despesasAdms)],
        ["(-) Outras Despesas Variáveis", currency.format(-dreData.outrasDespesas)],
        ["(-) Retirada Pró-labore", currency.format(-dreData.proLabore)],
        [{ content: "LUCRO LÍQUIDO DO PERÍODO", styles: { fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [249, 115, 22] } }, { content: currency.format(resultadoFinal), styles: { fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [249, 115, 22] } }]
      ],
      startY: 60,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 5, textColor: [51, 51, 51] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    doc.save(`DRE_${companyName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
  };

  const DRERow = ({ label, value, isTotal = false, negative = false }: any) => (
    <div className={cn("flex items-center justify-between py-5 px-8 border-b border-apple-border", isTotal ? "bg-apple-offWhite" : "hover:bg-apple-light transition-colors")}>
      <span className={cn("text-[10px] uppercase font-black tracking-[0.15em]", isTotal ? "text-apple-black" : "text-apple-muted")}>{label}</span>
      <span className={cn("text-base font-black font-mono", isTotal ? "text-apple-black" : negative && value > 0 ? "text-red-500" : "text-apple-dark")}>
        {negative && value > 0 ? "- " : ""}{currency.format(value)}
      </span>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3"><FileSpreadsheet className="text-orange-500" size={32} /> DRE Contábil</h2>
            <p className="text-apple-muted mt-1 font-medium">Análise gerencial por regime de competência.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px] h-12 rounded-xl bg-apple-white border-apple-border font-bold text-orange-500"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border">{monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={handleExportPDF} className="bg-apple-black text-white px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><FileDown size={18} /> PDF EXECUTIVO</button>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div> : (
            <>
              <DRERow label="Receita Operacional Bruta" value={dreData.receitaBruta} isTotal />
              <DRERow label="(-) Deduções e Impostos" value={dreData.deducoes} negative />
              <DRERow label="Receita Operacional Líquida" value={receitaLiquida} isTotal />
              <DRERow label="(-) Custo Mercadorias / Serv. (CPV)" value={dreData.cpv} negative />
              <DRERow label="Resultado Operacional Bruto" value={resultadoBruto} isTotal />
              <DRERow label="(-) Despesas Comerciais" value={dreData.despesasVendas} negative />
              <DRERow label="(-) Despesas Administrativas" value={dreData.despesasAdms} negative />
              <DRERow label="(-) Outras Despesas Variáveis" value={dreData.outrasDespesas} negative />
              <DRERow label="(-) Retirada Pró-labore" value={dreData.proLabore} negative />
              <div className="bg-orange-500 p-10 flex items-center justify-between text-white shadow-2xl">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                     <TrendingUp size={14} /> Lucro Líquido do Exercício
                   </h4>
                   <p className="text-orange-100 text-xs font-medium">Após todas as deduções de custo e fixas.</p>
                </div>
                <p className="text-5xl font-black tracking-tighter">{currency.format(resultadoFinal)}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DRE;