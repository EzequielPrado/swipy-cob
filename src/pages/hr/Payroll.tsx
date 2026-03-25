"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Loader2, Calculator, Receipt, Users, ArrowDownToLine, HandCoins, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { Link } from 'react-router-dom';

const Payroll = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    if (!user) return;
    setLoading(true);
    
    // Na folha gerencial, puxamos apenas os funcionários ativos
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'Inativo')
      .order('full_name', { ascending: true });

    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Lógica Simplificada da Folha Gerencial
  const calculatePayroll = (emp: any) => {
    const base = Number(emp.base_salary || 0);
    
    if (emp.employment_type === 'PJ' || emp.employment_type === 'Estagiário') {
      return {
        base,
        inssDeduction: 0,
        netSalary: base,
        companyFgts: 0,
        companyProvisions: 0,
        totalCost: base
      };
    }

    // Para CLT:
    // Estimativa INSS do colaborador (Média gerencial de ~9% para não complicar com faixas exatas agora)
    const inssDeduction = base * 0.09;
    const netSalary = base - inssDeduction;

    // Encargos da Empresa (Custo)
    const companyFgts = base * 0.08;
    // Provisão de 13º e Férias (aproximadamente 1/12 de férias + 1/3, 1/12 de 13º = ~22.22%)
    const companyProvisions = base * 0.2222;

    const totalCost = base + companyFgts + companyProvisions;

    return {
      base,
      inssDeduction,
      netSalary,
      companyFgts,
      companyProvisions,
      totalCost
    };
  };

  // Somatórios Globais
  const totals = employees.reduce((acc, emp) => {
    const calc = calculatePayroll(emp);
    return {
      base: acc.base + calc.base,
      netSalary: acc.netSalary + calc.netSalary,
      companyCost: acc.companyCost + calc.totalCost,
      provisions: acc.companyProvisions + calc.companyProvisions + calc.companyFgts
    };
  }, { base: 0, netSalary: 0, companyCost: 0, provisions: 0 });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="text-blue-500" size={32} />
              Folha Gerencial (DRE)
            </h2>
            <p className="text-zinc-400 mt-1">Cálculo estimado do custo real de pessoal para fluxo de caixa.</p>
          </div>
        </div>

        {/* Dashboard Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><HandCoins size={100} /></div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Salários a Pagar (Líquido)</p>
            <p className="text-3xl font-black text-blue-400 mb-1">{currencyFormatter.format(totals.netSalary)}</p>
            <p className="text-xs text-zinc-500">O que efetivamente sai do caixa para a conta do funcionário.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><ArrowDownToLine size={100} /></div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Impostos e Provisões</p>
            <p className="text-3xl font-black text-orange-400 mb-1">{currencyFormatter.format(totals.provisions)}</p>
            <p className="text-xs text-zinc-500">Estimativa de FGTS, Férias e 13º salário.</p>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-red-500/20 p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><Receipt size={100} /></div>
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Custo Total RH (DRE)
            </p>
            <p className="text-4xl font-black text-zinc-100 mb-1">{currencyFormatter.format(totals.companyCost)}</p>
            <p className="text-xs text-zinc-500">Impacto total real no fluxo financeiro da empresa.</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl mt-4">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
            <h3 className="font-bold text-zinc-100">Detalhamento por Colaborador</h3>
            <Link to="/rh/colaboradores" className="text-[10px] uppercase font-bold text-orange-500 hover:underline flex items-center gap-1">
              Ver Cadastro <ExternalLink size={12} />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
          ) : employees.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum colaborador ativo encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Colaborador / Vínculo</th>
                    <th className="px-6 py-5">Salário Base (Bruto)</th>
                    <th className="px-6 py-5">Descontos (INSS)</th>
                    <th className="px-6 py-5 text-blue-400">Salário Líquido</th>
                    <th className="px-6 py-5">Encargos/Provisões</th>
                    <th className="px-6 py-5 text-right text-red-400">Custo Total Empresa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {employees.map((emp) => {
                    const calc = calculatePayroll(emp);
                    return (
                      <tr key={emp.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-100">{emp.full_name}</p>
                          <span className={cn(
                            "inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                            emp.employment_type === 'CLT' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400"
                          )}>
                            {emp.employment_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-300">
                          {currencyFormatter.format(calc.base)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-orange-400">
                            {calc.inssDeduction > 0 ? `- ${currencyFormatter.format(calc.inssDeduction)}` : 'R$ 0,00'}
                          </p>
                          {calc.inssDeduction > 0 && <p className="text-[9px] text-zinc-500">Estimativa INSS ~9%</p>}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-400 bg-blue-500/5">
                          {currencyFormatter.format(calc.netSalary)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-400">
                            {(calc.companyFgts > 0 || calc.companyProvisions > 0) ? `+ ${currencyFormatter.format(calc.companyFgts + calc.companyProvisions)}` : 'R$ 0,00'}
                          </p>
                          {calc.companyFgts > 0 && <p className="text-[9px] text-zinc-500">FGTS, Férias, 13º</p>}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-black text-red-400 bg-red-500/5">
                          {currencyFormatter.format(calc.totalCost)}
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
    </AppLayout>
  );
};

export default Payroll;