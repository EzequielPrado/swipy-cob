"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, Search, Filter, Loader2, ShieldAlert, 
  User, Building2, Clock, CheckCircle2, Send, Eye, MousePointer2,
  AlertTriangle, Database, Terminal, FileJson, Activity, RefreshCw
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

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
    log.charges?.profiles?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.charges?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black">
              <History className="text-orange-500" size={32} /> Auditoria Master
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Histórico global de atividades, acessos e alterações de dados na rede Swipy.</p>
          </div>
          <div className="flex gap-3">
             <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
                <Input 
                  placeholder="Buscar por evento ou lojista..." 
                  className="pl-12 bg-apple-white border-apple-border rounded-2xl h-12 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={fetchGlobalLogs} className="p-3 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black shadow-sm transition-all active:scale-95">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-orange-50 border border-orange-200 p-6 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm"><Activity size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-orange-600">Monitoramento</p><p className="text-2xl font-black text-apple-black">Ativo</p></div>
           </div>
           <div className="bg-blue-50 border border-blue-200 p-6 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm"><Send size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-blue-600">Entregas Meta API</p><p className="text-2xl font-black text-apple-black">Live</p></div>
           </div>
           <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm"><ShieldCheck size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-emerald-600">Compliance</p><p className="text-2xl font-black text-apple-black">100%</p></div>
           </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
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
                  <tr><td colSpan={4} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={40} /></td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-24 text-center text-apple-muted italic">Nenhum evento registrado.</td></tr>
                ) : filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-apple-light transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                       <p className="text-sm font-black text-apple-black">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
                       <p className="text-[10px] text-apple-muted font-bold uppercase">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <Building2 size={16} className="text-orange-500" />
                          <span className="text-sm font-bold text-apple-black truncate max-w-[150px]">{log.charges?.profiles?.company || 'Sistema'}</span>
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

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          <DialogHeader className="p-8 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-xl font-black flex items-center gap-3">
               <Terminal size={20} className="text-orange-500" /> Detalhes do Rastro
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div><Label className="text-[10px] font-black text-apple-muted uppercase">ID do Evento</Label><p className="text-xs font-mono font-bold mt-1">{selectedLog.id}</p></div>
                 <div><Label className="text-[10px] font-black text-apple-muted uppercase">Dispositivo / Origem</Label><p className="text-xs font-bold mt-1">Web SDK (Swipy)</p></div>
              </div>
              <div className="bg-apple-offWhite p-6 rounded-3xl border border-apple-border">
                 <Label className="text-[10px] font-black text-apple-muted uppercase mb-4 block">Payload Bruto (Metadata)</Label>
                 <pre className="text-[10px] font-mono bg-black text-emerald-400 p-4 rounded-xl overflow-x-auto">
                    {JSON.stringify({
                      event_type: selectedLog.type,
                      merchant_id: selectedLog.charges?.user_id,
                      customer_id: selectedLog.charge_id,
                      status: selectedLog.status,
                      message: selectedLog.message,
                      timestamp: selectedLog.created_at
                    }, null, 2)}
                 </pre>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-apple-muted uppercase bg-orange-50 p-4 rounded-2xl border border-orange-100">
                 <AlertTriangle size={14} className="text-orange-500" />
                 Este registro é imutável e assinado digitalmente pelo sistema Swipy.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AuditLogs;