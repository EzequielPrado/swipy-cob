"use client";

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Save, Loader2, Palette, Globe, ShieldCheck, Upload, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ company: '', full_name: '', logo_url: '', primary_color: '#f97316' });

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) setFormData({ company: data.company || '', full_name: data.full_name || '', logo_url: data.logo_url || '', primary_color: data.primary_color || '#f97316' });
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
      await supabase.from('profiles').update({ company: formData.company, full_name: formData.full_name, logo_url: formData.logo_url, primary_color: formData.primary_color, updated_at: new Date().toISOString() }).eq('id', user?.id);
      showSuccess("Personalização salva!");
    } catch (err: any) { showError(err.message); } finally { setSaving(false); }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div><h2 className="text-3xl font-bold tracking-tight text-apple-black">Identidade & Branding</h2><p className="text-apple-muted mt-1 font-medium">Configure como sua marca aparece para seus clientes no Checkout e Orçamentos.</p></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 space-y-10 shadow-sm">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2"><Globe size={14} className="text-orange-500" /> Perfil Público</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Nome da Empresa</Label><Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl shadow-sm" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold text-apple-dark">Responsável</Label><Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 rounded-xl shadow-sm" /></div>
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-apple-border">
                <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-widest flex items-center gap-2"><Palette size={14} className="text-orange-500" /> Estética (White-label)</h3>
                <div className="flex items-center gap-8">
                  <div className="relative group">
                    {formData.logo_url ? (
                      <div className="w-24 h-24 bg-apple-offWhite border border-apple-border rounded-3xl p-3 flex items-center justify-center overflow-hidden"><img src={formData.logo_url} className="w-full h-full object-contain" /><button type="button" onClick={() => setFormData({...formData, logo_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button></div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-apple-offWhite border-2 border-dashed border-apple-border rounded-3xl flex flex-col items-center justify-center gap-2 text-apple-muted hover:border-orange-500 hover:text-orange-500 transition-all">{uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}<span className="text-[8px] font-black uppercase">Subir Logo</span></button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </div>
                  <div className="space-y-2 flex-1"><Label className="text-xs font-bold text-apple-dark">Cor de Destaque (Botões e Links)</Label><div className="flex gap-3"><input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-12 h-12 rounded-xl bg-apple-offWhite border border-apple-border cursor-pointer overflow-hidden p-0" /><Input value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="bg-apple-offWhite border-apple-border h-12 font-mono uppercase rounded-xl" /></div></div>
                </div>
              </div>
              <button type="submit" disabled={saving || uploading} className="w-full bg-apple-black text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : <Save size={20} className="inline mr-2" />} SALVAR CONFIGURAÇÕES</button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-6">Pré-visualização</h4>
              <div className="bg-apple-offWhite rounded-3xl p-6 border border-apple-border space-y-6">
                <div className="flex items-center gap-3">{formData.logo_url ? <img src={formData.logo_url} className="h-8 w-auto" /> : <div className="w-8 h-8 rounded-lg bg-orange-500" />}<p className="font-bold text-apple-black text-sm">{formData.company || 'Sua Empresa'}</p></div>
                <div className="h-10 rounded-xl flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: formData.primary_color }}>BOTÃO DE PAGAMENTO</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;