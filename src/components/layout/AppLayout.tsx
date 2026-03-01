"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Receipt, 
  LogOut,
  Bell,
  UserCog,
  BarChart3,
  MessagesSquare,
  CheckCircle2,
  RefreshCcw,
  Palette
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useAuth } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Receipt, label: 'Cobranças', path: '/cobrancas' },
  { icon: RefreshCcw, label: 'Assinaturas', path: '/assinaturas' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Palette, label: 'Personalização', path: '/configuracoes' },
];

const adminItems = [
  { icon: BarChart3, label: 'Visão Global', path: '/admin/dashboard' },
  { icon: UserCog, label: 'Gerenciar Usuários', path: '/admin/usuarios' },
  { icon: MessagesSquare, label: 'Régua Global', path: '/admin/automacao' },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data));

      const channel = supabase
        .channel('realtime-payments')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'charges',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new.status === 'pago' && payload.old.status !== 'pago') {
              const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.new.amount);
              
              const newNotification = {
                id: Date.now(),
                title: 'Pagamento Confirmado!',
                message: `Recebemos o pagamento de ${amount}.`,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              };

              setNotifications(prev => [newNotification, ...prev].slice(0, 5));
              setHasNew(true);
              showSuccess(`💰 Pagamento de ${amount} confirmado agora!`);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const clearNotifications = () => {
    setHasNew(false);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-xl">
        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-950 shadow-lg shadow-orange-500/20">S</div>
              <span className="text-xl font-bold tracking-tight">Swipy <span className="text-orange-500">Cob</span></span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium ml-10 -mt-1 uppercase tracking-wider">Gestão de cobranças</p>
          </div>
          
          <div className="space-y-6">
            <nav className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-2">Menu Principal</p>
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    location.pathname === item.path 
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  )}
                >
                  <item.icon size={18} className={cn(
                    location.pathname === item.path ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {profile?.is_admin && (
              <nav className="space-y-1">
                <p className="text-[10px] font-bold text-orange-500/50 uppercase tracking-widest px-3 mb-2">Administração</p>
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                      location.pathname === item.path 
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    )}
                  >
                    <item.icon size={18} className={cn(
                      location.pathname === item.path ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-300"
                    )} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/30">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-zinc-400">
              Olá, <span className="text-zinc-100 font-semibold">{profile?.company || profile?.full_name || 'Usuário'}</span>
              {profile?.is_admin && <span className="ml-2 text-[10px] bg-orange-500 text-zinc-950 px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu onOpenChange={(open) => open && clearNotifications()}>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-zinc-400 hover:text-orange-400 transition-colors relative focus:outline-none">
                  <Bell size={20} />
                  {hasNew && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800 text-zinc-100 p-2">
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-2 py-3">Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-600 italic">Nenhuma notificação recente.</div>
                ) : (
                  notifications.map(n => (
                    <DropdownMenuItem key={n.id} className="focus:bg-zinc-800 rounded-lg p-3 cursor-default flex items-start gap-3">
                      <div className="mt-1 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-zinc-100">{n.title}</p>
                        <p className="text-xs text-zinc-400 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-zinc-600 mt-1 font-mono">{n.time}</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" />
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AppLayout;