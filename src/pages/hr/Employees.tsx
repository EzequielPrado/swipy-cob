"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Users, Building2, Briefcase, ShieldAlert, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import AddEmployeeModal from '@/components/hr/AddEmployeeModal';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchEmployees = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.job_role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Users className="text-orange-500" size={32} />
              Quadro de Colaboradores
            </h2>
            <p className="text-zinc-400 mt-1">Gestão de RH, salários e controle de acesso ao ERP.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> Nova Admissão
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex items-center gap-4">
             <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                <Users size={24} />
             </div>
             <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Headcount</p>
                <p className="text-2xl font-bold text-zinc-100">{employees.length} <span className="text-sm font-normal text-zinc-500">ativos</span></p>
             </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex items-center gap-4 md:col-span-2">
             <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                <Briefcase size={24} />
             </div>
             <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Folha Base (Projeção)</p>
                <p className="text-2xl font-bold text-red-400">
                  {currencyFormatter.format(employees.reduce((acc, curr) => acc + Number(curr.base_salary || 0), 0))}
                </p>
             </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, cargo ou setor..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum colaborador registrado na folha.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Colaborador</th>
                  <th className="px-8 py-5">Contrato & Setor</th>
                  <th className="px-8 py-5">Salário Base</th>
                  <th className="px-8 py-5">Acesso ao Sistema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-bold text-orange-500 shadow-lg">
                          {emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{emp.full_name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Admitido em {new Date(emp.hire_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-200">{emp.job_role} <span className="text-[10px] font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded ml-1">{emp.employment_type}</span></p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                        <Building2 size={12} /> {emp.department}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-100">{currencyFormatter.format(emp.base_salary)}</p>
                    </td>
                    <td className="px-8 py-5">
                      {emp.system_access ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Key size={10} /> {emp.system_role}
                          </span>
                          <span className="text-[9px] text-zinc-500 truncate max-w-[150px]">{emp.email}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-zinc-800 text-zinc-500 border border-zinc-700">
                          <ShieldAlert size={10} /> Sem Acesso (DP)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddEmployeeModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchEmployees} 
      />
    </AppLayout>
  );
};

export default Employees;