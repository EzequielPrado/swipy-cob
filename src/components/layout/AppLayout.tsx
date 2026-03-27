"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  LogOut,
  Bell,
  UserCog,
  BarChart3,
  MessagesSquare,
  CheckCircle2,
  Palette,
  ShoppingCart,
  Package,
  Landmark,
  Contact,
  ChevronDown,
  ChevronRight,
  Wallet,
  Factory,
  FileSpreadsheet
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

const ALL_MENU_ITEMS = [
  {
    title: 'Visão Geral',
    icon: LayoutDashboard,
    path: '/',
    module: 'dashboard',
    roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Estoque']
  },
  {
    title: 'Vendas',
    icon: ShoppingCart,
    module: 'sales',
    roles: ['Admin', 'Vendas'],
    submenus: [
      { label: 'Dashboard de Vendas', path: '/vendas/dashboard' },
      { label: 'Gestão de Vendas', path: '/vendas/lista' },
      { label: 'Orçamentos', path: '/vendas/orcamentos' },
      { label: 'Frente de Caixa (PDV)', path: '/vendas/pdv' },
    ]
  },
  {
    title: 'Indústria',
    icon: Factory,
    module: 'industry',
    roles: ['Admin', 'Estoque'],
    submenus: [
      { label: 'Controle de Produção', path: '/industria/producao' },
    ]
  },
  {
    title: 'Estoque',
    icon: Package,
    module: 'inventory',
    roles: ['Admin', 'Estoque', 'Vendas'],
    submenus: [
      { label: 'Produtos', path: '/estoque/produtos' },
      { label: 'Movimentações', path: '/estoque/movimentacoes' },
    ]
  },
  {
    title: 'Financeiro',
    icon: Landmark,
    module: 'financial',
    roles: ['Admin', 'Financeiro'],
    submenus: [
      { label: 'Dashboard Financeiro', path: '/financeiro/dashboard' },
      { label: 'Contas a Receber', path: '/financeiro/cobrancas' },
      { label: 'Assinaturas', path: '/financeiro/assinaturas' },
      { label: 'Contas a Pagar', path: '/financeiro/pagar' },
      { label: 'Contas Bancárias', path: '/financeiro/bancos' },
      { label: 'DRE Contábil', path: '/financeiro/dre' },
      { label: 'Fiscal (NFe/NFSe)', path: '/financeiro/fiscal' },
    ]
  },
  {
    title: 'Gente e Gestão',
    icon: Users,
    module: 'hr',
    roles: ['Admin', 'RH'],
    submenus: [
      { label: 'Colaboradores', path: '/rh/colaboradores' },
      { label: 'Folha Gerencial', path: '/rh/folha' },
      { label: 'Metas e Comissões', path: '/rh/metas' },
    ]
  },
  {
    title: 'Cadastros',
    icon: Contact,
    module: 'registrations',
    roles: ['Admin', 'Vendas', 'Financeiro', 'RH'],
    submenus: [
      { label: 'Clientes', path: '/clientes' },
      { label: 'Fornecedores', path: '/fornecedores' },
    ]
  },
  {
    title: 'Personalização',
    icon: Palette,
    path: '/configuracoes',
    module: 'personalization',
    roles: ['Admin']
  }
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, systemRole, isAdmin, profile } = useAuth();
  
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*, plans(*)').eq('id', user.id).single()
        .then(({ data }) => setFullProfile(data));
    }
  }, [user]);

  // Lógica de Permissão Modular
  const activeModules = useMemo(() => {
    if (isAdmin) return ALL_MENU_ITEMS.map(i => i.module);
    if (!fullProfile) return [];
    
    // Prioridade 1: Módulos customizados salvos no perfil
    if (fullProfile.custom_modules && Array.isArray(fullProfile.custom_modules)) {
      return fullProfile.custom_modules;
    }
    
    // Prioridade 2: Módulos padrão do plano
    return fullProfile.plans?.modules || [];
  }, [fullProfile, isAdmin]);

  const visibleMenus = ALL_MENU_ITEMS.filter(menu => {
    const hasRole = menu.roles.includes(systemRole);
    const hasModule = activeModules.includes(menu.module);
    return hasRole && hasModule;
  });

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => prev.includes(title) ? prev.filter(m => m !== title) : [...prev, title]);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <aside className="w-[280px] border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-xl shrink-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-swipy.png" alt="Swipy Logo" className="w-8 h-8 object-contain" />
            <span className="text-2xl font-bold tracking-tighter">Swipy</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-6">
          <div className="space-y-6">
            <nav className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-3">Menu Corporativo</p>
              
              {visibleMenus.map((item) => {
                const isActive = item.path ? location.pathname === item.path : false;
                const hasSubmenus = !!item.submenus;
                const isOpen = openMenus.includes(item.title);
                const isChildActive = hasSubmenus && item.submenus!.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));

                return (
                  <div key={item.title} className="mb-1">
                    {hasSubmenus ? (
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                          isChildActive || isOpen ? "text-zinc-100 bg-zinc-800/30" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={18} className={cn(isChildActive || isOpen ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                          {item.title}
                        </div>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : (
                      <Link to={item.path!} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group", isActive ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")}>
                        <item.icon size={18} className={cn(isActive ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                        {item.title}
                      </Link>
                    )}

                    {hasSubmenus && isOpen && (
                      <div className="mt-1 mb-2 ml-4 pl-4 border-l border-zinc-800 space-y-1">
                        {item.submenus!.map(sub => (
                          <Link key={sub.path} to={sub.path} className={cn("block px-3 py-2 rounded-lg text-xs font-medium transition-all", location.pathname === sub.path ? "bg-orange-500/10 text-orange-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")}>
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {activeModules.includes('swipy_account') && (
                <div className="pt-4 mt-4 border-t border-zinc-800/50">
                  <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest px-3 mb-2">Plataforma Fintech</p>
                  <Link to="/conta-swipy" className={cn("flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group border", location.pathname === "/conta-swipy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800")}>
                    <Wallet size={18} className="text-emerald-500" />
                    <span className="font-bold">Swipy Conta</span>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-zinc-800">
           <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-4">Swipy SaaS v2.0</p>
           <button onClick={() => { signOut(); navigate('/login'); }} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors w-full group">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/30 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-zinc-400">
              Empresa: <span className="text-zinc-100 font-semibold">{fullProfile?.company || '...'}</span>
              <span className="ml-3 text-[9px] bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                {fullProfile?.plans?.name || 'Carregando...'}
              </span>
            </h1>
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