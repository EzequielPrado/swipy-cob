"use client";

import React, { useEffect, useState } from 'react';
import { 
  Zap, ShoppingBag, Box, AlertTriangle, CheckCircle2, 
  Clock, ArrowRight, Store, Wrench, ShieldAlert,
  Loader2, MousePointer2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";

const LiveOperationFeed = ({ userId }: { userId: string }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Buscamos os logs mais recentes que afetam este usuário
      // Nota: Como os logs estão vinculados a charges, e charges ao usuário, 
      // fazemos uma query que busca logs de cobranças que pertencem ao user_id
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          *,
          charges!inner(user_id, description, amount, customers(name))
        `)
        .eq('charges.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("[LiveFeed] Erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Inscrição em Tempo Real para novos logs
    const channel = supabase
      .channel('live-ops-feed')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notification_logs' 
      }, () => {
        fetchLogs(); // Recarrega quando algo novo acontece
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const getEventConfig = (log: any) => {
    const msg = log.message?.toLowerCase() || '';
    const type = log.type;

    if (msg.includes('nuvemshop')) return { icon: Store, color: 'text-blue-500', bg: 'bg-blue-50', label: 'E-commerce' };
    if (type === 'payment') return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Financeiro' };
    if (msg.includes('produção')) return { icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Operacional' };
    if (msg.includes('acessou') || msg.includes('visualizou')) return { icon: MousePointer2, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Interação' };
    if (log.status === 'error') return { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50', label: 'Sistema' };
    
    return { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Atividade' };
  };

  return (
    <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-8 border-b border-apple-border flex items-center justify-between bg-apple-offWhite">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl border border-apple-border flex items-center justify-center shadow-sm relative">
            <Zap className="text-orange-500 fill-orange-500" size={24} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-apple-black tracking-tight">Painel de Operações</h3>
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest">Acontecendo agora na empresa</p>
          </div>
        </div>
        <button onClick={fetchLogs} className="p-2.5 bg-white hover:bg-apple-light border border-apple-border rounded-xl transition-all shadow-sm">
           <RefreshCw size={16} className={cn("text-apple-muted", loading && "animate-spin")} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-[400px] max-h-[500px]">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <Loader2 className="animate-spin text-orange-500" />
            <p className="text-[10px] font-black uppercase">Sincronizando feed...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
             <Zap size={48} className="mb-4 text-apple-muted" />
             <p className="text-xs font-bold leading-relaxed">Nenhuma atividade registrada nas últimas horas.</p>
          </div>
        ) : (
          logs.map((log) => {
            const config = getEventConfig(log);
            return (
              <div 
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-3xl border border-apple-border bg-apple-white hover:border-orange-500/30 transition-all group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-110",
                  config.bg, config.color.replace('text-', 'border-').replace('500', '100')
                )}>
                  <config.icon size={20} className={config.color} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", config.color)}>{config.label}</span>
                    <span className="w-1 h-1 rounded-full bg-apple-border" />
                    <span className="text-[9px] font-bold text-apple-muted">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-apple-black leading-tight mb-1">{log.message}</p>
                  <p className="text-[10px] text-apple-muted font-medium flex items-center gap-1.5">
                    <span className="text-apple-black font-bold">{log.charges?.customers?.name || 'Sistema'}</span>
                    {log.charges?.amount && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-apple-border" />
                        <span className="text-emerald-600 font-black">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.charges.amount)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="p-2 bg-apple-offWhite rounded-lg border border-apple-border">
                      <ArrowRight size={14} className="text-apple-muted" />
                   </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-6 bg-apple-offWhite border-t border-apple-border text-center">
         <a href="/admin/auditoria" className="text-[10px] font-black text-apple-muted hover:text-orange-500 transition-colors uppercase tracking-[0.2em]">
            Ver logs de auditoria completa
         </a>
      </div>
    </div>
  );
};

export default LiveOperationFeed;