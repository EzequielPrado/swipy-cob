"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { CalendarClock, Plus, Search, Loader2, Trash2, CheckCircle2, Clock, MapPin, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import AddAppointmentModal from '@/components/services/AddAppointmentModal';

const Appointments = () => {
  const { effectiveUserId } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAppointments = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, customers(name, phone)')
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      showSuccess(`Status atualizado para ${newStatus}`);
      fetchAppointments();
    } catch (err: any) { showError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este agendamento?")) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Agendamento excluído.");
      fetchAppointments();
    } catch (err: any) { showError(err.message); }
  };

  const filtered = useMemo(() => {
    return appointments.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appointments, searchTerm]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <CalendarClock className="text-orange-500" size={32} /> Agendamentos
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Controle de agenda, visitas técnicas e prestação de serviços.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95">
            <Plus size={20} /> NOVO AGENDAMENTO
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Buscar por cliente ou serviço..." 
            className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-apple-muted italic font-bold"><p>Nenhum agendamento encontrado.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-6">Data e Hora</th>
                    <th className="px-8 py-6">Serviço / Cliente</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {filtered.map((app) => (
                    <tr key={app.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-2xl bg-apple-offWhite border border-apple-border flex flex-col items-center justify-center shadow-inner">
                              <span className="text-[9px] font-black uppercase text-orange-500 leading-none">{new Date(app.start_time).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                              <span className="text-lg font-black text-apple-black leading-none mt-1">{new Date(app.start_time).getDate()}</span>
                           </div>
                           <div>
                             <p className="text-sm font-bold text-apple-black flex items-center gap-1.5"><Clock size={12} className="text-apple-muted" /> {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                             <p className="text-[10px] text-apple-muted font-bold mt-0.5">Até {new Date(app.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-apple-black">{app.title}</p>
                         <p className="text-[10px] text-apple-muted font-bold flex items-center gap-1.5 mt-1">
                           <MapPin size={10} className="text-blue-500" /> {app.customers?.name} {app.customers?.phone && `(${app.customers.phone})`}
                         </p>
                      </td>
                      <td className="px-8 py-5">
                         <span className={cn(
                           "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                           app.status === 'agendado' ? "bg-blue-50 text-blue-600 border-blue-100" :
                           app.status === 'concluido' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                         )}>
                           {app.status === 'agendado' ? <Clock size={10} /> : app.status === 'concluido' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                           {app.status}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-1">
                            {app.status === 'agendado' && <button onClick={() => handleStatusChange(app.id, 'concluido')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Marcar como Concluído"><CheckCircle2 size={18}/></button>}
                            {app.status === 'agendado' && <button onClick={() => handleStatusChange(app.id, 'cancelado')} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Cancelar"><XCircle size={18}/></button>}
                            <button onClick={() => handleDelete(app.id)} className="p-2.5 text-apple-muted hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddAppointmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchAppointments} />
    </AppLayout>
  );
};

export default Appointments;