"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { 
  CalendarClock, Plus, Search, Loader2, Trash2, CheckCircle2, Clock, 
  MapPin, XCircle, ChevronLeft, ChevronRight, Info, UserCheck, CalendarDays 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddAppointmentModal from '@/components/services/AddAppointmentModal';

const Appointments = () => {
  const { effectiveUserId } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const fetchAppointments = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, customers(name, phone), employees(full_name)')
        .eq('user_id', effectiveUserId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [effectiveUserId]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  const getAppsForDay = (day: Date) => {
    return appointments.filter(a => isSameDay(new Date(a.start_time), day));
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      showSuccess(`Status atualizado!`);
      fetchAppointments();
    } catch (err: any) { showError(err.message); }
  };

  const selectedDayApps = useMemo(() => getAppsForDay(selectedDay), [selectedDay, appointments]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <CalendarClock className="text-orange-500" size={32} /> Agenda de Atendimento
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão visual de horários e produtividade da equipe.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95">
            <Plus size={20} /> NOVO AGENDAMENTO
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          
          {/* COLUNA ESQUERDA: CALENDÁRIO GIGANTE */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-4">
                      <CalendarDays size={20} className="text-orange-500" />
                      <h3 className="text-xl font-black uppercase tracking-widest text-apple-black">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                      </h3>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2.5 bg-apple-offWhite border border-apple-border rounded-xl hover:bg-apple-light transition-all shadow-sm"><ChevronLeft size={18}/></button>
                      <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2.5 bg-apple-offWhite border border-apple-border rounded-xl hover:bg-apple-light transition-all shadow-sm"><ChevronRight size={18}/></button>
                   </div>
                </div>

                <div className="grid grid-cols-7 mb-4">
                   {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                     <div key={i} className="text-center text-[10px] font-black text-apple-muted uppercase tracking-widest py-2">{d}</div>
                   ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                   {/* Espaços vazios no início do mês */}
                   {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                     <div key={`empty-${i}`} className="aspect-square opacity-20" />
                   ))}
                   
                   {calendarDays.map((day, idx) => {
                     const apps = getAppsForDay(day);
                     const isSelected = isSameDay(day, selectedDay);
                     const today = isToday(day);

                     return (
                       <button 
                        key={idx}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all group overflow-hidden",
                          isSelected ? "bg-apple-black border-apple-black shadow-xl scale-105" : "bg-apple-offWhite border-apple-border hover:border-orange-500/50",
                          today && !isSelected && "border-orange-500"
                        )}
                       >
                          <span className={cn("text-sm font-black z-10", isSelected ? "text-white" : "text-apple-black")}>{format(day, 'd')}</span>
                          {apps.length > 0 && (
                            <div className="flex gap-0.5 mt-1.5 z-10">
                               {apps.slice(0, 3).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-orange-500" />)}
                            </div>
                          )}
                          {apps.length > 0 && isSelected && (
                             <div className="absolute inset-0 bg-orange-500 opacity-10 animate-pulse" />
                          )}
                       </button>
                     );
                   })}
                </div>
             </div>
          </div>

          {/* COLUNA DIREITA: DETALHES DO DIA SELECIONADO */}
          <div className="lg:col-span-3 space-y-6">
             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-10 border-b border-apple-border pb-6">
                   <div>
                      <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Linha do Tempo</p>
                      <h3 className="text-2xl font-black text-apple-black">
                        {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-inner font-black">
                      {selectedDayApps.length}
                   </div>
                </div>

                <div className="flex-1 space-y-4">
                   {loading ? (
                     <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" /></div>
                   ) : selectedDayApps.length === 0 ? (
                     <div className="py-20 text-center opacity-30 italic">
                        <CalendarClock size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-bold">Sem compromissos marcados<br/>para este dia.</p>
                     </div>
                   ) : (
                     selectedDayApps.map(app => (
                       <div key={app.id} className="p-5 bg-apple-offWhite border border-apple-border rounded-[2rem] hover:border-orange-500/30 transition-all group relative">
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-2">
                                <Clock size={14} className="text-orange-500" />
                                <span className="text-[11px] font-black text-apple-black uppercase tracking-widest">
                                   {format(new Date(app.start_time), 'HH:mm')} — {format(new Date(app.end_time), 'HH:mm')}
                                </span>
                             </div>
                             <span className={cn(
                               "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border",
                               app.status === 'agendado' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                             )}>{app.status}</span>
                          </div>

                          <h4 className="text-base font-black text-apple-black group-hover:text-orange-600 transition-colors leading-tight mb-2">{app.title}</h4>
                          
                          <div className="space-y-1.5">
                             <p className="text-xs font-bold text-apple-dark flex items-center gap-2"><User size={12} className="text-apple-muted" /> {app.customers?.name}</p>
                             <p className="text-[10px] font-bold text-apple-muted flex items-center gap-2"><UserCheck size={12} className="text-blue-500" /> Resp: {app.employees?.full_name || 'Não atribuído'}</p>
                          </div>

                          <div className="mt-6 flex gap-2">
                             {app.status === 'agendado' && (
                               <button onClick={() => handleStatusChange(app.id, 'concluido')} className="flex-1 bg-apple-black text-white text-[9px] font-black py-2.5 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95">Finalizar</button>
                             )}
                             <button onClick={() => { if(confirm('Remover?')) supabase.from('appointments').delete().eq('id', app.id).then(() => fetchAppointments()); }} className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-red-500 transition-all shadow-sm"><Trash2 size={16}/></button>
                          </div>
                       </div>
                     ))
                   )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-apple-border text-center">
                   <p className="text-[9px] text-apple-muted font-bold uppercase tracking-widest">Tecnologia Swipy Agenda v2.0</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <AddAppointmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchAppointments} />
    </AppLayout>
  );
};

export default Appointments;