"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon,
  ExternalLink,
  Info,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  Layout
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";

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

  const addTrigger = () => {
    const newId = triggers.length > 0 ? Math.max(...triggers.map(t => t.id)) + 1 : 1;
    setTriggers([...triggers, {
      id: newId,
      day: 'D+1',
      name: 'novo_template',
      label: 'Novo Gatilho de Cobrança',
      msg: 'Olá *{{nome}}*, temos uma atualização sobre sua fatura...',
      imageUrl: '',
      buttonText: 'Acessar Link'
    }]);
    showSuccess("Novo gatilho adicionado à régua!");
  };

  const removeTrigger = (id: number) => {
    if (confirm("Deseja remover este gatilho da régua?")) {
      setTriggers(triggers.filter(t => t.id !== id));
    }
  };

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
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança Global</h2>
            <p className="text-zinc-400 mt-1">Gerencie a jornada de mensagens automáticas da sua plataforma.</p>
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
              {/* Marcador da Timeline */}
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
                      TESTAR ENVIO
                    </button>
                    <button 
                      onClick={() => removeTrigger(t.id)}
                      className="p-2.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Campos de Edição */}
                  <div className="p-8 space-y-6 border-r border-zinc-800">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Gatilho (Dia)</Label>
                          <Input 
                            value={t.day} 
                            onChange={(e) => {
                              const newTriggers = [...triggers];
                              newTriggers[index].day = e.target.value;
                              setTriggers(newTriggers);
                            }}
                            className="bg-zinc-950 border-zinc-800 text-xs h-10" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Template Meta</Label>
                          <Input 
                            value={t.name}
                            onChange={(e) => {
                              const newTriggers = [...triggers];
                              newTriggers[index].name = e.target.value;
                              setTriggers(newTriggers);
                            }}
                            className="bg-zinc-950 border-zinc-800 font-mono text-orange-400 text-xs h-10" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">URL da Imagem (Header)</Label>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                          <Input 
                            value={t.imageUrl}
                            onChange={(e) => {
                              const newTriggers = [...triggers];
                              newTriggers[index].imageUrl = e.target.value;
                              setTriggers(newTriggers);
                            }}
                            placeholder="https://suaimagem.com/foto.jpg"
                            className="bg-zinc-950 border-zinc-800 pl-9 text-xs h-10" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">Corpo da Mensagem (Preview)</Label>
                        <Textarea 
                          value={t.msg}
                          onChange={(e) => {
                            const newTriggers = [...triggers];
                            newTriggers[index].msg = e.target.value;
                            setTriggers(newTriggers);
                          }}
                          className="bg-zinc-950 border-zinc-800 text-xs min-h-[100px] leading-relaxed" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">Botão Call-to-Action</Label>
                        <Input 
                          value={t.buttonText}
                          onChange={(e) => {
                            const newTriggers = [...triggers];
                            newTriggers[index].buttonText = e.target.value;
                            setTriggers(newTriggers);
                          }}
                          className="bg-zinc-950 border-zinc-800 text-xs h-10" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visualização Mobile Realista */}
                  <div className="bg-zinc-950 p-8 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Layout size={12} /> Smartphone Preview
                    </p>
                    
                    <div className="w-full max-w-[280px] bg-[#0b141a] rounded-[2.5rem] border-[6px] border-[#1f2c33] p-1.5 shadow-2xl relative overflow-hidden">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#1f2c33] rounded-b-xl z-20" />
                      
                      <div className="bg-[#0b141a] h-full rounded-[2rem] overflow-y-auto p-4 pt-8 custom-scrollbar space-y-4">
                        {/* Balão WhatsApp */}
                        <div className="bg-[#1f2c33] rounded-2xl rounded-tl-none overflow-hidden shadow-lg border border-zinc-800/30 animate-in fade-in slide-in-from-left-2 duration-500">
                          {t.imageUrl ? (
                            <img src={t.imageUrl} alt="Header" className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-zinc-800 flex items-center justify-center text-zinc-700 italic text-[10px]">Sem imagem de cabeçalho</div>
                          )}
                          <div className="p-3 space-y-2">
                            <p className="text-[12px] text-zinc-100 leading-relaxed whitespace-pre-wrap">
                              {t.msg.replace('{{nome}}', 'Lucas').replace('{{valor}}', '249,90')}
                            </p>
                            <p className="text-[9px] text-zinc-500 text-right">09:41</p>
                          </div>
                          {/* Botão Interativo */}
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-medium hover:bg-[#2a3942] transition-colors cursor-pointer">
                            <ExternalLink size={14} />
                            {t.buttonText}
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

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-bold text-zinc-100">Configurações Prontas?</p>
              <p className="text-xs text-zinc-500">As alterações na régua são aplicadas instantaneamente para todos os usuários.</p>
            </div>
          </div>
          <button className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-8 py-3 rounded-xl transition-all shadow-xl">
            SALVAR REGRA GLOBAL
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;