"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, Search, Filter, Loader2, ShieldAlert, 
  User, Building2, Clock, CheckCircle2, Send, Eye, MousePointer2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGlobalLogs = async () => {
    setLoading(true);
    try {
      // Puxamos logs de notificações e eventos globais
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          *,
          charges (
            amount,
            user_id,
            customers (name),
            profiles:user_id (company)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGlobalLogs(); }, []);

  const getEventIcon = (type: string, message: string) => {
    const msg = message.toLowerCase();
    if (type === 'payment') return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (type === 'whatsapp') return <Send size={16} className="text-blue-500" />;
    if (type === 'viewed') return <Eye size={16} className="text-orange-500" />;
    if (msg.includes('copiou')) return <MousePointer2 size={16} className="text-purple-500" />;
    return <Clock size={16} className="text-apple-muted" />;
  };

  const filteredLogs = logs.filter(log => 
    log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.charges?.profiles?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black">
              <History className="text-orange-500" size={32} /> Auditoria Master
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Histórico global de atividades e interações de clientes finais.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <Input 
              placeholder="Buscar por log ou lojista..." 
              className="pl-12 bg-apple-white border-apple-border rounded-2xl h-12 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Timestamp / Origem</th>
                  <th className="px-8 py-5">Lojista (Merchant)</th>
                  <th className="px-8 py-5">Evento / Ação</th>
                  <th className="px-8 py-5 text-right">Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-apple-muted italic">Nenhum evento registrado.</td></tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-apple-light transition-colors group">
                    <td className="px-8 py-5">
                       <p className="text-sm font-black text-apple-black">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
                       <p className="text-[10px] text-apple-muted font-bold uppercase">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <Building2 size={16} className="text-orange-500" />
                          <span className="text-sm font-bold text-apple-black">{log.charges?.profiles?.company || 'Sistema'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-start gap-3">
                          <div className="mt-1">{getEventIcon(log.type, log.message)}</div>
                          <div>
                            <p className="text-sm font-medium text-apple-dark leading-tight">{log.message}</p>
                            <span className="text-[9px] font-black text-apple-muted uppercase tracking-tighter">Tipo: {log.type}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <p className="text-[10px] font-black text-apple-muted uppercase">Cliente Final</p>
                       <p className="text-xs font-bold text-apple-black">{log.charges?.customers?.name || 'N/A'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AuditLogs;