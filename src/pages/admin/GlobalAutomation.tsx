"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  MessageSquare, 
  Smartphone, 
  Send, 
  Image as ImageIcon,
  ExternalLink,
  Info,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const GlobalAutomation = () => {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [triggers, setTriggers] = useState([
    { 
      id: 1, 
      day: 'D-3', 
      name: 'vencimento_proximo', 
      label: 'Lembrete de Vencimento', 
      msg: 'Olá *{{nome}}*, sua fatura de *R$ {{valor}}* vence em 3 dias. Pague aqui:',
      imageUrl: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&q=80',
      buttonText: 'Ver Fatura PIX'
    },
    { 
      id: 2, 
      day: 'D0', 
      name: 'cobranca_vencendo_hoje', 
      label: 'Aviso de Vencimento Hoje', 
      msg: 'Bom dia *{{nome}}*! Sua fatura de *R$ {{valor}}* vence hoje. Não esqueça de pagar!',
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
      buttonText: 'Pagar Agora'
    },
  ]);

  const handleSendTest = async (trigger: any) => {
    const testPhone = prompt("Insira o número de WhatsApp para teste (com DDD):");
    if (!testPhone) return;

    setLoadingId(trigger.id);
    try {
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: testPhone,
          templateName: trigger.name,
          imageUrl: trigger.imageUrl,
          variables: ["Cliente Teste", "150,00", "https://swipy.sh/pay/123"]
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro no envio");

      showSuccess(`Teste enviado para ${testPhone}!`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança Global</h2>
            <p className="text-zinc-400 mt-1">Configure os modelos com imagem e botões que serão disparados pela plataforma.</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase">WhatsApp API Conectado</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {triggers.map((t) => (
            <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
              {/* Painel de Edição */}
              <div className="p-8 flex-1 space-y-6 border-r border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="bg-orange-500 text-zinc-950 font-bold px-3 py-1 rounded-lg text-xs">
                    Gatilho: {t.day}
                  </div>
                  <button 
                    onClick={() => handleSendTest(t)}
                    disabled={loadingId === t.id}
                    className="text-emerald-400 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    {loadingId === t.id ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                    DISPARAR TESTE
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Nome na Meta</Label>
                    <Input defaultValue={t.name} className="bg-zinc-950 border-zinc-800 font-mono text-orange-400 text-xs h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">URL da Imagem (Header)</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      <Input defaultValue={t.imageUrl} className="bg-zinc-950 border-zinc-800 pl-9 text-xs h-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Texto do Botão</Label>
                    <Input defaultValue={t.buttonText} className="bg-zinc-950 border-zinc-800 text-xs h-10" />
                  </div>
                </div>
              </div>

              {/* Preview Visual (Simulador de Celular) */}
              <div className="bg-zinc-950 p-8 w-full md:w-[320px] flex items-center justify-center border-l border-zinc-800">
                <div className="w-full space-y-2">
                  <p className="text-[10px] text-zinc-600 font-bold uppercase text-center mb-4 tracking-widest">Visualização no Celular</p>
                  
                  {/* Balão WhatsApp */}
                  <div className="bg-[#1f2c33] rounded-2xl overflow-hidden shadow-xl max-w-[260px] mx-auto border border-zinc-800/50">
                    <img src={t.imageUrl} alt="Header" className="w-full h-32 object-cover opacity-90" />
                    <div className="p-3 space-y-2">
                      <p className="text-[13px] text-zinc-100 leading-relaxed">
                        {t.msg.replace('{{nome}}', 'Lucas').replace('{{valor}}', '249,90')}
                      </p>
                      <p className="text-[10px] text-zinc-500 text-right">09:41</p>
                    </div>
                    {/* Botão */}
                    <div className="border-t border-zinc-700/50 bg-[#233138] p-2.5 flex items-center justify-center gap-2 text-sky-400 text-[13px] font-medium">
                      <ExternalLink size={14} />
                      {t.buttonText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-start gap-4">
          <Info className="text-orange-500 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-zinc-500 leading-relaxed">
            <p className="font-bold text-zinc-300 mb-1">Dica de Configuração:</p>
            Os templates acima devem ser criados exatamente com esse nome e estrutura no <span className="text-orange-500">Business Manager da Meta</span>. O botão deve ser do tipo "Call to Action" com link dinâmico para que o Swipy possa injetar o link de pagamento único de cada cliente.
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;