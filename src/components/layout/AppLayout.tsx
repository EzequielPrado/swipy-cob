"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Receipt, 
  Zap, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Receipt, label: 'Cobranças', path: '/cobrancas' },
  { icon: CreditCard, label: 'Planos', path: '/planos' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Zap, label: 'Régua de Cobrança', path: '/automacao' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-950 shadow-lg shadow-orange-500/20">S</div>
            <span className="text-xl font-bold tracking-tight">swipy <span className="text-orange-500">cob</span></span>
          </div>
          
          <nav className="space-y-1">
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
        </div>

        <div className="mt-auto p-6 border-t border-zinc-800">
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/30">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-zinc-400">Olá, <span className="text-zinc-100 font-semibold">Empresa XPTO</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-orange-400 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-zinc-900"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" />
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