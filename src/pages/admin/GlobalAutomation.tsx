"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  Send, 
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Layout,
  QrCode,
  Variable,
  Link as LinkIcon,
  Globe,
  Save,
  ExternalLink
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const SYSTEM_VARIABLES = [
  { key: 'customer_name', label: 'Nome do Cliente', mock: 'João Silva' },
  { key: 'merchant_name', label: 'Nome do Lojista', mock: 'Minha Loja Ltda' },
  { key: 'amount', label: 'Valor da Cobrança', mock: '149,90' },
  { key: 'payment_link', label: 'Link de Pagamento (URL)', mock: 'https://swipy.com/pay/123' },
  { key: 'due_date', label: 'Data de Vencimento', mock: '15/10/2024' },
];

const GlobalAutomation = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<any[]>([]);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('billing_rules').select('*').order('day_offset', { ascending: true });
    if (!error && data) setTriggers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const saveRules = async () => {
    setSaving(true);
    try {
      // Deletamos as antigas e inserimos as novas para simplificar o "upsert" em lote
      // Ou apenas atualizamos se você preferir. Aqui vamos salvar uma por uma ou usar upsert.
      const { error } = await supabase.from('billing_rules').upsert(triggers);
      if (error) throw error;
      showSuccess("Régua de cobrança salva com sucesso!");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addTrigger = () => {
    const newTrigger = {
      name: 'novo_template',
      label: 'Novo Gatilho',
      day_offset: 0,
      language: 'en',
      message_text: 'Olá *{{1}}*...',
      image_url: '',
      primary_button_text: 'Pagar Agora',
      mapping: ['customer_name'],
      button_link_variable: 'payment_link',
      is_active: true
    };
    setTriggers([...triggers, newTrigger]);
  };

  const removeTrigger = async (id: string, index: number) => {
    if (!confirm("Remover este gatilho?")) return;
    
    if (id) {
      await supabase.from('billing_rules').delete().eq('id', id);
    }
    
    const newTriggers = [...triggers];
    newTriggers.splice(index, 1);
    setTriggers(newTriggers);
    showSuccess("Gatilho removido.");
  };

  const updateTrigger = (index: number, field: string, value: any) => {
    const newTriggers = [...triggers];
    newTriggers[index] = { ...newTriggers[index], [field]: value };
    setTriggers(newTriggers);
  };

  const getMockValue = (key: string) => {
    return SYSTEM_VARIABLES.find(v => v.key === key)?.mock || '---';
  };

  const renderPreviewText = (text: string, mapping: any[]) => {
    let preview = text || '';
    if (!Array.isArray(mapping)) return preview;
    mapping.forEach((key, index) => {
      const mock = getMockValue(key);
      preview = preview.replace(`{{${index + 1}}}`, mock);
    });
    return preview;
  };

  const handleSendTest = async (trigger: any) => {
    const testPhone = prompt("Número para teste (com DDD):");
    if (!testPhone) return;

    setLoadingId(trigger.id || 'test');
    try {
      const variablesToSend = trigger.mapping.map((key: string) => getMockValue(key));
      const buttonVariableToSend = getMockValue(trigger.button_link_variable);

      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          to: testPhone,
          templateName: trigger.name,
          language: trigger.language,
          imageUrl: trigger.image_url,
          variables: variablesToSend,
          buttonVariable: buttonVariableToSend
        })
      });

      if (!response.ok) throw new Error("Erro ao enviar teste");
      showSuccess("Teste enviado!");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Régua de Cobrança Global</h2>
            <p className="text-zinc-400 mt-1">Configure as mensagens automáticas baseadas no vencimento.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={saveRules}
              disabled={saving}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              SALVAR ALTERAÇÕES
            </button>
            <button 
              onClick={addTrigger}
              className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
            >
              <Plus size={20} /> ADICIONAR GATILHO
            </button>
          </div>
        </div>

        <div className="space-y-12 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-800">
          {triggers.map((t, tIndex) => (
            <div key={tIndex} className="relative pl-16 group">
              <div className="absolute left-0 top-0 w-16 h-16 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-zinc-900 border-4 border-orange-500 z-10 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all group-hover:border-zinc-700">
                <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GripVertical className="text-zinc-700" size={20} />
                    <div className="flex items-center gap-4">
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold">Dia (Offset)</Label>
                          <Select 
                            value={t.day_offset?.toString()} 
                            onValueChange={(val) => updateTrigger(tIndex, 'day_offset', parseInt(val))}
                          >
                            <SelectTrigger className="h-8 w-24 bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              <SelectItem value="0">D0 (Vence Hoje)</SelectItem>
                              <SelectItem value="1">D+1 (1 dia após)</SelectItem>
                              <SelectItem value="3">D+3 (3 dias após)</SelectItem>
                              <SelectItem value="5">D+5 (5 dias após)</SelectItem>
                              <SelectItem value="7">D+7 (1 semana)</SelectItem>
                            </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold">Nome do Template</Label>
                          <Input 
                            value={t.name}
                            onChange={(e) => updateTrigger(tIndex, 'name', e.target.value)}
                            className="h-8 w-48 text-xs bg-zinc-950 border-zinc-800 font-mono text-orange-400"
                          />
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSendTest(t)}
                      disabled={loadingId === t.id}
                      className="text-emerald-400 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20"
                    >
                      {loadingId === t.id ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      TESTE
                    </button>
                    <button onClick={() => removeTrigger(t.id, tIndex)} className="p-2.5 text-zinc-600 hover:text-red-400 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-7 p-8 space-y-6 border-r border-zinc-800">
                    <div className="space-y-2">
                       <Label className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                          <ImageIcon size={14} className="text-orange-500" /> Imagem do Cabeçalho
                        </Label>
                       <Input 
                          value={t.image_url}
                          onChange={(e) => updateTrigger(tIndex, 'image_url', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-xs h-10" 
                          placeholder="URL da Imagem..."
                        />
                    </div>

                    <div className="space-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
                      <Label className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                        <Variable size={14} className="text-orange-500" /> Variáveis da Mensagem
                      </Label>
                      <div className="grid grid-cols-1 gap-3">
                        {t.mapping?.map((variableKey: string, vIndex: number) => (
                          <div key={vIndex} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 shrink-0">
                              {`{{${vIndex + 1}}}`}
                            </div>
                            <Select 
                              value={variableKey} 
                              onValueChange={(val) => {
                                const newMapping = [...t.mapping];
                                newMapping[vIndex] = val;
                                updateTrigger(tIndex, 'mapping', newMapping);
                              }}
                            >
                              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                {SYSTEM_VARIABLES.map((sv) => (
                                  <SelectItem key={sv.key} value={sv.key}>{sv.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                        <button 
                          onClick={() => updateTrigger(tIndex, 'mapping', [...(t.mapping || []), 'customer_name'])}
                          className="text-[10px] text-orange-500 font-bold hover:underline"
                        >
                          + ADICIONAR VARIÁVEL
                        </button>
                      </div>
                      <Textarea 
                        value={t.message_text}
                        onChange={(e) => updateTrigger(tIndex, 'message_text', e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs min-h-[100px] mt-3" 
                        placeholder="Texto da mensagem..."
                      />
                    </div>

                    <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50 flex gap-4">
                       <div className="flex-1 space-y-2">
                          <Label className="text-[10px] uppercase text-zinc-500 font-bold">Texto do Botão</Label>
                          <Input 
                            value={t.primary_button_text}
                            onChange={(e) => updateTrigger(tIndex, 'primary_button_text', e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-xs h-10"
                          />
                       </div>
                       <div className="flex-1 space-y-2">
                          <Label className="text-[10px] uppercase text-zinc-500 font-bold">Variável do Link</Label>
                          <Select 
                            value={t.button_link_variable}
                            onValueChange={(val) => updateTrigger(tIndex, 'button_link_variable', val)}
                          >
                            <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              {SYSTEM_VARIABLES.map((sv) => (
                                <SelectItem key={sv.key} value={sv.key}>{sv.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                       </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="lg:col-span-5 bg-zinc-950 p-8 flex flex-col items-center">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-6">WhatsApp Preview</p>
                    <div className="w-full max-w-[280px] bg-[#0b141a] rounded-3xl border-[6px] border-[#1f2c33] p-1.5 shadow-2xl">
                      <div className="bg-[#0b141a] h-full rounded-[1.8rem] overflow-hidden p-3 pt-6 space-y-4">
                        <div className="bg-[#1f2c33] rounded-2xl rounded-tl-none overflow-hidden border border-zinc-800/30">
                          {t.image_url && <img src={t.image_url} alt="Header" className="w-full h-32 object-cover" />}
                          <div className="p-3">
                            <p className="text-[12px] text-zinc-100 leading-relaxed whitespace-pre-wrap">
                              {renderPreviewText(t.message_text, t.mapping)}
                            </p>
                          </div>
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-medium">
                            <ExternalLink size={14} /> {t.primary_button_text}
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
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;