"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Mail, MessageCircle, Settings2, Plus, GripVertical, CheckCircle, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const triggers = [
  { day: 'D-3', title: 'Lembrete de Vencimento', channel: 'E-mail', status: true, msg: 'Olá {{nome}}, sua fatura vence em 3 dias...' },
  { day: 'D0', title: 'Aviso de Vencimento Hoje', channel: 'WhatsApp', status: true, msg: 'Bom dia! Sua fatura Swipy vence hoje. Acesse o link...' },
  { day: 'D+1', title: 'Primeiro Aviso de Atraso', channel: 'E-mail', status: true, msg: 'Notamos que seu pagamento ainda não foi identificado...' },
  { day: 'D+5', title: 'Aviso de Suspensão Próxima', channel: 'WhatsApp', status: true, msg: 'Atenção: Seu acesso poderá ser suspenso em breve...' },
  { day: 'D+10', title: 'Bloqueio Automático', channel: 'Sistema', status: false, msg: 'Acesso bloqueado por falta de pagamento.' },
];

const Automation = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança</h2>
            <p className="text-zinc-400 mt-1">Configure automações inteligentes para reduzir a inadimplência.</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
            <span className="text-xs text-zinc-500 px-3 font-medium uppercase tracking-wider">Status Global</span>
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle size={14} />
              <span className="text-xs font-bold">ATIVA</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Configs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-500" /> Canais Ativos
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-zinc-500" />
                    <span className="text-sm text-zinc-300">E-mail</span>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={16} className="text-zinc-500" />
                    <span className="text-sm text-zinc-300">WhatsApp</span>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Smartphone size={16} className="text-zinc-500" />
                    <span className="text-sm text-zinc-300">SMS</span>
                  </div>
                  <Switch checked={false} />
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-emerald-400 mb-2">Dica Pro</h4>
              <p className="text-xs text-emerald-200/60 leading-relaxed">
                Empresas que utilizam lembretes D-3 via WhatsApp reduzem a inadimplência em até 15%.
              </p>
            </div>
          </div>

          {/* Timeline Area */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Fluxo de Notificações</h3>
              <button className="text-emerald-500 text-sm font-medium flex items-center gap-1 hover:text-emerald-400 transition-all">
                <Plus size={16} /> Adicionar gatilho
              </button>
            </div>

            {triggers.map((trigger, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-6 group hover:border-zinc-700 transition-all">
                <div className="cursor-grab text-zinc-700 group-hover:text-zinc-500 transition-colors">
                  <GripVertical size={20} />
                </div>
                
                <div className="w-16 h-12 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center font-bold text-emerald-500 shadow-inner">
                  {trigger.day}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-zinc-200">{trigger.title}</h4>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 uppercase font-bold border border-zinc-700">{trigger.channel}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 truncate max-w-md">{trigger.msg}</p>
                </div>

                <div className="flex items-center gap-4">
                  <button className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
                    <Settings2 size={18} />
                  </button>
                  <Switch checked={trigger.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Automation;