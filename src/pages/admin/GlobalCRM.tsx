"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Search, TrendingUp, AlertCircle, CheckCircle2, 
  ArrowUpRight, ShieldCheck, Filter, Download, Info, Building2, User,
  Wallet, PieChart, ArrowDownRight, Zap
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';

const GlobalCRM = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStats, setGlobalStats] = useState({ 
    totalVolume: 0, 
    avgDelinquency: 0, 
    totalCustomers: 0,
    totalOverdue: 0
  });
  const [customerData, setCustomerData] = useState<any[]>([]);

  const fetchCRMData = async () => {
    setLoading(true);
    try {
      // 1. Puxar todos os clientes e todas as cobranças (Visão Master ignora RLS via Service Role se configurado, ou puxa o que o admin vê)
      const [customersRes, chargesRes] = await Promise.all([
        supabase.from('customers').select('*, profiles:user_id(company)'),
        supabase.from('charges').select('customer_id, amount, status, due_date')
      ]);

      if (!customersRes.data || !chargesRes.data) return;

      const allCharges = chargesRes.data;
      const today = new Date().toISOString().split('T')[0];
      
      // 2. Agrupar dados por CPF/CNPJ (Consolidação de Identidade)
      const groupedByTaxId: Record<string, any> = {};

      customersRes.data.forEach(cust => {
        const taxId = cust.tax_id?.replace(/\D/g, '') || 'S-DOC';
        if (!groupedByTaxId[taxId]) {
          groupedByTaxId[taxId] = {
            name: cust.name,
            taxId: cust.tax_id,
            email: cust.email,
            phone: cust.phone,
            merchants: new Set(),
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            countPaid: 0,
            countTotal: 0
          };
        }
        
        groupedByTaxId[taxId].merchants.add(cust.profiles?.company || 'Lojista Indefinido');
        
        // Calcular faturas deste cliente específico (identificado pelo ID interno nesta loja)
        const custCharges = allCharges.filter(c => c.customer_id === cust.id);
        custCharges.forEach(ch => {
          groupedByTaxId[taxId].countTotal++;
          const val = Number(ch.amount || 0);

          if (ch.status === 'pago') {
            groupedByTaxId[taxId].totalPaid += val;
            groupedByTaxId[taxId].countPaid++;
          } else if (ch.status === 'atrasado' || (ch.status === 'pendente' && ch.due_date < today)) {
            groupedByTaxId[taxId].totalOverdue += val;
          } else {
            groupedByTaxId[taxId].totalPending += val;
          }
        });
      });

      // 3. Formatar para Array e calcular métricas de risco
      const finalArray = Object.values(groupedByTaxId).map(c => {
        const delinquencyRate = c.countTotal > 0 
          ? ((c.countTotal - c.countPaid) / c.countTotal) * 100 
          : 0;

        // Score Swipy: 100 base, perde pontos por inadimplência e ganha por volume
        let score = 100 - (delinquencyRate * 0.8);
        if (c.totalPaid > 5000) score += 5;
        if (c.totalPaid > 20000) score += 5;
        
        return {
          ...c,
          merchants: Array.from(c.merchants),
          delinquencyRate,
          score: Math.min(100, Math.max(0, score))
        };
      }).sort((a, b) => b.totalPaid - a.totalPaid);

      setCustomerData(finalArray);

      // 4. Stats Gerais do CRM Global
      const totalPaidGlobal = finalArray.reduce((acc, curr) => acc + curr.totalPaid, 0);
      const totalOverdueGlobal = finalArray.reduce((acc, curr) => acc + curr.totalOverdue, 0);
      const avgDel = finalArray.length > 0 
        ? (finalArray.reduce((acc, curr) => acc + curr.delinquencyRate, 0) / finalArray.length)
        : 0;

      setGlobalStats({
        totalVolume: totalPaidGlobal,
        avgDelinquency: avgDel,
        totalCustomers: finalArray.length,
        totalOverdue: totalOverdueGlobal
      });

    } catch (err) {
      console.error("[GlobalCRM] Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRMData();
  }, []);

  const filteredData = customerData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.taxId.includes(searchTerm)
  );

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black">
              <ShieldCheck className="text-orange-500" size={32} /> CRM Global Master
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Análise de risco, inadimplência e LTV consolidado de toda a rede.</p>
          </div>
          <div className="flex gap-3">
             <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
               <Input 
                 placeholder="Buscar CPF/CNPJ ou Nome..." 
                 className="pl-12 bg-apple-white border-apple-border rounded-2xl h-12 w-[320px] shadow-sm font-medium focus:ring-orange-500/20"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <button onClick={fetchCRMData} className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm">
               <TrendingUp size={20} />
             </button>
          </div>
        </div>

        {/* KPIs GLOBAIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
             <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Volume Pago Global</p>
             <p className="text-3xl font-black text-emerald-600">{currency.format(globalStats.totalVolume)}</p>
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Wallet size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
             <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Inadimplência Global</p>
             <p className="text-3xl font-black text-red-500">{globalStats.avgDelinquency.toFixed(1)}%</p>
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
             <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Dívida Ativa na Rede</p>
             <p className="text-3xl font-black text-apple-black">{currency.format(globalStats.totalOverdue)}</p>
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><PieChart size={80} /></div>
          </div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
             <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Total de Clientes</p>
             <p className="text-3xl font-black text-blue-600">{globalStats.totalCustomers}</p>
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Users size={80} /></div>
          </div>
        </div>

        {/* LISTAGEM DE INTELIGÊNCIA */}
        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm min-h-[500px]">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
            <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} className="text-orange-500" /> Scoring e Comportamento Transacional Consolidado
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-bold text-apple-muted bg-apple-white px-3 py-1.5 rounded-full border border-apple-border">
              <Info size={12} /> Dados unificados por documento em todos os lojistas
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Identidade do Cliente</th>
                  <th className="px-8 py-5 text-center">Score Swipy</th>
                  <th className="px-8 py-5 text-right">LTV Global (Pago)</th>
                  <th className="px-8 py-5 text-right">Taxa Inadimplência</th>
                  <th className="px-8 py-5 text-right">Dívida na Rede</th>
                  <th className="px-8 py-5 text-center">Lojistas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-apple-muted italic font-medium">Nenhum registro localizado no banco global.</td></tr>
                ) : (
                  filteredData.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-apple-offWhite border border-apple-border flex items-center justify-center text-apple-muted shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-all">
                               {cust.taxId?.length > 14 ? <Building2 size={20} /> : <User size={20} />}
                            </div>
                            <div className="overflow-hidden">
                               <p className="text-sm font-black text-apple-black leading-tight truncate max-w-[200px]">{cust.name}</p>
                               <p className="text-[10px] text-apple-muted font-bold font-mono mt-0.5">{cust.taxId}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <div className="inline-flex flex-col items-center">
                            <span className={cn(
                              "text-base font-black px-3 py-1 rounded-xl border shadow-sm",
                              cust.score > 80 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                              cust.score > 50 ? "text-orange-600 bg-orange-50 border-orange-100" :
                              "text-red-600 bg-red-50 border-red-100"
                            )}>
                               {cust.score.toFixed(0)}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-apple-black">
                        {currency.format(cust.totalPaid)}
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-lg border",
                              cust.delinquencyRate > 30 ? "text-red-600 bg-red-50 border-red-100" : "text-apple-dark bg-apple-offWhite border-apple-border"
                            )}>
                               {cust.delinquencyRate.toFixed(1)}%
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <p className={cn("text-sm font-bold", cust.totalOverdue > 0 ? "text-red-600" : "text-apple-muted opacity-40")}>
                           {currency.format(cust.totalOverdue)}
                         </p>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <div className="flex justify-center -space-x-2">
                            {cust.merchants.slice(0, 3).map((m: string, mIdx: number) => (
                               <div key={mIdx} className="w-8 h-8 rounded-full bg-apple-white border-2 border-apple-border flex items-center justify-center text-[9px] font-black text-orange-500 shadow-sm" title={m}>
                                  {m.charAt(0)}
                               </div>
                            ))}
                            {cust.merchants.length > 3 && (
                               <div className="w-8 h-8 rounded-full bg-apple-offWhite border-2 border-apple-border flex items-center justify-center text-[8px] font-black text-apple-muted shadow-sm">
                                  +{cust.merchants.length - 3}
                               </div>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalCRM;