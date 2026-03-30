"use client";

import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Fingerprint, History } from 'lucide-react';
import { cn } from "@/lib/utils";

interface IntegrityIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  module: string;
  message: string;
  action: string;
}

const AuditIntegrity = () => {
  // Dados simulados para a interface de auditoria
  const issues: IntegrityIssue[] = [
    { id: '1', type: 'critical', module: 'Financeiro', message: '3 faturas vencidas há mais de 30 dias sem cobrança enviada.', action: 'Cobrar agora' },
    { id: '2', type: 'warning', module: 'Cadastro', message: '5 clientes com CPF/CNPJ incompleto ou inválido.', action: 'Corrigir' },
    { id: '3', type: 'info', module: 'Estoque', message: 'Produto "iPhone 15 Pro" atingiu o estoque mínimo.', action: 'Repor' },
  ];

  return (
    <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-8 border-b border-apple-border flex items-center justify-between bg-apple-offWhite">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl border border-apple-border flex items-center justify-center shadow-sm">
            <ShieldAlert className="text-orange-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-apple-black tracking-tight">Integridade do Sistema</h3>
            <p className="text-xs font-bold text-apple-muted uppercase tracking-widest">Auditoria em tempo real</p>
          </div>
        </div>
        <a href="/admin/auditoria" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-apple-black text-white px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-all">
          <History size={14} /> Log Completo
        </a>
      </div>

      <div className="p-4 space-y-3">
        {issues.map((issue) => (
          <div 
            key={issue.id}
            className="flex items-center gap-4 p-4 rounded-3xl border border-apple-border bg-apple-white hover:border-orange-200 transition-colors group"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              issue.type === 'critical' ? "bg-red-50 text-red-500" : 
              issue.type === 'warning' ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
            )}>
              {issue.type === 'critical' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-apple-muted">{issue.module}</span>
                <span className="w-1 h-1 rounded-full bg-apple-border" />
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  issue.type === 'critical' ? "text-red-500" : "text-orange-500"
                )}>
                  {issue.type === 'critical' ? 'Crítico' : 'Atenção'}
                </span>
              </div>
              <p className="text-sm font-bold text-apple-black truncate">{issue.message}</p>
            </div>

            <button className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {issue.action}
            </button>
          </div>
        ))}

        <div className="mt-4 p-4 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <Fingerprint size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Status de Conformidade</p>
            <p className="text-sm font-bold text-emerald-900">Banco de dados 100% otimizado e seguro.</p>
          </div>
          <CheckCircle2 className="ml-auto text-emerald-500" size={24} />
        </div>
      </div>
    </div>
  );
};

export default AuditIntegrity;