"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, LogOut, BarChart3, ShoppingCart,
  Package, Landmark, Contact, ChevronDown, ChevronRight, Wallet, GraduationCap, ShieldCheck,
  Moon, Sun, Menu, X, Wrench,
  ReceiptText, Palette, Headset,
  Home, QrCode, Crown, Zap, Building2, Settings2,
  ArrowRightLeft
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useAuth } from '@/integrations/supabase/auth';
import { useTheme } from 'next-themes';
import NotificationBell from './NotificationBell';
import SwipyAIAssistant from './SwipyAIAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import SetupPinModal from '../dashboard/SetupPinModal';

interface SubmenuItem {
  label: string;
  path: string;
  featureId?: string;
  tag?: string;
}

interface MenuItem {
  title: string;
  icon: any;
  iconBg?: string;
  path?: string;
  moduleId?: string;
  roles: string[];
  requireSuperAdmin?: boolean;
  submenus?: SubmenuItem[];
}

interface MenuSection {
  sectionTitle: string;
  sectionIcon: any;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    sectionTitle: 'Conta Digital',
    sectionIcon: Wallet,
    items: [
      { title: 'Minha Conta', icon: Wallet, iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600', path: '/', roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Estoque', 'Contador'] },
    ]
  },
  {
    sectionTitle: 'Gestão',
    sectionIcon: Building2,
    items: [
      { title: 'Visão Geral', icon: LayoutDashboard, iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600', path: '/visao-geral', roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Estoque', 'Contador'] },
      { 
        title: 'Vendas', moduleId: 'vendas', icon: ShoppingCart, iconBg: 'bg-gradient-to-br from-pink-400 to-rose-600',
        roles: ['Admin', 'Vendas', 'Contador'], 
        submenus: [
          { label: 'Dashboard de Vendas', path: '/vendas/dashboard', featureId: 'vendas_dashboard' }, 
          { label: 'Gestão de Vendas', path: '/vendas/lista', featureId: 'vendas_lista' }, 
          { label: 'Orçamentos', path: '/vendas/orcamentos', featureId: 'vendas_orcamentos' }, 
          { label: 'PDV', path: '/vendas/pdv', featureId: 'vendas_pdv' }
        ] 
      },
      { 
        title: 'Serviços', moduleId: 'servicos', icon: Wrench, iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
        roles: ['Admin', 'Vendas', 'Contador'], 
        submenus: [
          { label: 'Ordens de Serviço', path: '/servicos/ordens-servico', featureId: 'servicos_os' },
          { label: 'Agendamentos', path: '/servicos/agendamentos', featureId: 'servicos_agendamentos' }, 
          { label: 'Cadastro', path: '/servicos/cadastro', featureId: 'servicos_cadastro' }, 
          { label: 'Orçamentos', path: '/servicos/orcamentos', featureId: 'servicos_orcamentos' }
        ] 
      },
      { 
        title: 'Financeiro', moduleId: 'financeiro', icon: Landmark, iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
        roles: ['Admin', 'Financeiro', 'Contador'], 
        submenus: [
          { label: 'Dashboard', path: '/financeiro/dashboard', featureId: 'financeiro_dashboard' },
          { label: 'Fluxo de Caixa', path: '/financeiro/transacoes', featureId: 'financeiro_transacoes' },
          { label: 'Conciliação', path: '/financeiro/conciliacao', featureId: 'financeiro_conciliacao' },
          { label: 'Contas a Receber', path: '/financeiro/cobrancas', featureId: 'financeiro_cobrancas' },
          { label: 'Contas a Pagar', path: '/financeiro/pagar', featureId: 'financeiro_pagar' },
          { label: 'Contratos', path: '/financeiro/contratos', featureId: 'financeiro_contratos' },
          { label: 'Contas Bancárias', path: '/financeiro/bancos', featureId: 'financeiro_bancos' },
          { label: 'Plano de Contas', path: '/financeiro/plano-contas', featureId: 'financeiro_plano_contas' }
        ] 
      },
      { 
        title: 'Fiscal', moduleId: 'fiscal', icon: ReceiptText, iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
        roles: ['Admin', 'Financeiro', 'Contador'], 
        submenus: [
          { label: 'NFe/NFSe', path: '/financeiro/fiscal', featureId: 'fiscal_nfe' },
          { label: 'Arquivos Fiscais', path: '/financeiro/arquivos', featureId: 'fiscal_arquivos' },
          { label: 'DRE Contábil', path: '/financeiro/dre', featureId: 'fiscal_dre' }
        ] 
      },
      { 
        title: 'Armazém', moduleId: 'estoque', icon: Package, iconBg: 'bg-gradient-to-br from-cyan-400 to-sky-600',
        roles: ['Admin', 'Estoque', 'Vendas', 'Contador'], 
        submenus: [
          { label: 'Produtos', path: '/estoque/produtos', featureId: 'estoque_produtos' }, 
          { label: 'Movimentações', path: '/estoque/movimentacoes', featureId: 'estoque_movimentacoes' },
          { label: 'Produção', path: '/industria/producao', featureId: 'industria_producao' },
          { label: 'Expedição', path: '/estoque/expedicao', featureId: 'estoque_expedicao' }
        ] 
      },
      { 
        title: 'Gente & Gestão', moduleId: 'rh', icon: Users, iconBg: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
        roles: ['Admin', 'RH', 'Contador'], 
        submenus: [
          { label: 'People Analytics', path: '/rh/dashboard', featureId: 'rh_analytics' },
          { label: 'Colaboradores', path: '/rh/colaboradores', featureId: 'rh_colaboradores' }, 
          { label: 'Folha Gerencial', path: '/rh/folha', featureId: 'rh_folha' },
          { label: 'Férias', path: '/rh/ferias', featureId: 'rh_ferias' },
          { label: 'Swipy Card', path: '/rh/beneficios', tag: 'BREVE', featureId: 'rh_beneficios' }
        ] 
      },
    ]
  },
  {
    sectionTitle: 'Sistema',
    sectionIcon: Settings2,
    items: [
      { 
        title: 'Cadastros', icon: Contact, iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
        roles: ['Admin', 'Vendas', 'Financeiro', 'RH', 'Contador'], 
        submenus: [
          { label: 'Clientes', path: '/clientes' }, 
          { label: 'Fornecedores', path: '/fornecedores' }
        ] 
      },
      { 
        title: 'Personalização', moduleId: 'personalizacao', icon: Palette, iconBg: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
        roles: ['Admin'],
        submenus: [
          { label: 'Perfil & Marca', path: '/configuracoes', featureId: 'configuracoes_perfil' },
          { label: 'Integrações', path: '/configuracoes/integracoes', featureId: 'configuracoes_integracoes' }
        ]
      },
      { title: 'Minha Carteira', icon: GraduationCap, iconBg: 'bg-gradient-to-br from-teal-400 to-teal-600', path: '/contador', roles: ['Contador'] },
      { 
        title: 'Admin SaaS', icon: ShieldCheck, iconBg: 'bg-gradient-to-br from-red-400 to-red-600',
        roles: ['Admin'], requireSuperAdmin: true,
        submenus: [
          { label: 'Visão Global', path: '/admin/dashboard' }, 
          { label: 'Benchmarks', path: '/admin/benchmarks' },
          { label: 'Lojistas', path: '/admin/usuarios' }, 
          { label: 'CRM Global', path: '/admin/crm' },
          { label: 'Comunicação', path: '/admin/comunicacao' },
          { label: 'Auditoria', path: '/admin/auditoria' },
          { label: 'Planos', path: '/admin/planos' }, 
          { label: 'Automação', path: '/admin/automacao' }
        ] 
      }
    ]
  }
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, systemRole, isAdmin, profile, activeMerchant, setActiveMerchant, refreshProfile } = useAuth();
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
  
  const activePlanFeatures = activeMerchant ? (activeMerchant.system_plans?.features || []) : (profile?.system_plans?.features || []);
  const isSuperAdmin = profile?.is_admin && !activeMerchant;
  const hasAIAssistant = activePlanFeatures.includes('ai_assistant') || isSuperAdmin;
  const hasVipSupport = activePlanFeatures.includes('suporte_vip') || isSuperAdmin;

  const planName = activeMerchant?.system_plans?.name || profile?.system_plans?.name || 'Free';

  const filterMenuItem = (menu: MenuItem) => {
    if (menu.requireSuperAdmin && !isAdmin) return null;
    if (!menu.roles.includes(systemRole)) return null;
    
    if (menu.moduleId && !isAdmin) {
       const hasParent = activePlanFeatures.includes(menu.moduleId);
       const hasAnySub = menu.submenus?.some(sub => sub.featureId && activePlanFeatures.includes(sub.featureId));
       if (!hasParent && !hasAnySub) return null;
       if (!hasParent && menu.submenus) {
          const filteredSubs = menu.submenus.filter(sub => !sub.featureId || activePlanFeatures.includes(sub.featureId));
          return { ...menu, submenus: filteredSubs };
       }
    }
    return menu;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="flex h-screen w-full bg-apple-light text-apple-black overflow-hidden relative font-sans">
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[110] w-[280px] flex flex-col bg-apple-white transition-transform duration-300 lg:relative lg:translate-x-0 border-r border-apple-border",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* LOGO + CLOSE */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-swipy.png" alt="Logo" className="w-9 h-9 object-contain rounded-xl shadow-lg shadow-orange-500/20" />
            <span className="text-lg font-black tracking-tight text-apple-black">Swipy</span>
          </Link>
          <button className="lg:hidden p-2 text-apple-muted hover:text-apple-black rounded-xl hover:bg-apple-offWhite transition-all" onClick={() => setIsMobileMenuOpen(false)}>
             <X size={18} />
          </button>
        </div>

        {/* USER PROFILE CARD */}
        <div className="mx-4 mb-4 p-3.5 bg-gradient-to-br from-apple-offWhite to-apple-light rounded-2xl border border-apple-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-apple-white border border-apple-border overflow-hidden shadow-sm shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-apple-black truncate">{profile?.company || 'Minha Empresa'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Crown size={10} className="text-orange-500" />
                <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">{planName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar pb-6">
          <nav className="space-y-5">
            {menuSections.map((section) => {
              const visibleItems = section.items.map(filterMenuItem).filter(Boolean) as MenuItem[];
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.sectionTitle}>
                  {/* Section Header */}
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <section.sectionIcon size={12} className="text-apple-muted" />
                    <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">{section.sectionTitle}</p>
                  </div>

                  {/* Section Items */}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const hasSubmenus = !!item.submenus && item.submenus.length > 0;
                      const isOpen = openMenus.includes(item.title);
                      const isActive = item.path === location.pathname;
                      const isChildActive = hasSubmenus && item.submenus!.some(sub => location.pathname === sub.path);

                      return (
                        <div key={item.title}>
                          {hasSubmenus ? (
                            <button 
                              onClick={() => toggleMenu(item.title)} 
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all group",
                                (isChildActive || isOpen) 
                                  ? "text-apple-black bg-apple-offWhite" 
                                  : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite/60"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                  (isChildActive || isOpen) ? item.iconBg : "bg-apple-offWhite group-hover:bg-apple-light"
                                )}>
                                  <item.icon size={14} className={cn((isChildActive || isOpen) ? "text-white" : "text-apple-muted")} />
                                </div>
                                {item.title}
                              </div>
                              <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")} />
                            </button>
                          ) : (
                            <Link 
                              to={item.path!} 
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all group",
                                isActive 
                                  ? "text-apple-black bg-apple-offWhite" 
                                  : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite/60"
                              )}
                            >
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                isActive ? item.iconBg : "bg-apple-offWhite group-hover:bg-apple-light"
                              )}>
                                <item.icon size={14} className={cn(isActive ? "text-white" : "text-apple-muted")} />
                              </div>
                              {item.title}
                            </Link>
                          )}

                          {/* Submenus */}
                          <AnimatePresence>
                            {hasSubmenus && isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-[22px] pl-3 border-l-2 border-apple-border/60 space-y-0.5 py-1.5">
                                  {item.submenus!.map(sub => (
                                    <Link 
                                      key={sub.path} 
                                      to={sub.path} 
                                      className={cn(
                                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", 
                                        location.pathname === sub.path 
                                          ? "text-orange-600 font-bold bg-orange-50/50" 
                                          : "text-apple-muted hover:text-apple-black hover:bg-apple-offWhite/50"
                                      )}
                                    >
                                      {sub.label}
                                      {sub.tag && (
                                        <span className="text-[7px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{sub.tag}</span>
                                      )}
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-apple-border">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-apple-muted hover:text-red-500 w-full transition-all rounded-xl hover:bg-red-50/50 group"
          >
            <div className="w-7 h-7 rounded-lg bg-apple-offWhite flex items-center justify-center group-hover:bg-red-100 transition-all">
              <LogOut size={14} className="group-hover:text-red-500 transition-colors" />
            </div>
            Sair da conta
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full h-full">
        {/* Admin merchant banner */}
        {activeMerchant && (
           <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2 flex items-center justify-between z-[60] shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-white" />
                <p className="text-white text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px]">
                  Sessão: {activeMerchant.company}
                </p>
              </div>
              <button onClick={() => { setActiveMerchant(null); navigate(isAdmin ? '/admin/usuarios' : '/contador'); }} className="text-white text-[9px] font-black underline bg-white/10 px-2 py-1 rounded-md hover:bg-white/20 transition-all">ENCERRAR</button>
           </div>
        )}

        {/* TOP HEADER */}
        <header className="h-[60px] border-b border-apple-border flex items-center justify-between px-4 md:px-6 bg-apple-white/80 backdrop-blur-md shrink-0 z-40">
          <div className="flex items-center gap-3 overflow-hidden">
            <button className="lg:hidden p-2 text-apple-muted -ml-2 hover:bg-apple-offWhite rounded-xl transition-all" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-apple-black truncate">
                {getGreeting()}, <span className="text-orange-500">{profile?.company || 'Swipy'}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasVipSupport && (
              <a 
                href="https://wa.me/553431994356?text=Olá,%20gostaria%20de%20falar%20com%20o%20gestor%20da%20Swipy." 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95 group text-[10px] font-bold uppercase tracking-widest"
              >
                <Headset size={16} className="group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Gestor</span>
              </a>
            )}
            <NotificationBell />
            {mounted && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                className="p-2 text-apple-muted bg-apple-offWhite rounded-xl border border-apple-border shadow-sm hover:bg-apple-light transition-all"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <Link to="/configuracoes" className="w-8 h-8 rounded-xl bg-apple-offWhite border border-apple-border overflow-hidden shadow-sm hover:ring-2 hover:ring-orange-500/30 transition-all">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" className="w-full h-full object-cover" />
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <section className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-32 lg:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </section>

        {/* BOTTOM NAVIGATION (MOBILE) */}
        <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-apple-white/95 backdrop-blur-2xl border-t border-apple-border flex items-center justify-around px-2 lg:hidden z-[90] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
           <Link to="/" className={cn("flex flex-col items-center gap-1 py-1 px-3", location.pathname === "/" ? "text-orange-500" : "text-apple-muted")}>
              <Home size={20} />
              <span className="text-[9px] font-black uppercase">Início</span>
           </Link>
           <Link to="/financeiro/cobrancas" className={cn("flex flex-col items-center gap-1 py-1 px-3", location.pathname.includes("cobrancas") ? "text-orange-500" : "text-apple-muted")}>
              <QrCode size={20} />
              <span className="text-[9px] font-black uppercase">Cobrar</span>
           </Link>
           
           <Link to="/" className="relative -top-5 w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] border-4 border-apple-white active:scale-90 transition-all">
              <Wallet size={24} />
           </Link>

           <Link to="/financeiro/dashboard" className={cn("flex flex-col items-center gap-1 py-1 px-3", location.pathname.includes("financeiro/dashboard") ? "text-orange-500" : "text-apple-muted")}>
              <BarChart3 size={20} />
              <span className="text-[9px] font-black uppercase">Finanças</span>
           </Link>
           
           <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 py-1 px-3 text-apple-muted">
              <Menu size={20} />
              <span className="text-[9px] font-black uppercase">Menu</span>
           </button>
        </nav>

        {/* SWIPY AI ASSISTANT */}
        {hasAIAssistant && <SwipyAIAssistant />}

        {profile?.status === 'active' && !profile?.transaction_pin && (
          <SetupPinModal 
            isOpen={true} 
            onClose={() => {}} 
            onSuccess={refreshProfile} 
            userId={user?.id || ''} 
          />
        )}
      </main>
    </div>
  );
};

export default AppLayout;