"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, LogOut, Bell, UserCog, BarChart3, MessagesSquare, CheckCircle2, Palette, ShoppingCart,
  Package, Landmark, Contact, ChevronDown, ChevronRight, Wallet, Factory, Zap, GraduationCap, XCircle, ShieldCheck,
  Moon, Sun, Menu, X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useAuth } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const menuStructure = [
  { title: 'Visão Geral', icon: LayoutDashboard, path: '/', roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Estoque', 'Contador'] },
  { title: 'Minha Carteira', icon: GraduationCap, path: '/contador', roles: ['Contador'] },
  { title: 'Vendas', icon: ShoppingCart, roles: ['Admin', 'Vendas', 'Contador'], submenus: [{ label: 'Dashboard de Vendas', path: '/vendas/dashboard' }, { label: 'Gestão de Vendas', path: '/vendas/lista' }, { label: 'Orçamentos', path: '/vendas/orcamentos' }, { label: 'Frente de Caixa (PDV)', path: '/vendas/pdv' }] },
  { title: 'Indústria', icon: Factory, roles: ['Admin', 'Estoque'], submenus: [{ label: 'Controle de Produção', path: '/industria/producao' }] },
  { title: 'Estoque', icon: Package, roles: ['Admin', 'Estoque', 'Vendas', 'Contador'], submenus: [{ label: 'Produtos', path: '/estoque/produtos' }, { label: 'Movimentações', path: '/estoque/movimentacoes' }] },
  { title: 'Financeiro', icon: Landmark, roles: ['Admin', 'Financeiro', 'Contador'], submenus: [{ label: 'Dashboard Financeiro', path: '/financeiro/dashboard' }, { label: 'Contas a Receber', path: '/financeiro/cobrancas' }, { label: 'Assinaturas', path: '/financeiro/assinaturas' }, { label: 'Contas a Pagar', path: '/financeiro/pagar' }, { label: 'Contas Bancárias', path: '/financeiro/bancos' }, { label: 'DRE Contábil', path: '/financeiro/dre' }, { label: 'Fiscal (NFe/NFSe)', path: '/financeiro/fiscal' }] },
  { title: 'Gente e Gestão', icon: Users, roles: ['Admin', 'RH', 'Contador'], submenus: [{ label: 'Colaboradores', path: '/rh/colaboradores' }, { label: 'Folha Gerencial', path: '/rh/folha' }] },
  { title: 'Cadastros', icon: Contact, roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Contador'], submenus: [{ label: 'Clientes', path: '/clientes' }, { label: 'Fornecedores', path: '/fornecedores' }] },
  { title: 'Personalização', icon: Palette, path: '/configuracoes', roles: ['Admin'] }
];

const adminItems = [
  { icon: BarChart3, label: 'Visão Global', path: '/admin/dashboard' },
  { icon: UserCog, label: 'Monitoramento de Usuários', path: '/admin/usuarios' },
  { icon: Zap, label: 'Gestão de Planos', path: '/admin/planos' },
  { icon: MessagesSquare, label: 'Régua Global', path: '/admin/automacao' },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, systemRole, isAdmin, activeMerchant, setActiveMerchant } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentOpen = [...openMenus];
    menuStructure.forEach(menu => {
      if (menu.submenus?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))) {
        if (!currentOpen.includes(menu.title)) currentOpen.push(menu.title);
      }
    });
    setOpenMenus(currentOpen);
    setIsMobileMenuOpen(false); // Fecha o menu ao mudar de rota no mobile
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data));

      const channel = supabase.channel('realtime-payments').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'charges', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.new.status === 'pago' && payload.old.status !== 'pago') {
          const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.new.amount);
          const newNotification = { id: Date.now(), title: 'Pagamento Confirmado!', message: `Recebemos o pagamento de ${amount}.`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
          setNotifications(prev => [newNotification, ...prev].slice(0, 5)); setHasNew(true); showSuccess(`💰 Pagamento de ${amount} confirmado agora!`);
        }
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const toggleMenu = (title: string) => setOpenMenus(prev => prev.includes(title) ? prev.filter(m => m !== title) : [...prev, title]);

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const visibleMenus = menuStructure.filter(menu => menu.roles.includes(systemRole));

  return (
    <div className="flex h-screen bg-apple-light text-apple-black overflow-hidden font-sans relative">
      
      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-apple-border flex flex-col bg-apple-white shadow-[4px_0_24px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-8 h-8 object-contain" />
            <span className="text-2xl font-bold tracking-tighter text-apple-black">Swipy</span>
          </Link>
          <button className="lg:hidden p-2 text-apple-muted" onClick={() => setIsMobileMenuOpen(false)}>
             <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-6">
          <div className="space-y-6">
            <nav className="space-y-1">
              <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest px-3 mb-3">Menu Principal</p>
              {visibleMenus.map((item) => {
                const isActive = item.path ? location.pathname === item.path : false;
                const hasSubmenus = !!item.submenus;
                const isOpen = openMenus.includes(item.title);
                const isChildActive = hasSubmenus && item.submenus!.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));

                return (
                  <div key={item.title} className="mb-1">
                    {hasSubmenus ? (
                      <button onClick={() => toggleMenu(item.title)} className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group", isChildActive || isOpen ? "text-apple-black bg-apple-offWhite font-semibold" : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite")}>
                        <div className="flex items-center gap-3"><item.icon size={18} className={cn(isChildActive || isOpen ? "text-orange-500" : "text-apple-muted group-hover:text-apple-dark")} />{item.title}</div>
                        {isOpen ? <ChevronDown size={14} className="text-apple-muted" /> : <ChevronRight size={14} className="text-apple-muted" />}
                      </button>
                    ) : (
                      <Link to={item.path!} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group", isActive ? "bg-orange-500/10 text-orange-600 font-semibold" : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite")}>
                        <item.icon size={18} className={cn(isActive ? "text-orange-500" : "text-apple-muted group-hover:text-apple-dark")} />{item.title}
                      </Link>
                    )}
                    {hasSubmenus && isOpen && (
                      <div className="mt-1 mb-2 ml-4 pl-4 border-l border-apple-border space-y-1">
                        {item.submenus!.map(sub => {
                          const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + '/');
                          return <Link key={sub.path} to={sub.path} className={cn("block px-3 py-2 rounded-lg text-xs font-medium transition-all", isSubActive ? "bg-orange-500/10 text-orange-600 font-semibold" : "text-apple-muted hover:text-apple-black hover:bg-apple-light")}>{sub.label}</Link>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {['Admin', 'Financeiro', 'Contador'].includes(systemRole) && (
                <div className="pt-4 mt-4 border-t border-apple-border">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest px-3 mb-2">Fintech</p>
                  <Link to="/conta-swipy" className={cn("flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group border", location.pathname === "/conta-swipy" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold" : "bg-apple-offWhite border-apple-border text-apple-dark hover:bg-apple-light")}><Wallet size={18} className="text-emerald-500" /><span>Swipy Conta</span></Link>
                </div>
              )}
            </nav>

            {isAdmin && (
              <nav className="space-y-1 pt-4 border-t border-apple-border">
                <p className="text-[10px] font-bold text-orange-500/70 uppercase tracking-widest px-3 mb-2">Administração Global</p>
                {adminItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return <Link key={item.path} to={item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group", isActive ? "bg-orange-500/10 text-orange-600 font-semibold" : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite")}><item.icon size={18} className={isActive ? "text-orange-500" : "text-apple-muted group-hover:text-apple-dark"} />{item.label}</Link>;
                })}
              </nav>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-apple-border bg-apple-offWhite">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-apple-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full group"><LogOut size={18} className="text-apple-muted group-hover:text-red-500" />Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-apple-light relative z-0">
        {activeMerchant && (
           <div className="bg-orange-500 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-sm z-30 relative">
              <div className="flex items-center gap-3"><ShieldCheck className="text-white" size={18} /><p className="text-white text-xs font-bold uppercase tracking-widest">Visualizando: <span className="underline">{activeMerchant.company || activeMerchant.full_name}</span></p></div>
              <button onClick={() => { setActiveMerchant(null); navigate('/contador'); }} className="flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold hover:bg-white/30 transition-all uppercase tracking-tighter"><XCircle size={14} className="hidden sm:block"/> Sair</button>
           </div>
        )}

        <header className="h-16 border-b border-apple-border flex items-center justify-between px-4 md:px-8 bg-apple-white/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 text-apple-muted hover:text-orange-500 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="text-sm font-medium text-apple-muted hidden sm:block">Olá, <span className="text-apple-black font-semibold">{profile?.company || profile?.full_name || 'Usuário'}</span><span className="ml-3 text-[10px] bg-apple-offWhite border border-apple-border text-apple-dark px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">{systemRole}</span></h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-apple-muted hover:text-orange-500 transition-colors bg-apple-white rounded-full border border-apple-border shadow-sm focus:outline-none">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}

            <DropdownMenu onOpenChange={(open) => open && setHasNew(false)}>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-apple-muted hover:text-orange-500 transition-colors relative focus:outline-none bg-apple-white rounded-full border border-apple-border shadow-sm">
                  <Bell size={18} />
                  {hasNew && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-apple-white border-apple-border text-apple-black p-2 shadow-lg rounded-2xl z-50">
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-apple-muted px-2 py-3">Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-apple-border" />
                {notifications.length === 0 ? <div className="p-8 text-center text-xs text-apple-muted italic">Nenhuma notificação recente.</div> : notifications.map(n => (
                  <DropdownMenuItem key={n.id} className="focus:bg-apple-light rounded-xl p-3 flex items-start gap-3 cursor-pointer"><div className="mt-1 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><CheckCircle2 size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-bold text-apple-black">{n.title}</p><p className="text-xs text-apple-muted leading-snug">{n.message}</p><p className="text-[10px] text-apple-muted mt-1 font-mono">{n.time}</p></div></DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-9 h-9 rounded-full bg-apple-light border border-apple-border flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" className="w-full h-full" />
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AppLayout;