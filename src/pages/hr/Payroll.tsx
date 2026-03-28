"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Loader2, Calculator, Receipt, HandCoins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';

const Payroll = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase.from('employees').select('*').eq('user_id', user.id).neq('status', 'Inativo').order('full_name', { ascending: true });
      if (data) setEmployees(data);
      setLoading(false);
    };
    fetchEmployees();
  }, [user]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const totals = employees.reduce((acc, emp) => {
    const base = Number(emp.base_salary || 0);
    const cost = emp.employment_type === 'CLT' ? base * 1.3 : base;
    return { base: acc.base + base, totalCost: acc.totalCost + cost };
  }, { base: 0, totalCost: 0 });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div><h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3"><Calculator className="text-blue-500" size={32} /> Folha Gerencial</h2><p className="text-apple-muted mt-1 font-medium">Projeção real de custos com pessoal (DRE).</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Salários Líquidos (Aprox.)</p><p className="text-4xl font-black text-apple-black">{currency.format(totals.base)}</p></div>
          <div className="bg-orange-500 p-8 rounded-[2rem] shadow-2xl text-white"><p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Custo Total Empresa (Encargos)</p><p className="text-4xl font-black">{currency.format(totals.totalCost)}</p></div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
              <tr><th className="px-8 py-5">Colaborador / Vínculo</th><th className="px-8 py-5">Salário Base</th><th className="px-8 py-5 text-right">Custo Total Real</th></tr>
            </thead>
            <tbody className="divide-y divide-apple-border">
              {loading ? <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr> : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-apple-light transition-colors"><td className="px-8 py-5"><p className="text-sm font-bold text-apple-black">{emp.full_name}</p><span className="text-[9px] font-black uppercase bg-apple-offWhite border border-apple-border px-2 py-0.5 rounded text-apple-dark">{emp.employment_type}</span></td><td className="px-8 py-5 text-sm font-bold text-apple-dark">{currency.format(emp.base_salary)}</td><td className="px-8 py-5 text-right text-sm font-black text-orange-600">{currency.format(emp.employment_type === 'CLT' ? emp.base_salary * 1.3 : emp.base_salary)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Payroll;