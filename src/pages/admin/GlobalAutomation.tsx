"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Send, Image as ImageIcon, Loader2, Plus, Trash2, GripVertical, Variable, Save, ExternalLink, Info, Zap, Clock, QrCode } from 'lucide-react';
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
  const [triggers, setTriggers] = useState<any[]>([]);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from('billing_rules').select('*').order('day_offset', { ascending: true });
    if (data) setTriggers(data);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const saveRules = async () => {
    setSaving(true);
    try {
      const formatted = triggers.map(t => { 
        const item = { ...t }; 
        if (!item.id) item.id = crypto.randomUUID(); 
        delete item.created_at; 
        return item; 
      });
      await supabase.from('billing_rules').upsert(formatted);
      showSuccess("Régua salva com sucesso!"); 
      fetchRules();
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const updateTrigger = (index: number, field: string, value: any) => {
    const newTriggers = [...triggers]; 
    newTriggers[index] = { ...newTriggers[index], [field]: value }; 
    setTriggers(newTriggers);
  };

  const renderPreview = (text: string, mapping: any[]) => {
    let preview = text || '';
    mapping?.forEach((key, index) => { 
      preview = preview.replace(`{{${index + 1}}}`, SYSTEM_VARIABLES.find(v => v.key === key)?.mock || '---'); 
    });
    return preview;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <Zap className="text-orange-500" size={32} /> Régua de Cobrança
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Fluxo automático de mensagens (Meta API).</p>
          </div>
          <div className="flex gap-3">
            <button onClick={saveRules} disabled={saving} className="bg-apple-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} SALVAR
            </button>
            <button onClick={() => setTriggers([...triggers, { name: 'novo_template', label: 'Novo Disparo', day_offset: 0, mapping: ['customer_name'], is_active: true }])} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
              <Plus size={18} /> ADD GATILHO
            </button>
          </div>
        </div>

        <div className="space-y-12 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-1 before:bg-apple-border">
          {triggers.map((t, idx) => {
            const imageType = !t.image_url ? 'none' : t.image_url === '{{qr_code}}' ? 'qr_code' : 'custom';
            
            return (
              <div key={t.id || idx} className="relative pl-20 group">
                <div className={cn("absolute left-0 top-0 w-16 h-16 rounded-full border-4 border-apple-light flex items-center justify-center z-10 shadow-xl transition-colors", t.day_offset === -1 ? "bg-orange-500" : "bg-blue-500")}>
                  <Clock size={24} className="text-white" />
                </div>
                
                <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm group-hover:border-orange-200 transition-all">
                  <div className="p-8 border-b border-apple-border bg-apple-offWhite flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <GripVertical className="text-apple-muted opacity-30" size={20} />
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase text-apple-muted">Disparo</Label>
                          <Select value={t.day_offset?.toString()} onValueChange={v => updateTrigger(idx, 'day_offset', parseInt(v))}>
                            <SelectTrigger className="h-10 bg-apple-white border-apple-border rounded-xl font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-apple-white border-apple-border">
                              <SelectItem value="-1">Criada (Imediato)</SelectItem>
                              <SelectItem value="0">Vence Hoje</SelectItem>
                              <SelectItem value="1">D+1 Atraso</SelectItem>
                              <SelectItem value="3">D+3 Atraso</SelectItem>
                              <SelectItem value="5">D+5 Atraso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase text-apple-muted">ID Template Meta</Label>
                          <Input value={t.name} onChange={e => updateTrigger(idx, 'name', e.target.value)} className="h-10 bg-apple-white border-apple-border rounded-xl font-mono text-orange-500 font-bold" />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { if(confirm('Remover disparo?')) setTriggers(triggers.filter((_, i) => i !== idx)); }} className="p-3 text-apple-muted hover:text-red-500 transition-all bg-apple-white rounded-xl border border-apple-border shadow-sm">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-5">
                    <div className="lg:col-span-3 p-10 space-y-8 border-r border-apple-border">
                        
                        {/* Configurações de Mídia e Botão */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-apple-offWhite p-6 rounded-[2rem] border border-apple-border">
                          
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-apple-muted flex items-center gap-2"><ImageIcon size={14} className="text-blue-500"/> Cabeçalho (Imagem)</Label>
                            <Select 
                              value={imageType} 
                              onValueChange={v => {
                                if (v === 'none') updateTrigger(idx, 'image_url', null);
                                else if (v === 'qr_code') updateTrigger(idx, 'image_url', '{{qr_code}}');
                                else updateTrigger(idx, 'image_url', 'https://exemplo.com/img.png');
                              }}
                            >
                              <SelectTrigger className="h-10 bg-apple-white border-apple-border rounded-xl font-medium shadow-sm"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-apple-white border-apple-border">
                                <SelectItem value="none">Sem Imagem</SelectItem>
                                <SelectItem value="qr_code">QR Code PIX (Dinâmico)</SelectItem>
                                <SelectItem value="custom">URL de Imagem Fixa</SelectItem>
                              </SelectContent>
                            </Select>
                            {imageType === 'custom' && (
                              <Input 
                                value={t.image_url === '{{qr_code}}' ? '' : t.image_url} 
                                onChange={e => updateTrigger(idx, 'image_url', e.target.value)} 
                                placeholder="Link da imagem..."
                                className="h-10 bg-apple-white border-apple-border shadow-sm text-xs"
                              />
                            )}
                          </div>

                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-apple-muted flex items-center gap-2"><ExternalLink size={14} className="text-emerald-500"/> Botão (Link)</Label>
                            <Select 
                              value={t.button_link_variable || 'none'} 
                              onValueChange={v => updateTrigger(idx, 'button_link_variable', v === 'none' ? null : v)}
                            >
                              <SelectTrigger className="h-10 bg-apple-white border-apple-border rounded-xl font-medium shadow-sm"><SelectValue placeholder="Variável do Link" /></SelectTrigger>
                              <SelectContent className="bg-apple-white border-apple-border">
                                <SelectItem value="none">Sem Botão de Link</SelectItem>
                                <SelectItem value="payment_id">ID da Fatura (Sufixo na Meta)</SelectItem>
                                <SelectItem value="payment_link">URL Completa (Link dinâmico)</SelectItem>
                              </SelectContent>
                            </Select>
                            {t.button_link_variable && (
                              <Input 
                                value={t.primary_button_text || ''} 
                                onChange={e => updateTrigger(idx, 'primary_button_text', e.target.value)} 
                                placeholder="Texto do botão (ex: Pagar)" 
                                className="h-10 bg-apple-white border-apple-border shadow-sm text-xs font-bold"
                              />
                            )}
                          </div>

                        </div>

                        {/* Variáveis e Corpo da Mensagem */}
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-apple-muted">Variáveis do Corpo ({{`{{1}}`}}, {{`{{2}}`}}...)</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {t.mapping?.map((key: string, vIdx: number) => (
                              <div key={vIdx} className="flex gap-2 items-center">
                                <div className="w-8 h-8 shrink-0 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center text-[10px] font-black text-orange-600">{vIdx + 1}</div>
                                <Select value={key} onValueChange={v => { const m = [...t.mapping]; m[vIdx] = v; updateTrigger(idx, 'mapping', m); }}>
                                  <SelectTrigger className="flex-1 bg-apple-offWhite border-apple-border h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-apple-white border-apple-border text-xs">
                                    {SYSTEM_VARIABLES.map(sv => (<SelectItem key={sv.key} value={sv.key}>{sv.label}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                            <button onClick={() => updateTrigger(idx, 'mapping', [...(t.mapping || []), 'customer_name'])} className="h-10 rounded-xl border border-dashed border-apple-border text-apple-muted hover:border-orange-500 hover:text-orange-500 text-xs font-bold transition-all flex items-center justify-center gap-1">
                              <Plus size={14} /> ADD VAR
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-apple-muted">Preview do Texto</Label>
                          <Textarea value={t.message_text} onChange={e => updateTrigger(idx, 'message_text', e.target.value)} className="min-h-[120px] bg-apple-offWhite border-apple-border rounded-2xl p-4 text-sm" placeholder="Texto exato como cadastrado na Meta API..." />
                        </div>

                    </div>
                    
                    {/* Visualização Mobile (WhatsApp Mock) */}
                    <div className="lg:col-span-2 p-10 bg-apple-offWhite flex flex-col items-center justify-center border-t lg:border-t-0">
                        <p className="text-[9px] font-black text-apple-muted uppercase tracking-[0.2em] mb-6">Preview no WhatsApp do Cliente</p>
                        <div className="w-full max-w-[280px] bg-[#e5ddd5] rounded-[2rem] p-4 shadow-2xl border-4 border-apple-white flex flex-col gap-1.5 relative overflow-hidden">
                          
                          {/* Imagem Cabeçalho Mock */}
                          {t.image_url === '{{qr_code}}' && (
                            <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-center">
                              <QrCode size={64} className="text-apple-muted opacity-50" />
                            </div>
                          )}
                          {t.image_url && t.image_url !== '{{qr_code}}' && (
                            <div className="bg-white p-1 rounded-xl shadow-sm">
                              <img src={t.image_url} alt="Preview" className="w-full h-32 rounded-lg object-cover bg-apple-light" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            </div>
                          )}

                          {/* Balão de Texto Mock */}
                          <div className="bg-white p-3.5 rounded-xl rounded-tl-none shadow-sm space-y-2">
                            <p className="text-[13px] text-apple-dark leading-relaxed whitespace-pre-wrap">{renderPreview(t.message_text, t.mapping)}</p>
                            <span className="text-[9px] text-apple-muted float-right mt-1">Agora</span>
                          </div>

                          {/* Botão de Link Mock */}
                          {t.button_link_variable && (
                            <div className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-center gap-2">
                              <ExternalLink size={14} className="text-[#00a884]" />
                              <span className="text-[12px] font-medium text-[#00a884]">{t.primary_button_text || 'Pagar Agora'}</span>
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;