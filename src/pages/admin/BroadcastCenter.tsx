"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Send, Zap, Loader2, Users, Building2, Megaphone, Info, AlertTriangle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";

const BroadcastCenter = () => {
  const [loading, setLoading] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    target: 'all',
    merchantId: '',
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    const fetchMerchants = async () => {
      const { data } = await supabase.from('profiles').select('id, company, full_name').eq('system_role', 'Admin');
      if (data) setMerchants(data);
    };
    fetchMerchants();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return showError("Preencha o título e a mensagem.");

    setLoading(true);
    try {
      let targets = [];
      if (formData.target === 'all') {
        targets = merchants.map(m => m.id);
      } else {
        targets = [formData.merchantId];
      }

      if (targets.length === 0) throw new Error("Nenhum destinatário encontrado.");

      const notificationsToInsert = targets.map(userId => ({
        user_id: userId,
        title: formData.title,
        message: formData.message,
        type: formData.type
      }));

      const { error } = await supabase.from('notifications').insert(notificationsToInsert);
      if (error) throw error;

      showSuccess(`Mensagem enviada para ${targets.length} lojistas!`);
      setFormData({ ...formData, title: '', message: '' });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
        <div>
          <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
            <Megaphone className="text-orange-500" size={32} /> Central de Comunicados
          </h2>
          <p className="text-apple-muted mt-1 font-medium">Envie avisos, atualizações e marketing direto para o dashboard dos lojistas.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSend} className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 space-y-8 shadow-sm">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-apple-muted tracking-widest">1. Destinatários</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={formData.target} onValueChange={v => setFormData({...formData, target: v})}>
                    <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-apple-white border-apple-border">
                      <SelectItem value="all">Todos os Lojistas ({merchants.length})</SelectItem>
                      <SelectItem value="specific">Lojista Específico</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.target === 'specific' && (
                    <Select value={formData.merchantId} onValueChange={v => setFormData({...formData, merchantId: v})}>
                      <SelectTrigger className="bg-apple-offWhite border-apple-border h-12 rounded-xl"><SelectValue placeholder="Selecione o lojista..." /></SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">
                        {merchants.map(m => <SelectItem key={m.id} value={m.id}>{m.company || m.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-apple-border">
                <Label className="text-[10px] font-black uppercase text-apple-muted tracking-widest">2. Conteúdo do Alerta</Label>
                
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-apple-dark">Título do Aviso</Label>
                   <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Manutenção Programada" className="bg-apple-offWhite border-apple-border h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                   <Label className="text-xs font-bold text-apple-dark">Tipo de Notificação</Label>
                   <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'info', icon: Info, label: 'Info', color: 'text-zinc-500' },
                        { id: 'success', icon: Zap, label: 'Oferta', color: 'text-emerald-500' },
                        { id: 'warning', icon: AlertTriangle, label: 'Alerta', color: 'text-orange-500' },
                        { id: 'system', icon: Building2, label: 'Sistema', color: 'text-blue-500' }
                      ].map(t => (
                        <button 
                          key={t.id} 
                          type="button"
                          onClick={() => setFormData({...formData, type: t.id})}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-2xl border transition-all gap-1.5",
                            formData.type === t.id ? "bg-orange-50 border-orange-500" : "bg-apple-offWhite border-apple-border hover:border-apple-dark"
                          )}
                        >
                          <t.icon size={18} className={t.color} />
                          <span className="text-[10px] font-black uppercase">{t.label}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-xs font-bold text-apple-dark">Mensagem Detalhada</Label>
                   <Textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Escreva aqui o que o lojista lerá..." className="bg-apple-offWhite border-apple-border min-h-[120px] rounded-2xl p-4" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />} DISPARAR COMUNICADO
              </button>
            </form>
          </div>

          <div className="space-y-6">
             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
                <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Preview no Dashboard</h4>
                <div className="bg-apple-offWhite border border-apple-border rounded-2xl p-4 flex gap-3 shadow-inner">
                   <div className="mt-1">
                      {formData.type === 'success' ? <Zap className="text-emerald-500" size={16} /> :
                       formData.type === 'warning' ? <AlertTriangle className="text-orange-500" size={16} /> :
                       formData.type === 'system' ? <Building2 className="text-blue-500" size={16} /> :
                       <Info className="text-zinc-500" size={16} />}
                   </div>
                   <div>
                      <p className="text-xs font-bold text-apple-black">{formData.title || 'Título da Notificação'}</p>
                      <p className="text-[11px] text-apple-muted mt-1 leading-relaxed">{formData.message || 'Sua mensagem aparecerá aqui para o lojista...'}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BroadcastCenter;