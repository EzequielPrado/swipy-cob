"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Construction } from 'lucide-react';

const ComingSoon = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 border border-orange-500/20 shadow-xl shadow-orange-500/5">
          <Construction size={48} className="text-orange-500" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-4">Módulo em Desenvolvimento</h2>
        <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
          Estamos trabalhando intensamente para transformar a Swipy Fintech LTDA no seu ERP completo. 
          Esta área de gestão estará disponível nas próximas atualizações.
        </p>
      </div>
    </AppLayout>
  );
};

export default ComingSoon;