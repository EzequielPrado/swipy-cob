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
  Variable,
  Save,
  ExternalLink,
  Info,
  Zap,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";

const SYSTEM_VARIABLES = [
  { key: 'customer_name', label: 'Nome do Cliente', mock: 'João Silva' },
  { key: 'merchant_name', label: 'Nome do Lojista', mock: 'Minha Loja Ltda' },
  { key: 'amount', label: 'Valor da Cobrança', mock: '149,90' },
  { key: 'payment_id', label: 'Código de Pagamento (ID)', mock: '550e8400-e29b-41d4' },
  { key: 'payment_link', label: 'Link Completo (URL)', mock: 'https://seusistema.com/pagar/550e8400' },
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
      const { error } = await supabase.from('billing_rules').upsert(triggers);
      if (error) throw error;
      showSuccess("Régua de cobrança salva com sucesso!");
      fetchRules();
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
      image_url: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=600',
      primary_button_text: 'Pagar Agora',
      mapping: ['customer_name'],
      button_link_variable: 'payment_id',
      is_active: true
    };
    setTriggers([...triggers, newTrigger]);
  };

  const removeTrigger = async (id: string, index: number) => {
    if (!confirm("Remover este gatilho?")) return;
    if (id) await supabase.from('billing_rules').delete().eq('id', id);
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
            <p className="text-zinc-400 mt-1">Configure o fluxo de mensagens automáticas baseadas no ciclo de vida da fatura.</p>
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
                <div className={cn(
                  "w-4 h-4 rounded-full border-4 z-10 shadow-lg",
                  t.day_offset === -1 ? "bg-orange-500 border-zinc-950 shadow-orange-500/30" :
                  t.day_offset === 0 ? "bg-emerald-500 border-zinc-950 shadow-emerald-500/30" :
                  "bg-zinc-700 border-zinc-950"
                )} />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all group-hover:border-zinc-700">
                <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <GripVertical className="text-zinc-700" size={20} />
                    <div className="flex items-center gap-6">
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                             {t.day_offset === -1 ? <Zap size={10} className="text-orange-500" /> : <Clock size={10} />}
                             Momento do Disparo
                          </Label>
                          <Select 
                            value={t.day_offset?.toString()} 
                            onValueChange={(val) => updateTrigger(tIndex, 'day_offset', parseInt(val))}
                          >
                            <SelectTrigger className="h-9 w-40 bg-zinc-950 border-zinc-800 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              <SelectItem value="-1">Criada (Imediato)</SelectItem>
                              <SelectItem value="0">D0 (Vence Hoje)</SelectItem>
                              <SelectItem value="3">D+3 (Atrasada)</SelectItem>
                              <SelectItem value="7">D+7 (Atraso Crítico)</SelectItem>
                              <SelectItem value="15">D+15 (Cobrança Forte)</SelectItem>
                            </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold">Template Meta (ID)</Label>
                          <Input 
                            value={t.name}
                            onChange={(e) => updateTrigger(tIndex, 'name', e.target.value)}
                            className="h-9 w-48 text-xs bg-zinc-950 border-zinc-800 font-mono text-orange-400 font-bold"
                          />
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSendTest(t)}
                      disabled={loadingId === t.id}
                      className="text-emerald-400 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 transition-all"
                    >
                      {loadingId === t.id ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      TESTE REAL
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
                          placeholder="URL da Imagem (Padrão: Pix)..."
                        />
                    </div>

                    <div className="space-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
                      <div className="flex justify-between items-center">
                        <Label className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                          <Variable size={14} className="text-orange-500" /> Variáveis da Mensagem
                        </Label>
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                          <Info size={12} />
                          Use {"{{1}}"}, {"{{2}}"}, etc no corpo do template
                        </div>
                      </div>
                      
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
                          className="text-[10px] text-orange-500 font-bold hover:underline self-start mt-1"
                        >
                          + ADICIONAR NOVA VARIÁVEL
                        </button>
                      </div>
                      <Textarea 
                        value={t.message_text}
                        onChange={(e) => updateTrigger(tIndex, 'message_text', e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs min-h-[120px] mt-3 leading-relaxed" 
                        placeholder="Escreva a mensagem aqui (Markdown suportado pelo WhatsApp)..."
                      />
                    </div>

                    <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50 flex gap-4">
                       <div className="flex-1 space-y-2">
                          <Label className="text-[10px] uppercase text-zinc-500 font-bold">Texto do Botão Call-to-Action</Label>
                          <Input 
                            value={t.primary_button_text}
                            onChange={(e) => updateTrigger(tIndex, 'primary_button_text', e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-xs h-10"
                            placeholder="Ex: Pagar Agora"
                          />
                       </div>
                       <div className="flex-1 space-y-2">
                          <Label className="text-[10px] uppercase text-zinc-500 font-bold">Variável do Botão (Sufixo da URL)</Label>
                          <Select 
                            value={t.button_link_variable || 'payment_id'}
                            onValueChange={(val) => updateTrigger(tIndex, 'button_link_variable', val)}
                          >
                            <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                              {SYSTEM_VARIABLES.map((sv) => (
                                <SelectItem key={sv.sv_key || sv.key} value={sv.key}>{sv.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[9px] text-orange-500/70 italic mt-1 flex items-center gap-1">
                            <Info size={10} /> Recomendado: Código de Pagamento (ID)
                          </p>
                       </div>
                    </div>
                  </div>

                  {/* WhatsApp Preview */}
                  <div className="lg:col-span-5 bg-zinc-950 p-8 flex flex-col items-center justify-center border-t lg:border-t-0 border-zinc-800">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-6">Pré-visualização do Cliente</p>
                    <div className="w-full max-w-[280px] bg-[#0b141a] rounded-3xl border-[8px] border-[#1f2c33] p-1.5 shadow-2xl">
                      <div className="bg-[#0b141a] h-full rounded-[1.8rem] overflow-hidden p-3 pt-6 space-y-4">
                        <div className="bg-[#1f2c33] rounded-2xl rounded-tl-none overflow-hidden border border-zinc-800/30">
                          {t.image_url && <img src={t.image_url} alt="Header" className="w-full h-32 object-cover" />}
                          <div className="p-3">
                            <p className="text-[12px] text-zinc-100 leading-relaxed whitespace-pre-wrap">
                              {renderPreviewText(t.message_text, t.mapping)}
                            </p>
                          </div>
                          <div className="border-t border-zinc-700/50 bg-[#233138] p-3 flex items-center justify-center gap-2 text-[#53bdeb] text-[13px] font-bold">
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