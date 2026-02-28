"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Mail, MessageCircle, Settings2, Plus, GripVertical, CheckCircle, Smartphone, Send, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const initialTriggers = [
  { id: 1, day: 'D-3', title: 'Lembrete de Vencimento', channel: 'E-mail', status: true, msg: 'Olá {{nome}}, sua fatura vence em 3 dias...', template: 'vencimento_proximo' },
  { id: 2, day: 'D0', title: 'Aviso de Vencimento Hoje', channel: 'WhatsApp', status: true, msg: 'Bom dia! Sua fatura Swipy vence hoje. Acesse o link...', template: 'cobranca_vencendo_hoje' },
  { id: 3, day: 'D+1', title: 'Primeiro Aviso de Atraso', channel: 'E-mail', status: true, msg: 'Notamos que seu pagamento ainda não foi identificado...', template: 'aviso_atraso' },
  { id: 4, day: 'D+5', title: 'Aviso de Suspensão Próxima', channel: 'WhatsApp', status: true, msg: 'Atenção: Seu acesso poderá ser suspenso em breve...', template: 'suspenso_em_breve' },
];

const Automation = () => {
  const [sending, setSending] = useState<number | null>(null);

  const handleTestWhatsApp = async (trigger: any) => {
    if (trigger.channel !== 'WhatsApp') return;
    
    setSending(trigger.id);
    try {
      // Simulação de variáveis para o template da Meta
      // Na vida real, buscaríamos o último cliente ou pediríamos um número de teste
      const testPhone = prompt("Insira um número de telefone com DDD para teste (ex: 11999999999):");
      if (!testPhone) return;

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: testPhone,
          templateName: trigger.template,
          variables: ["Cliente de Teste", "R$ 150,00", "https://swipy.com/pay/123"]
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao enviar teste");

      showSuccess(`WhatsApp enviado com sucesso para ${testPhone}!`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança</h2>
            <p className="text-zinc-400 mt-1">Configure automações inteligentes usando o número oficial da plataforma.</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
            <span className="text-xs text-zinc-500 px-3 font-medium uppercase tracking-wider">Status Central</span>
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle size={14} />
              <span className="text-xs font-bold">CONECTADO</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                <Smartphone size={18} className="text-orange-500" /> Canais Habilitados
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-zinc-500" />
                    <span className="text-sm text-zinc-300">E-mail Corporativo</span>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={16} className="text-emerald-500" />
                    <span className="text-sm text-zinc-300">WhatsApp Oficial</span>
                  </div>
                  <Switch checked={true} />
                </div>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-orange-400 mb-2">Configuração Global</h4>
              <p className="text-xs text-orange-200/60 leading-relaxed">
                As mensagens são enviadas via API Oficial (Meta). Certifique-se de que os nomes dos templates batem com os aprovados no seu Gerenciador de Negócios.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Gatilhos da Régua</h3>
              <button className="text-orange-500 text-sm font-medium flex items-center gap-1 hover:text-orange-400 transition-all">
                <Plus size={16} /> Novo gatilho
              </button>
            </div>

            {initialTriggers.map((trigger) => (
              <div key={trigger.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-6 group hover:border-zinc-700 transition-all">
                <div className="cursor-grab text-zinc-700 group-hover:text-zinc-500 transition-colors">
                  <GripVertical size={20} />
                </div>
                
                <div className="w-16 h-12 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center font-bold text-orange-500 shadow-inner">
                  {trigger.day}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-zinc-200">{trigger.title}</h4>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded font-bold uppercase border",
                      trigger.channel === 'WhatsApp' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    )}>
                      {trigger.channel}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 truncate max-w-md">Template: <span className="font-mono text-orange-500/70">{trigger.template}</span></p>
                </div>

                <div className="flex items-center gap-4">
                  {trigger.channel === 'WhatsApp' && (
                    <button 
                      onClick={() => handleTestWhatsApp(trigger)}
                      disabled={sending === trigger.id}
                      className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase"
                    >
                      {sending === trigger.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Testar
                    </button>
                  )}
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