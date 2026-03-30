"use client";

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Save, Loader2, Palette, Globe, ShieldCheck, Upload, X, BellRing, MessageSquare, Link as LinkIcon, Crown, Users, CheckCircle2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [planInfo, setPlanInfo] = useState<any>(null);

  const [formData, setFormData] = useState({ 
    company: '', 
    full_name: '', 
    phone: '',
    logo_url: '', 
    primary_color: '#f97316',
    slug: '',
    notify_whatsapp_sales: true 
  });

  useEffect(() => { if (user) fetchLocalProfile(); }, [user]);

  const fetchLocalProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, system_plans(*)')
      .eq('id', user?.id)
      .single();
      
    if (data) {
      setFormData({ 
        company: data.company || '', 
        full_name: data.full_name || '', 
        phone: data.phone || '',
        logo_url: data.logo_url || '', 
        primary_color: data.primary_color || '#f97316',
        slug: data.slug || '',
        notify_whatsapp_sales: data.notify_whatsapp_sales ?? true
      });
      setPlanInfo(data.system_plans);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('logos').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      showSuccess("Logo atualizada!");
    } catch (err: any) { showError(err.message); } finally { setUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Normalizar o slug (apenas letras minusculas, numeros e hifens)
      const cleanSlug = formData.slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      const { error } = await supabase.from('profiles').update({ 
        company: formData.company, 
        full_name: formData.full_name, 
        phone: formData.phone,
        logo_url: formData.logo_url, 
        primary_color: formData.primary_color,
        slug: cleanSlug,
        notify_whatsapp_sales: formData.notify_whatsapp_sales,
        updated_at: new Date().toISOString() 
      }).eq('id', user?.id);

      if (error) throw error;
      
      // CRÍTICO: Atualiza o perfil globalmente para que outros componentes vejam o novo slug
      await refreshProfile();
      
      showSuccess("Configurações salvas!");
      fetchLocalProfile();
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-apple-black">Configurações</h2>
          <p className="text-apple-muted mt-1 font-medium">Personalize sua experiência e gerencie suas notificações.</p>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* BRANDING */}
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 space-y-10 shadow-sm">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2"><Globe size={14} className="text-orange-500" /> Perfil & Marca</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nome da Empresa</Label><Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">WhatsApp para Notificações</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="5511999999999" className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-mono" /></div>
                </div>
                
                <div className="space-y-2 pt-4">
                  <Label className="text-xs font-bold text-apple-dark flex items-center gap-2">
                    <LinkIcon size={14} className="text-orange-500" /> URL do seu Portal de Agendamento
                  </Label>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-apple-muted bg-apple-offWhite px-3 py-3 rounded-xl border border-apple-border">{window.location.origin}/emp/</span>
                     <Input 
                      value={formData.slug} 
                      onChange={(e) => setFormData({...formData, slug: e.target.value})} 
                      placeholder="seu-negocio" 
                      className="bg-apple-offWhite border-apple-border h-12 rounded-xl font-bold text-orange-600" 
                     />
                  </div>
                  <p className="text-[9px] text-apple-muted font-medium mt-2 italic px-1">
                    Este link permite que seus clientes abram Ordens de Serviço diretamente pela internet.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8 pt-6 border-t border-apple-border">
                <div className="relative group">
                  {formData.logo_url ? (
                    <div className="w-24 h-24 bg-apple-offWhite border border-apple-border rounded-3xl p-3 flex items-center justify-center overflow-hidden"><img src={formData.logo_url} className="w-full h-full object-contain" /><button type="button" onClick={() => setFormData({...formData, logo_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button></div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-apple-offWhite border-2 border-dashed border-apple-border rounded-3xl flex flex-col items-center justify-center gap-2 text-apple-muted hover:border-orange-500 hover:text-orange-500 transition-all">{uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}<span className="text-[8px] font-black uppercase">Logo</span></button>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
                <div className="space-y-2 flex-1"><Label className="text-xs font-bold text-apple-dark">Cor do Sistema</Label><div className="flex gap-3"><input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-12 h-12 rounded-xl bg-apple-offWhite border border-apple-border cursor-pointer overflow-hidden p-0" /><Input value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 font-mono uppercase rounded-xl font-bold" /></div></div>
              </div>
            </div>

            {/* PREFERÊNCIAS DE NOTIFICAÇÃO */}
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm">
               <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2 mb-8"><BellRing size={14} className="text-orange-500" /> Preferências de Alerta</h3>
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-apple-offWhite border border-apple-border rounded-3xl">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-apple-border flex items-center justify-center text-emerald-500 shadow-sm">
                           <MessageSquare size={24} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-apple-black">Avisos de Venda no WhatsApp</p>
                           <p className="text-xs text-apple-muted font-medium">Receba uma mensagem instantânea toda vez que um cliente pagar.</p>
                        </div>
                     </div>
                     <Switch 
                        checked={formData.notify_whatsapp_sales}
                        onCheckedChange={(val) => setFormData({...formData, notify_whatsapp_sales: val})}
                        className="data-[state=checked]:bg-orange-500"
                     />
                  </div>
               </div>
            </div>

            <button type="submit" disabled={saving || uploading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : <Save size={20} className="inline mr-2" />} SALVAR ALTERAÇÕES</button>
          </div>

          <div className="space-y-6">

            {/* INFORMAÇÕES DO PLANO */}
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                <Crown size={16} className="text-orange-500" /> Seu Plano Atual
              </h4>
              <div className="bg-apple-offWhite rounded-3xl p-6 border border-apple-border space-y-5">
                <div>
                  <p className="text-sm font-black text-apple-black">{planInfo?.name || 'Plano Básico (Gratuito)'}</p>
                  {planInfo?.price !== undefined && planInfo.price > 0 ? (
                    <p className="text-xl font-black text-orange-500 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planInfo.price)} <span className="text-[10px] text-apple-muted uppercase font-bold">/mês</span>
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-emerald-500 mt-1">Acesso Gratuito</p>
                  )}
                </div>
                
                <div className="pt-5 border-t border-apple-border space-y-2">
                  <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest flex items-center gap-1.5"><Users size={12} /> Limite de Equipe</p>
                  <p className="text-xs font-black text-apple-black">{planInfo?.max_employees || 5} Colaboradores</p>
                </div>

                <div className="pt-5 border-t border-apple-border space-y-3">
                  <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12} /> Módulos do Sistema</p>
                  <div className="flex flex-wrap gap-1.5">
                    {planInfo?.features?.filter((f: string) => !f.includes('_')).map((f: string) => (
                      <span key={f} className="text-[9px] font-black uppercase tracking-widest bg-white border border-apple-border px-2.5 py-1.5 rounded-lg text-apple-dark shadow-sm">
                        {f}
                      </span>
                    ))}
                    {(!planInfo?.features || planInfo?.features?.length === 0) && (
                      <span className="text-xs italic text-apple-muted font-medium">Acesso Padrão</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* IDENTIDADE VISUAL PREVIEW */}
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Preview Identidade Visual</h4>
              <div className="bg-apple-offWhite rounded-3xl p-6 border border-apple-border space-y-6">
                <div className="flex items-center gap-3">{formData.logo_url ? <img src={formData.logo_url} className="h-8 w-auto" /> : <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: formData.primary_color }} />}<p className="font-bold text-apple-black text-sm">{formData.company || 'Sua Empresa'}</p></div>
                <div className="h-10 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: formData.primary_color }}>EXEMPLO DE BOTÃO</div>
              </div>
            </div>
            
            {/* PORTAL DO CLIENTE */}
            {formData.slug && (
              <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
                <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Seu Portal Público</h4>
                <div className="p-5 bg-orange-50 border border-orange-200 rounded-3xl text-center">
                   <LinkIcon className="mx-auto text-orange-500 mb-2" size={24} />
                   <p className="text-[10px] font-black text-orange-600 mb-4">COMPARTILHE COM CLIENTES</p>
                   <a 
                    href={`${window.location.origin}/emp/${formData.slug}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-bold text-apple-black underline break-all hover:text-orange-500 transition-colors"
                   >
                     {window.location.origin.replace('https://', '')}/emp/{formData.slug}
                   </a>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default Settings;