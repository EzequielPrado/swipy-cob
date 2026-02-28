"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  Send, 
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  GripVertical,
  Layout,
  QrCode,
  MousePointer2
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
      day: 'D0', 
      name: 'cobranca_gerada', 
      label: 'Cobrança Gerada (Imediato)', 
      msg: 'Olá, *{{1}}* 😊\n\nAqui é da *{{2}}*.\nSeu pagamento de *R$ {{3}}*, está pendente.\nPara pagar via PIX, clique no botão abaixo ou escaneie o QR Code enviado.\n\nDúvidas? Fale com a gente.',
      imageUrl: 'https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?w=800&q=80',
      primaryBtn: '🔘 Pagar agora',
      secondaryBtn: '📷 QR Code PIX'
    },
    { 
      id: 2, 
      day: 'D+3', 
      name: 'lembrete_atraso', 
      label: 'Lembrete de Atraso (3 dias)', 
      msg: 'Olá, *{{1}}* 😊\n\nAqui é da *{{2}}*.\nNotamos que seu pagamento de *R$ {{3}}* ainda não foi identificado.\n\nEvite suspensão de serviços clicando no botão abaixo.',
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
      primaryBtn: '🔘 Pagar agora',
      secondaryBtn: '📷 QR Code PIX'
    },
  ]);

  const addTrigger = () => {
    const newId = triggers.length > 0 ? Math.max(...triggers.map(t => t.id)) + 1 : 1;
    setTriggers([...triggers, {
      id: newId,
      day: 'D+1',
      name: 'novo_template',
      label: 'Novo Gatilho',
      msg: 'Olá, *{{1}}* 😊\n\nAqui é da *{{2}}*...',
      imageUrl: '',
      primaryBtn: '🔘 Pagar agora',
      secondaryBtn: '📷 QR Code PIX'
    }]);
  };

  const removeTrigger = (id: number) => {
    if (confirm("Remover este gatilho?")) {
      setTriggers(triggers.filter(t => t.id !== id));
    }
  };

  const handleSendTest = async (trigger: any) => {
    const testPhone = prompt("Número para teste (com DDD):");
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
          // Enviando as 3 variáveis conforme seu modelo
          variables: ["Cliente Teste", "Minha Empresa PJ", "199,90"]
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro no envio");

      showSuccess(`Mensagem enviada para ${testPhone}!`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança Global</h2>
            <p className="text-zinc-400 mt-1">Configure os modelos oficiais com variáveis e botões interativos.</p>
          </div>
          <button 
            onClick={addTrigger}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> ADICIONAR GATILHO
          </button>
        </div>

        <div className="space-y-12 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-800">
          {triggers.map((t, index) => (
            <div key={t.id} className="relative pl-16 group">
              <div className="absolute left-0 top-0 w-16 h-16 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-zinc-900 border-4 border-orange-500 z-10 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all group-hover:border-zinc-700">
                <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GripVertical className="text-zinc-700" size={20} />
                    <div>
                      <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                        {t.label}
                        <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded border border-orange-500/20">{t.day}</span>
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">{t.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSendTest(t)}
                      disabled={loadingId === t.id}
                      className="text-emerald-400 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/10 px-4 py-2 rounded-xl transition-all border border-emerald-500/20"
                    >
                      {loadingId === t.id ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      DISPARAR TESTE
                    </button>
                    <button onClick={() => removeTrigger(t.id)} className="p-2.5 text-zinc-600 hover:text-red-400 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="p-8 space-y-6 border-r border-zinc-800">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Gatilho (Dia)</Label>
                          <Input value={t.day} className="bg-zinc-950 border-zinc-800 text-xs h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Template Meta</Label>
                          <Input value={t.name} className="bg-zinc-950 border-zinc-800 font-mono text-orange-400 text-xs h-10" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">URL da Imagem</Label>
                        <Input value={t.imageUrl} className="bg-zinc-950 border-zinc-800 text-xs h-10" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">Mensagem (Use {"{{1}}, {{2}}, {{3}}"})</Label>
                        <Textarea 
                          value={t.msg} 
                          onChange={(e) => {
                            const newTriggers = [...triggers];
                            newTriggers[index].msg = e.target.value;
                            setTriggers(newTriggers);
                          }}
                          className="bg-zinc-950 border-zinc-800 text-xs min-h-[150px] leading-relaxed font-sans" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Botão Principal</Label>
                          <Input value={t.primaryBtn} className="bg-zinc-950 border-zinc-800 text-xs h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Botão Secundário</Label>
                          <Input value={t.secondaryBtn} className="bg-zinc-950 border-zinc-800 text-xs h-10" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Mobile com estilo de Balão WhatsApp */}
                  <div className="bg-zinc-950 p-8 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Layout size={12} /> WhatsApp Preview
                    </p>
                    
                    <div className="w-full max-w-[280px] bg-[#0b141a] rounded-[2.5rem] border-[6px] border-[#1f2c33] p-1.5 shadow-2xl relative">
                      <div className="bg-[#0b141a] h-full rounded-[2rem] overflow-hidden p-4 pt-8 space-y-4">
                        <div className="bg-[#1f2c33] rounded-2xl rounded-tl-none overflow-hidden shadow-lg border border-zinc-800/30">
                          {t.imageUrl && <img src={t.imageUrl} alt="Header" className="w-full h-32 object-cover" />}
                          <div className="p-3 space-y-2">
                            <p className="text-[12px] text-zinc-100 leading-relaxed whitespace-pre-wrap">
                              {t.msg.replace('{{1}}', 'Lucas').replace('{{2}}', 'Swipy Cob').replace('{{3}}', '249,90')}
                            </p>
                            <p className="text-[9px] text-zinc-500 text-right">09:41</p>
                          </div>
                          
                          {/* Botão 1 */}
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-medium hover:bg-[#2a3942] cursor-pointer">
                            <MousePointer2 size={14} />
                            {t.primaryBtn}
                          </div>
                          
                          {/* Botão 2 */}
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-medium hover:bg-[#2a3942] cursor-pointer">
                            <QrCode size={14} />
                            {t.secondaryBtn}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-orange-500 text-zinc-950 p-8 rounded-3xl flex items-center justify-between shadow-xl shadow-orange-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-bold text-lg">Regra Global de Mensagens</p>
              <p className="text-sm font-medium opacity-80">As alterações serão aplicadas a todos os lojistas ativos.</p>
            </div>
          </div>
          <button className="bg-zinc-950 text-white font-bold px-10 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl">
            SALVAR CONFIGURAÇÃO
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;