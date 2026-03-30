"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { CreditCard, Zap, Smartphone, ShieldCheck, ArrowRight, Construction } from 'lucide-react';
import { cn } from "@/lib/utils";

const BenefitsManagement = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center animate-in fade-in zoom-in duration-700">
        
        <div className="w-24 h-24 bg-orange-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-orange-500/20 shadow-xl shadow-orange-500/5">
          <CreditCard size={48} className="text-orange-500" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 border border-orange-100 rounded-full mb-6">
           <Zap size={14} className="text-orange-500 animate-pulse" />
           <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Parceria Vale Presente</span>
        </div>

        <h2 className="text-4xl font-black text-apple-black tracking-tighter mb-4 leading-tight">
          Swipy Card Benefícios.<br/>
          <span className="text-orange-500">Em desenvolvimento.</span>
        </h2>
        
        <p className="text-apple-muted font-medium text-lg mb-12">
          Estamos finalizando a integração com a **Vale Presente** para permitir que você recarregue VR, VA e prêmios dos seus colaboradores diretamente pelo saldo da sua conta Swipy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
           <div className="p-6 bg-apple-white border border-apple-border rounded-3xl text-left">
              <div className="w-10 h-10 bg-apple-offWhite rounded-xl flex items-center justify-center mb-4 text-emerald-500"><ShieldCheck size={24} /></div>
              <p className="font-bold text-apple-black">Totalmente Seguro</p>
              <p className="text-xs text-apple-muted mt-1">Homologado pela bandeira Mastercard®.</p>
           </div>
           <div className="p-6 bg-apple-white border border-apple-border rounded-3xl text-left">
              <div className="w-10 h-10 bg-apple-offWhite rounded-xl flex items-center justify-center mb-4 text-blue-500"><Smartphone size={24} /></div>
              <p className="font-bold text-apple-black">App Colaborador</p>
              <p className="text-xs text-apple-muted mt-1">Seu time consulta saldo e extrato pelo celular.</p>
           </div>
        </div>

        <div className="mt-12 p-6 border-t border-apple-border w-full flex items-center justify-center gap-3 opacity-50">
           <Construction size={18} className="text-apple-muted" />
           <p className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em]">Disponível na próxima atualização</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default BenefitsManagement;