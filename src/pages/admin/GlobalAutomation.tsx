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
  MousePointer2,
  Variable,
  Link as LinkIcon
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

// Variáveis disponíveis no sistema para injetar no template
const SYSTEM_VARIABLES = [
  { key: 'customer_name', label: 'Nome do Cliente', mock: 'João Silva' },
  { key: 'merchant_name', label: 'Nome do Lojista', mock: 'Minha Loja Ltda' },
  { key: 'amount', label: 'Valor da Cobrança', mock: '149,90' },
  { key: 'payment_link', label: 'Link de Pagamento', mock: 'https://swipy.com/pay/123' },
  { key: 'due_date', label: 'Data de Vencimento', mock: '15/10/2024' },
  { key: 'pix_code', label: 'Código PIX (Copia e Cola)', mock: '00020126580014BR.GOV.BCB.PIX...' },
];

const GlobalAutomation = () => {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [triggers, setTriggers] = useState([
    { 
      id: 1, 
      day: 'D0', 
      name: 'cobranca_gerada_v1', 
      label: 'Cobrança Gerada (Imediato)', 
      msg: 'Olá, *{{1}}* 😊\n\nAqui é da *{{2}}*.\nSeu pagamento de *R$ {{3}}*, está pendente.\nPara pagar via PIX, clique no botão abaixo ou escaneie o QR Code enviado.\n\nDúvidas? Fale com a gente.',
      imageUrl: 'https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?w=800&q=80',
      primaryBtn: '🔘 Pagar agora',
      secondaryBtn: '📷 QR Code PIX',
      // Define a ordem das variáveis {{1}}, {{2}}, {{3}}
      mapping: ['customer_name', 'merchant_name', 'amount']
    },
    { 
      id: 2, 
      day: 'D+3', 
      name: 'lembrete_atraso_v1', 
      label: 'Lembrete de Atraso (3 dias)', 
      msg: 'Olá, *{{1}}* 😊\n\nAqui é da *{{2}}*.\nNotamos que seu pagamento de *R$ {{3}}* ainda não foi identificado.\n\nEvite suspensão de serviços clicando no botão abaixo.',
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
      primaryBtn: '🔘 Pagar agora',
      secondaryBtn: '📷 QR Code PIX',
      mapping: ['customer_name', 'merchant_name', 'amount']
    },
  ]);

  const addTrigger = () => {
    const newId = triggers.length > 0 ? Math.max(...triggers.map(t => t.id)) + 1 : 1;
    setTriggers([...triggers, {
      id: newId,
      day: 'D+1',
      name: 'novo_template_meta',
      label: 'Novo Gatilho',
      msg: 'Olá *{{1}}*...',
      imageUrl: '',
      primaryBtn: 'Ver Link',
      secondaryBtn: 'Copiar PIX',
      mapping: ['customer_name']
    }]);
  };

  const removeTrigger = (id: number) => {
    if (confirm("Remover este gatilho?")) {
      setTriggers(triggers.filter(t => t.id !== id));
    }
  };

  const updateMapping = (triggerIndex: number, varIndex: number, value: string) => {
    const newTriggers = [...triggers];
    newTriggers[triggerIndex].mapping[varIndex] = value;
    setTriggers(newTriggers);
  };

  const addVariableToMapping = (triggerIndex: number) => {
    const newTriggers = [...triggers];
    newTriggers[triggerIndex].mapping.push('customer_name');
    setTriggers(newTriggers);
  };

  const removeVariableFromMapping = (triggerIndex: number) => {
    const newTriggers = [...triggers];
    newTriggers[triggerIndex].mapping.pop();
    setTriggers(newTriggers);
  };

  // Função auxiliar para pegar o valor de exemplo (mock) baseado na chave selecionada
  const getMockValue = (key: string) => {
    return SYSTEM_VARIABLES.find(v => v.key === key)?.mock || '---';
  };

  const handleSendTest = async (trigger: any) => {
    const testPhone = prompt("Número para teste (com DDD):");
    if (!testPhone) return;

    setLoadingId(trigger.id);
    try {
      // Monta o array de variáveis reais baseados na seleção do usuário
      const variablesToSend = trigger.mapping.map((key: string) => getMockValue(key));

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: testPhone,
          templateName: trigger.name, // Nome exato da Meta
          imageUrl: trigger.imageUrl,
          variables: variablesToSend // Array dinâmico ordenado
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro no envio");

      showSuccess(`Teste enviado para ${testPhone}! Variáveis: ${variablesToSend.join(', ')}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  // Função para gerar o preview do texto substituindo {{1}} pelos valores mockados
  const renderPreviewText = (text: string, mapping: string[]) => {
    let preview = text;
    mapping.forEach((key, index) => {
      const mock = getMockValue(key);
      preview = preview.replace(`{{${index + 1}}}`, mock);
    });
    return preview;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança Global</h2>
            <p className="text-zinc-400 mt-1">Configure o mapeamento de dados para sincronizar com a Meta.</p>
          </div>
          <button 
            onClick={addTrigger}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> ADICIONAR GATILHO
          </button>
        </div>

        <div className="space-y-12 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-800">
          {triggers.map((t, tIndex) => (
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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Template:</p>
                        <Input 
                          value={t.name}
                          onChange={(e) => {
                            const newTriggers = [...triggers];
                            newTriggers[tIndex].name = e.target.value;
                            setTriggers(newTriggers);
                          }}
                          className="h-6 w-48 text-xs bg-zinc-950 border-zinc-800 font-mono text-orange-400 focus:w-64 transition-all"
                          placeholder="nome_do_template_na_meta"
                        />
                      </div>
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
                    <button onClick={() => removeTrigger(t.id)} className="p-2.5 text-zinc-600 hover:text-red-400 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* Coluna de Configuração */}
                  <div className="lg:col-span-7 p-8 space-y-8 border-r border-zinc-800">
                    
                    {/* Mapeamento de Variáveis */}
                    <div className="space-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                          <Variable size={14} className="text-orange-500" />
                          Mapeamento de Variáveis (Body)
                        </Label>
                        <div className="flex gap-2">
                          <button onClick={() => removeVariableFromMapping(tIndex)} className="text-[10px] text-red-400 hover:underline" disabled={t.mapping.length === 0}>- Remover</button>
                          <button onClick={() => addVariableToMapping(tIndex)} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar</button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {t.mapping.map((variableKey, vIndex) => (
                          <div key={vIndex} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 shrink-0">
                              {`{{${vIndex + 1}}}`}
                            </div>
                            <div className="flex-1">
                              <Select 
                                value={variableKey} 
                                onValueChange={(val) => updateMapping(tIndex, vIndex, val)}
                              >
                                <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                  {SYSTEM_VARIABLES.map((sv) => (
                                    <SelectItem key={sv.key} value={sv.key}>
                                      {sv.label} (Ex: {sv.mock})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-600 italic">
                        Selecione qual dado do sistema substituirá cada variável numérica no texto do WhatsApp.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">URL da Imagem (Header)</Label>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                          <Input 
                            value={t.imageUrl}
                            onChange={(e) => {
                              const newTriggers = [...triggers];
                              newTriggers[tIndex].imageUrl = e.target.value;
                              setTriggers(newTriggers);
                            }}
                            className="bg-zinc-950 border-zinc-800 pl-9 text-xs h-10" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">Corpo da Mensagem (Referência)</Label>
                        <Textarea 
                          value={t.msg}
                          onChange={(e) => {
                            const newTriggers = [...triggers];
                            newTriggers[tIndex].msg = e.target.value;
                            setTriggers(newTriggers);
                          }}
                          className="bg-zinc-950 border-zinc-800 text-xs min-h-[120px] leading-relaxed font-sans" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Botão Principal</Label>
                          <Input 
                            value={t.primaryBtn}
                            onChange={(e) => {
                              const newTriggers = [...triggers];
                              newTriggers[tIndex].primaryBtn = e.target.value;
                              setTriggers(newTriggers);
                            }}
                            className="bg-zinc-950 border-zinc-800 text-xs h-10" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold">Botão Secundário</Label>
                          <Input 
                            value={t.secondaryBtn}
                            onChange={(e) => {
                              const newTriggers = [...triggers];
                              newTriggers[tIndex].secondaryBtn = e.target.value;
                              setTriggers(newTriggers);
                            }}
                            className="bg-zinc-950 border-zinc-800 text-xs h-10" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Mobile */}
                  <div className="lg:col-span-5 bg-zinc-950 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 opacity-50" />
                    
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                      <Layout size={12} /> Smartphone Preview
                    </p>
                    
                    <div className="w-full max-w-[280px] bg-[#0b141a] rounded-[2.5rem] border-[6px] border-[#1f2c33] p-1.5 shadow-2xl relative z-10">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#1f2c33] rounded-b-xl z-20" />
                      
                      <div className="bg-[#0b141a] h-full rounded-[2rem] overflow-hidden p-4 pt-8 space-y-4">
                        <div className="bg-[#1f2c33] rounded-2xl rounded-tl-none overflow-hidden shadow-lg border border-zinc-800/30">
                          {t.imageUrl && <img src={t.imageUrl} alt="Header" className="w-full h-32 object-cover" />}
                          <div className="p-3 space-y-2">
                            {/* Renderização Inteligente do Preview substituindo variáveis */}
                            <p className="text-[12px] text-zinc-100 leading-relaxed whitespace-pre-wrap">
                              {renderPreviewText(t.msg, t.mapping)}
                            </p>
                            <p className="text-[9px] text-zinc-500 text-right">09:41</p>
                          </div>
                          
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-medium hover:bg-[#2a3942] cursor-pointer">
                            <MousePointer2 size={14} />
                            {t.primaryBtn}
                          </div>
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-medium hover:bg-[#2a3942] cursor-pointer">
                            <QrCode size={14} />
                            {t.secondaryBtn}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-center relative z-10">
                       <p className="text-[10px] text-zinc-600 mb-2">Simulação de dados:</p>
                       <div className="flex flex-wrap justify-center gap-2">
                         {t.mapping.map((m, i) => (
                           <span key={i} className="text-[9px] bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-400">
                             {`{{${i+1}}}`} = <span className="text-emerald-500">{getMockValue(m)}</span>
                           </span>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;