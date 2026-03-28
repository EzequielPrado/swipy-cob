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
  { title: 'Vendas', moduleId: 'vendas', icon: ShoppingCart, roles: ['Admin', 'Vendas', 'Contador'], submenus: [{ label: 'Dashboard de Vendas', path: '/vendas/dashboard' }, { label: 'Gestão de Vendas', path: '/vendas/lista' }, { label: 'Orçamentos', path: '/vendas/orcamentos' }, { label: 'Frente de Caixa (PDV)', path: '/vendas/pdv' }] },
  { title: 'Indústria', moduleId: 'industria', icon: Factory, roles: ['Admin', 'Estoque'], submenus: [{ label: 'Controle de Produção', path: '/industria/producao' }] },
  { title: 'Estoque', moduleId: 'estoque', icon: Package, roles: ['Admin', 'Estoque', 'Vendas', 'Contador'], submenus: [{ label: 'Produtos', path: '/estoque/produtos' }, { label: 'Movimentações', path: '/estoque/movimentacoes' }] },
  { title: 'Financeiro', moduleId: 'financeiro', icon: Landmark, roles: ['Admin', 'Financeiro', 'Contador'], submenus: [{ label: 'Dashboard Financeiro', path: '/financeiro/dashboard' }, { label: 'Contas a Receber', path: '/financeiro/cobrancas' }, { label: 'Assinaturas', path: '/financeiro/assinaturas' }, { label: 'Contas a Pagar', path: '/financeiro/pagar' }, { label: 'Contas Bancárias', path: '/financeiro/bancos' }, { label: 'DRE Contábil', path: '/financeiro/dre' }, { label: 'Fiscal (NFe/NFSe)', path: '/financeiro/fiscal' }] },
  { title: 'Gente e Gestão', moduleId: 'rh', icon: Users, roles: ['Admin', 'RH', 'Contador'], submenus: [{ label: 'Colaboradores', path: '/rh/colaboradores' }, { label: 'Folha Gerencial', path: '/rh/folha' }] },
  { title: 'Cadastros', icon: Contact, roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Contador'], submenus: [{ label: 'Clientes', path: '/clientes' }, { label: 'Fornecedores', path: '/fornecedores' }] },
  { title: 'Personalização', icon: Palette, path: '/configuracoes', roles: ['Admin'] },
  { 
    title: 'Administração SaaS', 
    icon: ShieldCheck, 
    roles: ['Admin'], 
    requireSuperAdmin: true,
    submenus: [
      { label: 'Visão Global', path: '/admin/dashboard' }, 
      { label: 'Lojistas', path: '/admin/usuarios' }, 
      { label: 'Planos', path: '/admin/planos' }, 
      { label: 'Automação Global', path: '/admin/automacao' }
    ] 
  }
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, systemRole, isAdmin, profile, activeMerchant, setActiveMerchant } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = (title: string) => setOpenMenus(prev => prev.includes(title) ? prev.filter(m => m !== title) : [...prev, title]);
  
  const handleLogout = async () => { 
    await signOut(); 
    navigate('/login'); 
  };
  
  // Determina as features/módulos baseados em quem está sendo visualizado (O próprio usuário ou a empresa que o contador está auditando)
  const activePlanFeatures = activeMerchant ? (activeMerchant.system_plans?.features || []) : (profile?.system_plans?.features || []);

  const visibleMenus = menuStructure.filter(menu => {
    // Esconder painel super admin se não for admin
    if (menu.requireSuperAdmin && !isAdmin) return false;
    
    // Validar RBAC interno da empresa (Vendedor não vê finanças, etc)
    if (!menu.roles.includes(systemRole)) return false;

    // Se o menu exige um módulo de plano (ex: industria, financeiro)
    // Administradores Master do SaaS sempre veem tudo na sua conta, 
    // mas se o menu exige módulo, ocultamos caso o plano atual não tenha.
    if (menu.moduleId && !isAdmin) {
       if (!activePlanFeatures.includes(menu.moduleId)) {
         return false;
       }
    }

    return true;
  });

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
            <span className="text-xl font-bold tracking-tighter text-apple-black">Swipy</span>
          </Link>
          <button className="lg:hidden p-2 text-apple-muted" onClick={() => setIsMobileMenuOpen(false)}>
             <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-10">
          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest px-3 mb-3">Menu Principal</p>
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
                    <div className="mt-1 ml-4 pl-4 border-l border-apple-border space-y-1 animate-in slide-in-from-top-1 duration-200">
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
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-apple-muted hover:text-red-500 w-full transition-colors"><LogOut size={18} />Sair do sistema</button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Banner de Contador Ativo */}
        {activeMerchant && (
           <div className="bg-orange-500 px-6 py-2.5 flex items-center justify-between z-[60] shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-white" />
                <p className="text-white text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px] sm:max-w-none">
                  Sessão Auditoria: {activeMerchant.company}
                </p>
              </div>
              <button onClick={() => { setActiveMerchant(null); navigate('/contador'); }} className="text-white text-[9px] font-black underline bg-white/10 px-2 py-1 rounded-md hover:bg-white/20 transition-colors">ENCERRAR ACESSO</button>
           </div>
        )}

        {/* Header fixo no topo */}
        <header className="h-16 border-b border-apple-border flex items-center justify-between px-4 md:px-8 bg-apple-white/80 backdrop-blur-md shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3 overflow-hidden">
            <button className="lg:hidden p-2 text-apple-muted -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="text-sm font-black text-apple-black truncate uppercase tracking-widest">
              {profile?.company || 'Swipy ERP'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-apple-muted bg-apple-offWhite rounded-xl border border-apple-border shadow-sm hover:bg-apple-light transition-all">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-apple-offWhite border border-apple-border overflow-hidden shadow-sm">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Área de Scroll do Conteúdo */}
        <section className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 lg:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </section>

        {/* BOTTOM NAVIGATION (MOBILE) */}
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-apple-white/95 backdrop-blur-2xl border-t border-apple-border flex items-center justify-around px-4 lg:hidden z-[90] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
           <Link to="/" className={cn("flex flex-col items-center gap-1.5 transition-all duration-300", location.pathname === "/" ? "text-orange-500 scale-110" : "text-apple-muted")}>
              <LayoutDashboard size={22} strokeWidth={location.pathname === "/" ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
           </Link>
           <Link to="/vendas/orcamentos" className={cn("flex flex-col items-center gap-1.5 transition-all duration-300", location.pathname.includes("orcamentos") ? "text-orange-500 scale-110" : "text-apple-muted")}>
              <FileText size={22} strokeWidth={location.pathname.includes("orcamentos") ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Propostas</span>
           </Link>
           
           {/* PDV CENTRAL - Botão de Ação Rápida */}
           <Link to="/vendas/pdv" className="relative -top-7 w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-[0_10px_25px_rgba(249,115,22,0.4)] border-4 border-apple-white active:scale-90 transition-all rotate-45">
              <div className="-rotate-45">
                <Zap size={28} fill="currentColor" />
              </div>
           </Link>

           <Link to="/clientes" className={cn("flex flex-col items-center gap-1.5 transition-all duration-300", location.pathname.includes("clientes") ? "text-orange-500 scale-110" : "text-apple-muted")}>
              <Users size={22} strokeWidth={location.pathname.includes("clientes") ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Clientes</span>
           </Link>
           <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1.5 text-apple-muted active:scale-95 transition-all">
              <Menu size={22} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
           </button>
        </nav>
      </main>
    </div>
  );
};

export default AppLayout;