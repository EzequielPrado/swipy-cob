"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  ArrowUpCircle, ArrowDownCircle, Clock, Loader2, Info,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FinancialCalendar = () => {
  const { effectiveUserId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ charges: any[], expenses: any[] }>({ charges: [], expenses: [] });
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const fetchMonthData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    
    const start = startOfMonth(currentDate).toISOString();
    const end = endOfMonth(currentDate).toISOString();

    try {
      const [chargesRes, expensesRes] = await Promise.all([
        supabase.from('charges').select('*, customers(name)').eq('user_id', effectiveUserId).gte('due_date', start).lte('due_date', end),
        supabase.from('expenses').select('*').eq('user_id', effectiveUserId).gte('due_date', start).lte('due_date', end)
      ]);

      setData({ 
        charges: chargesRes.data || [], 
        expenses: expensesRes.data || [] 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMonthData(); }, [effectiveUserId, currentDate]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  const getDayStats = (day: Date) => {
    const dayCharges = data.charges.filter(c => isSameDay(new Date(c.due_date + 'T12:00:00'), day));
    const dayExpenses = data.expenses.filter(e => isSameDay(new Date(e.due_date + 'T12:00:00'), day));
    
    return {
      in: dayCharges.reduce((acc, c) => acc + Number(c.amount), 0),
      out: dayExpenses.reduce((acc, e) => acc + Number(e.amount), 0),
      hasPendingIn: dayCharges.some(c => c.status !== 'pago'),
      hasPaidIn: dayCharges.some(c => c.status === 'pago'),
      hasOut: dayExpenses.length > 0,
      count: dayCharges.length + dayExpenses.length
    };
  };

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return { charges: [], expenses: [] };
    return {
      charges: data.charges.filter(c => isSameDay(new Date(c.due_date + 'T12:00:00'), selectedDay)),
      expenses: data.expenses.filter(e => isSameDay(new Date(e.due_date + 'T12:00:00'), selectedDay))
    };
  }, [selectedDay, data]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
              <CalendarIcon className="text-orange-500" size={32} /> Agenda Financeira
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Previsão diária de fluxo de caixa e compromissos.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-apple-white border border-apple-border p-1 rounded-2xl shadow-sm">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-apple-light rounded-xl transition-all"><ChevronLeft size={20}/></button>
            <span className="text-sm font-black uppercase tracking-widest min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-apple-light rounded-xl transition-all"><ChevronRight size={20}/></button>
          </div>
        </div>

        {/* LEGENDA */}
        <div className="flex flex-wrap gap-6 bg-apple-white border border-apple-border p-4 rounded-2xl shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
              <span className="text-[10px] font-black uppercase text-apple-muted">Previsão de Entrada</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase text-apple-muted">Recebido</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[10px] font-black uppercase text-apple-muted">Contas a Pagar</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          <div className="lg:col-span-4 bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
             <div className="grid grid-cols-7 mb-6">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-apple-muted uppercase tracking-widest">{d}</div>
                ))}
             </div>
             
             {loading ? (
               <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
             ) : (
               <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => <div key={i} />)}
                  
                  {calendarDays.map((day, idx) => {
                    const stats = getDayStats(day);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    
                    return (
                      <button 
                        key={idx}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all group",
                          isSelected ? "bg-apple-black border-apple-black shadow-xl scale-105" : "bg-apple-offWhite border-apple-border hover:border-orange-500/50",
                          isToday(day) && !isSelected && "border-orange-500 ring-1 ring-orange-500/20"
                        )}
                      >
                        <span className={cn("text-sm font-black", isSelected ? "text-white" : "text-apple-black")}>{format(day, 'd')}</span>
                        
                        <div className="flex gap-1 mt-1.5">
                           {stats.hasPendingIn && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                           {stats.hasPaidIn && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                           {stats.hasOut && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        </div>
                      </button>
                    );
                  })}
               </div>
             )}
          </div>

          <div className="lg:col-span-3 space-y-6">
             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-8 border-b border-apple-border pb-6">
                   <div>
                      <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Agenda para</p>
                      <h3 className="text-xl font-black text-apple-black">{selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-apple-muted uppercase">Resultado</p>
                      <p className={cn("text-lg font-black", (getDayStats(selectedDay || new Date()).in - getDayStats(selectedDay || new Date()).out) >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {selectedDay ? currency.format(getDayStats(selectedDay).in - getDayStats(selectedDay).out) : '---'}
                      </p>
                   </div>
                </div>

                <div className="flex-1 space-y-4">
                   {selectedDayItems.charges.length === 0 && selectedDayItems.expenses.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                        <Info size={40} className="mb-4" />
                        <p className="text-sm font-bold">Sem compromissos<br/>lançados.</p>
                     </div>
                   ) : (
                     <>
                        {selectedDayItems.charges.map(c => (
                          <div key={c.id} className={cn(
                            "p-4 border rounded-2xl flex items-center justify-between group transition-all",
                            c.status === 'pago' ? "bg-emerald-50/30 border-emerald-100" : "bg-orange-50/30 border-orange-100"
                          )}>
                             <div className="flex items-center gap-3">
                                {c.status === 'pago' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-orange-500" />}
                                <div>
                                   <p className="text-xs font-black text-apple-black truncate max-w-[120px]">{c.customers?.name}</p>
                                   <span className={cn("text-[9px] font-bold uppercase", c.status === 'pago' ? "text-emerald-600" : "text-orange-600")}>
                                     {c.status === 'pago' ? 'Recebido' : 'Previsão de Entrada'}
                                   </span>
                                </div>
                             </div>
                             <p className="text-sm font-black text-apple-black">{currency.format(c.amount)}</p>
                          </div>
                        ))}

                        {selectedDayItems.expenses.map(e => (
                          <div key={e.id} className="p-4 bg-red-50/30 border border-red-100 rounded-2xl flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <ArrowDownCircle size={20} className="text-red-500" />
                                <div>
                                   <p className="text-xs font-black text-apple-black truncate max-w-[120px]">{e.description}</p>
                                   <span className="text-[9px] font-bold text-red-600 uppercase">Conta a Pagar ({e.status})</span>
                                </div>
                             </div>
                             <p className="text-sm font-black text-apple-black">{currency.format(e.amount)}</p>
                          </div>
                        ))}
                     </>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FinancialCalendar;