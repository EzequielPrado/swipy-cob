"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Loader2, 
  Plane, 
  User, 
  History,
  ChevronRight,
  Palmtree
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, differenceInMonths, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddAbsenceModal from '@/components/hr/AddAbsenceModal';

const VacationControl = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const [empRes, absRes] = await Promise.all([
        supabase.from('employees').select('*').eq('user_id', effectiveUserId).eq('status', 'Ativo'),
        supabase.from('employee_absences').select('*, employees(full_name, department)').eq('user_id', effectiveUserId)
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (absRes.data) setAbsences(absRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [effectiveUserId]);

  // Lógica de Alertas: Quem está com as férias vencendo (11 meses ou mais de casa)
  const maturityAlerts = useMemo(() => {
    const today = new Date();
    return employees.filter(emp => {
      if (!emp.hire_date) return false;
      const months = differenceInMonths(today, parseISO(emp.hire_date));
      // Se tem 11 meses ou mais e não tem férias futuras marcadas
      const hasUpcomingVacation = absences.some(a => a.employee_id === emp.id && a.type === 'Férias' && isAfter(parseISO(a.start_date), today));
      return months >= 11 && !hasUpcomingVacation;
    });
  }, [employees, absences]);

  const currentAbsences = absences.filter(a => {
    const today = new Date();
    return isBefore(parseISO(a.start_date), today) && isAfter(parseISO(a.end_date), today);
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
              <Palmtree className="text-orange-500" size={32} /> Gestão de Férias
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Controle de períodos de descanso e alertas de vencimento legal.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95"
          >
            <Plus size={20} /> AGENDAR AUSÊNCIA
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA: ALERTAS DE MATURIDADE */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-orange-50 border border-orange-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10"><Clock size={80} className="text-orange-600" /></div>
                <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <AlertTriangle size={14} /> Atenção: Férias a Vencer
                </h3>
                
                {maturityAlerts.length === 0 ? (
                  <p className="text-sm font-medium text-orange-800">Nenhum colaborador com férias críticas no momento.</p>
                ) : (
                  <div className="space-y-4">
                    {maturityAlerts.map(emp => (
                      <div key={emp.id} className="bg-white/60 p-4 rounded-2xl border border-orange-200 flex items-center justify-between group hover:bg-white transition-all">
                        <div>
                          <p className="text-sm font-black text-apple-black">{emp.full_name}</p>
                          <p className="text-[10px] text-orange-600 font-bold uppercase">{differenceInMonths(new Date(), parseISO(emp.hire_date))} meses de casa</p>
                        </div>
                        <ChevronRight size={16} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
                <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Ausentes Agora</h3>
                {currentAbsences.length === 0 ? (
                  <p className="text-xs text-apple-muted italic">Todos os colaboradores estão em operação hoje.</p>
                ) : (
                  <div className="space-y-4">
                    {currentAbsences.map(abs => (
                      <div key={abs.id} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                          <Plane size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-apple-black">{abs.employees?.full_name}</p>
                          <p className="text-[10px] text-apple-muted font-bold uppercase">Volta em {format(parseISO(abs.end_date), "dd/MM")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>

          {/* COLUNA: TIMELINE / HISTÓRICO */}
          <div className="lg:col-span-2 bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
             <div className="p-8 border-b border-apple-border bg-apple-offWhite flex justify-between items-center">
                <h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2">
                  <History size={16} className="text-orange-500" /> Histórico e Planejamento
                </h3>
             </div>
             
             <div className="p-2">
                {loading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                ) : absences.length === 0 ? (
                  <div className="py-20 text-center text-apple-muted italic">Nenhuma ausência registrada.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-[9px] font-black text-apple-muted uppercase bg-apple-offWhite border-b border-apple-border">
                      <tr>
                        <th className="px-6 py-4">Colaborador</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Período</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-apple-border">
                      {absences.map(abs => (
                        <tr key={abs.id} className="hover:bg-apple-light transition-colors">
                          <td className="px-6 py-5">
                            <p className="text-sm font-black text-apple-black">{abs.employees?.full_name}</p>
                            <p className="text-[10px] text-apple-muted font-bold uppercase">{abs.employees?.department}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase border",
                              abs.type === 'Férias' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                            )}>
                              {abs.type}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-xs font-bold text-apple-dark">
                               {format(parseISO(abs.start_date), "dd/MM/yy")} <ArrowRight size={12} className="text-apple-muted" /> {format(parseISO(abs.end_date), "dd/MM/yy")}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <span className="text-[10px] font-black uppercase text-apple-muted">{abs.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>
      </div>

      <AddAbsenceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </AppLayout>
  );
};

export default VacationControl;