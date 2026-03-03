"use client";

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { Save, Loader2, Palette, Image as ImageIcon, Globe, ShieldCheck, Upload, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    full_name: '',
    logo_url: '',
    primary_color: '#f97316',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) {
      setFormData({
        company: data.company || '',
        full_name: data.full_name || '',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#f97316',
      });
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      showError("Por favor, selecione uma imagem válida.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload para o bucket 'logos'
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      showSuccess("Logo carregada com sucesso!");
    } catch (err: any) {
      showError("Erro no upload: " + err.message + ". Certifique-se de que o bucket 'logos' existe e é público.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          company: formData.company,
          full_name: formData.full_name,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      showSuccess("Configurações salvas com sucesso!");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Personalização</h2>
          <p className="text-zinc-400 mt-1">Configure a identidade visual que seus clientes verão no checkout.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-xl">
              
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={14} className="text-orange-500" /> Dados da Empresa
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Nome da Empresa (Público)</Label>
                    <Input 
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="bg-zinc-950 border-zinc-800 h-11"
                      placeholder="Ex: Minha Loja Ltda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="bg-zinc-950 border-zinc-800 h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Palette size={14} className="text-orange-500" /> Branding (White-label)
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">Logotipo da Empresa</Label>
                    
                    <div className="flex items-center gap-4">
                      {formData.logo_url ? (
                        <div className="relative group">
                          <div className="w-24 h-24 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden p-2">
                            <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, logo_url: ''})}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-orange-500/50 hover:text-orange-500 transition-all group"
                        >
                          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                          <span className="text-[10px] font-bold uppercase">Subir Logo</span>
                        </button>
                      )}
                      
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-zinc-300 font-semibold">Instruções:</p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                          Formatos aceitos: PNG ou SVG (com fundo transparente). Tamanho recomendado: 512x512px.
                        </p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor de Destaque no Checkout</Label>
                    <div className="flex gap-4">
                      <input 
                        type="color" 
                        value={formData.primary_color}
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer overflow-hidden p-0"
                      />
                      <Input 
                        value={formData.primary_color}
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="bg-zinc-950 border-zinc-800 h-12 font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving || uploading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                SALVAR ALTERAÇÕES
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Pré-visualização</h4>
              
              <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">S</div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-zinc-200">{formData.company || 'Sua Empresa'}</p>
                </div>
                
                <div className="space-y-2 py-4">
                  <div className="h-2 w-2/3 bg-zinc-800 rounded-full mx-auto" />
                  <div className="h-6 w-1/2 bg-zinc-800 rounded-full mx-auto" />
                </div>

                <div 
                  className="w-full h-10 rounded-xl flex items-center justify-center text-xs font-bold text-zinc-950"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  BOTÃO DO CHECKOUT
                </div>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-orange-500">
                <ShieldCheck size={18} />
                <h4 className="text-sm font-bold uppercase tracking-tight">Dica de Conversão</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed italic">
                Logos com fundo transparente (PNG) ficam muito mais profissionais no checkout do seu cliente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;