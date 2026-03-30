"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, Search, Filter, Loader2, ShieldAlert, 
  User, Building2, Clock, CheckCircle2, Send, Eye, MousePointer2,
  AlertTriangle, Activity, RefreshCw, ShieldCheck, Store, Wrench, Zap
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

  const getEventConfig = (log: any) => {
    const type = log.type;
    const msg = log.message?.toLowerCase() || '';

    if (msg.includes('nuvemshop')) return { icon: Store, color: 'text-blue-500', bg: 'bg-blue-50', label: 'E-commerce' };
    if (type === 'payment') return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Financeiro' };
    if (msg.includes('produção') || msg.includes('os #')) return { icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Operação' };
    if (type === 'viewed') return { icon: Eye, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Check-in' };
    if (type === 'whatsapp') return { icon: Send, color: 'text-blue-400', bg: 'bg-blue-50', label: 'Mensageria' };
    
    return { icon: Zap, color: 'text-zinc-500', bg: 'bg-zinc-50', label: 'Evento' };
  };

  const filteredLogs = logs.filter(log => 
    log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.charges?.profiles?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.charges?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black">
              <ShieldCheck className="text-orange-500" size={32} /> Rastro do Sistema
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Tudo o que acontece na rede Swipy em tempo real.</p>
          </div>
          <div className="flex gap-3">
             <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
                <Input 
                  placeholder="Filtrar por lojista ou evento..." 
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

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Momento</th>
                  <th className="px-8 py-5">Lojista Responsável</th>
                  <th className="px-8 py-5">O que aconteceu?</th>
                  <th className="px-8 py-5 text-right">Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {loading ? (
                  <tr><td colSpan={4} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={40} /></td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-24 text-center text-apple-muted italic">Nenhum evento localizado.</td></tr>
                ) : (
                  filteredLogs.map((log) => {
                    const config = getEventConfig(log);
                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-apple-light transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-5">
                          <p className="text-sm font-black text-apple-black">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</p>
                          <p className="text-[10px] text-apple-muted font-bold">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                              <Building2 size={16} className="text-orange-500" />
                              <span className="text-sm font-bold text-apple-black truncate max-w-[180px]">{log.charges?.profiles?.company || 'Sistema Swipy'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-start gap-4">
                             <div className={cn("mt-0.5 p-2 rounded-lg border", config.bg, config.color.replace('text-', 'border-').replace('500', '100'))}>
                                <config.icon size={16} className={config.color} />
                             </div>
                             <div>
                               <p className="text-sm font-medium text-apple-dark leading-tight">{log.message}</p>
                               <span className={cn("text-[9px] font-black uppercase tracking-widest", config.color)}>{config.label}</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {log.charges?.amount && (
                            <p className="text-sm font-black text-apple-black">{currency.format(log.charges.amount)}</p>
                          )}
                          <p className="text-[10px] text-apple-muted font-bold truncate max-w-[120px]">{log.charges?.customers?.name || 'Evento Interno'}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-apple-white border-apple-border text-apple-black sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          <DialogHeader className="p-10 border-b border-apple-border bg-apple-offWhite">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <ShieldAlert className="text-orange-500" /> Detalhes do Evento
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                 <div><Label className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2 block">ID Único</Label><p className="text-xs font-mono font-bold bg-apple-offWhite p-3 rounded-xl border border-apple-border">{selectedLog.id}</p></div>
                 <div><Label className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2 block">Data/Hora GPS</Label><p className="text-xs font-bold bg-apple-offWhite p-3 rounded-xl border border-apple-border">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</p></div>
              </div>
              
              <div className="space-y-4">
                 <Label className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Metadata do Sistema</Label>
                 <div className="bg-zinc-950 p-6 rounded-3xl overflow-hidden shadow-inner">
                   <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto">
                      {JSON.stringify({
                        event: selectedLog.type,
                        origin: "Web SDK / Webhook",
                        merchant_ref: selectedLog.charges?.user_id,
                        charge_ref: selectedLog.charge_id,
                        status: selectedLog.status,
                        msg: selectedLog.message
                      }, null, 2)}
                   </pre>
                 </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-black text-apple-muted uppercase bg-orange-50 p-5 rounded-2xl border border-orange-100">
                 <ShieldCheck size={20} className="text-orange-500" />
                 Este registro é assinado digitalmente e imutável no banco de dados.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AuditLogs;