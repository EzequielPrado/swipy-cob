"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Check, X, Info, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // TEMPO REAL: Ouvir novas notificações
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id?: string) => {
    if (id) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } else {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
    }
    fetchNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-orange-500" size={16} />;
      case 'system': return <Zap className="text-blue-500" size={16} />;
      default: return <Info className="text-zinc-500" size={16} />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-apple-muted hover:text-apple-black transition-all bg-apple-offWhite border border-apple-border rounded-xl shadow-sm">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-apple-white animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-apple-white border-apple-border rounded-3xl shadow-2xl overflow-hidden" align="end">
        <div className="p-4 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-apple-black">Notificações</h3>
          {unreadCount > 0 && (
            <button onClick={() => markAsRead()} className="text-[9px] font-black text-orange-600 hover:underline uppercase">Limpar tudo</button>
          )}
        </div>
        
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-apple-muted italic text-sm">Nenhum alerta recente.</div>
          ) : (
            <div className="divide-y divide-apple-border">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "p-4 flex gap-3 transition-colors cursor-pointer",
                    !n.is_read ? "bg-orange-50/30" : "hover:bg-apple-light"
                  )}
                >
                  <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                  <div>
                    <p className={cn("text-xs font-bold leading-tight", !n.is_read ? "text-apple-black" : "text-apple-muted")}>{n.title}</p>
                    <p className="text-[11px] text-apple-muted mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[9px] text-apple-muted mt-2 font-medium uppercase">{new Date(n.created_at).toLocaleDateString('pt-BR')} • {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;