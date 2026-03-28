"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Users, Building2, Briefcase, ShieldAlert, Key, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddEmployeeModal from '@/components/hr/AddEmployeeModal';
import EditEmployeeModal from '@/components/hr/EditEmployeeModal';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const fetchEmployees = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, [user]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover ${name}?`)) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) { showSuccess("Colaborador removido"); fetchEmployees(); }
  };

  const filtered = employees.filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div><h2 className="text-3xl font-bold tracking-tight text-apple-black">Colaboradores</h2><p className="text-apple-muted mt-1 font-medium">Gestão de capital humano e acessos ao ERP.</p></div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm"><Plus size={18} /> Nova Admissão</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Equipe Ativa</p><p className="text-3xl font-black text-apple-black">{employees.filter(e => e.status === 'Ativo').length}</p></div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Folha Mensal Estimada</p><p className="text-3xl font-black text-red-500">{currency.format(employees.reduce((acc, c) => acc + Number(c.base_salary || 0), 0))}</p></div>
        </div>

        <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou cargo..." className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm" /></div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Colaborador</th><th className="px-8 py-5">Setor</th><th className="px-8 py-5">Salário</th><th className="px-8 py-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-apple-light transition-colors"><td className="px-8 py-5"><p className="text-sm font-bold text-apple-black">{emp.full_name}</p><p className="text-[10px] text-apple-muted font-bold">{emp.job_role}</p></td><td className="px-8 py-5"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-apple-offWhite border border-apple-border text-apple-dark"><Building2 size={10} /> {emp.department}</span></td><td className="px-8 py-5 text-sm font-bold text-apple-dark">{currency.format(emp.base_salary)}</td><td className="px-8 py-5 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => { setSelectedEmployee(emp); setIsEditModalOpen(true); }} className="p-2 text-apple-muted hover:text-blue-500"><Edit3 size={18}/></button><button onClick={() => handleDelete(emp.id, emp.full_name)} className="p-2 text-apple-muted hover:text-red-500"><Trash2 size={18}/></button></div></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchEmployees} />
      <EditEmployeeModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedEmployee(null); }} onSuccess={fetchEmployees} employee={selectedEmployee} />
    </AppLayout>
  );
};

export default Employees;