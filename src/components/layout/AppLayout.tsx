"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, LogOut, Bell, UserCog, BarChart3, MessagesSquare, CheckCircle2, Palette, ShoppingCart,
  Package, Landmark, Contact, ChevronDown, ChevronRight, Wallet, Factory, Zap, GraduationCap, XCircle, ShieldCheck,
  Moon, Sun, Menu, X, FileText
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

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, systemRole, activeMerchant, setActiveMerchant } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [profile, setProfile] = useState<any>(null);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data));
    }
  }, [user]);

  const toggleMenu = (title: string) => setOpenMenus(prev => prev.includes(title) ? prev.filter(m => m !== title) : [...prev, title]);
  const handleLogout = async () => { await signOut(); navigate('/login'); };
  const visibleMenus = menuStructure.filter(menu => menu.roles.includes(systemRole));

  return (
    <div className="flex h-screen bg-apple-light text-apple-black overflow-hidden relative font-sans">
      
      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR (DRAWER NO MOBILE) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[110] w-72 border-r border-apple-border flex flex-col bg-apple-white transition-transform duration-300 lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-swipy.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold tracking-tighter">Swipy</span>
          </Link>
          <button className="lg:hidden p-2 text-apple-muted" onClick={() => setIsMobileMenuOpen(false)}>
             <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-10">
          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest px-3 mb-3">Menu</p>
            {visibleMenus.map((item) => {
              const hasSubmenus = !!item.submenus;
              const isOpen = openMenus.includes(item.title);
              const isChildActive = hasSubmenus && item.submenus!.some(sub => location.pathname === sub.path);

              return (
                <div key={item.title} className="mb-1">
                  {hasSubmenus ? (
                    <button onClick={() => toggleMenu(item.title)} className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all", isChildActive || isOpen ? "text-apple-black bg-apple-offWhite font-semibold" : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite")}>
                      <div className="flex items-center gap-3"><item.icon size={18} className={cn(isChildActive || isOpen ? "text-orange-500" : "text-apple-muted")} />{item.title}</div>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : (
                    <Link to={item.path!} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", location.pathname === item.path ? "bg-orange-500/10 text-orange-600 font-semibold" : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite")}>
                      <item.icon size={18} className={cn(location.pathname === item.path ? "text-orange-500" : "text-apple-muted")} />{item.title}
                    </Link>
                  )}
                  {hasSubmenus && isOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l border-apple-border space-y-1">
                      {item.submenus!.map(sub => (
                        <Link key={sub.path} to={sub.path} className={cn("block px-3 py-2 rounded-lg text-xs font-medium transition-all", location.pathname === sub.path ? "text-orange-600 font-bold" : "text-apple-muted hover:text-apple-black")}>{sub.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-apple-border bg-apple-offWhite">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-apple-muted hover:text-red-500 w-full transition-colors"><LogOut size={18} />Sair</button>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeMerchant && (
           <div className="bg-orange-500 px-6 py-2 flex items-center justify-between z-50">
              <p className="text-white text-[10px] font-bold uppercase tracking-widest">Visualizando: {activeMerchant.company}</p>
              <button onClick={() => { setActiveMerchant(null); navigate('/contador'); }} className="text-white text-[10px] font-black underline">SAIR</button>
           </div>
        )}

        <header className="h-16 border-b border-apple-border flex items-center justify-between px-4 md:px-8 bg-apple-white/80 backdrop-blur-md shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 text-apple-muted" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="text-sm font-bold text-apple-black hidden sm:block">{profile?.company || 'Swipy ERP'}</h1>
          </div>
          <div className="flex items-center gap-4">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-apple-muted bg-apple-white rounded-full border border-apple-border shadow-sm">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <div className="w-9 h-9 rounded-full bg-apple-light border border-apple-border overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" />
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 lg:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </section>

        {/* BOTTOM NAVIGATION (MOBILE) */}
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-apple-white/90 backdrop-blur-xl border-t border-apple-border flex items-center justify-around px-4 lg:hidden z-[90] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           <Link to="/" className={cn("flex flex-col items-center gap-1", location.pathname === "/" ? "text-orange-500" : "text-apple-muted")}>
              <LayoutDashboard size={20} />
              <span className="text-[9px] font-bold uppercase">Início</span>
           </Link>
           <Link to="/vendas/orcamentos" className={cn("flex flex-col items-center gap-1", location.pathname.includes("orcamentos") ? "text-orange-500" : "text-apple-muted")}>
              <FileText size={20} />
              <span className="text-[9px] font-bold uppercase">Propostas</span>
           </Link>
           
           {/* PDV CENTRAL */}
           <Link to="/vendas/pdv" className="relative -top-6 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/40 border-4 border-apple-light active:scale-90 transition-transform">
              <Zap size={24} fill="currentColor" />
           </Link>

           <Link to="/clientes" className={cn("flex flex-col items-center gap-1", location.pathname.includes("clientes") ? "text-orange-500" : "text-apple-muted")}>
              <Users size={20} />
              <span className="text-[9px] font-bold uppercase">Clientes</span>
           </Link>
           <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-apple-muted">
              <Menu size={20} />
              <span className="text-[9px] font-bold uppercase">Menu</span>
           </button>
        </nav>
      </main>
    </div>
  );
};

export default AppLayout;