"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Key, Plus, Trash2, Copy, Shield, Mail, Phone, Hash, CreditCard } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface PixKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PixKey = {
  key: string;
  type: string;
  createdAt: string;
};

const typeIcons: Record<string, any> = {
  CPF: CreditCard,
  CNPJ: Shield,
  EMAIL: Mail,
  PHONE: Phone,
  EVP: Hash,
};

const typeLabels: Record<string, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  EVP: 'Chave Aleatória',
  UNKNOWN: 'Desconhecida',
};

const PixKeysModal = ({ isOpen, onClose }: PixKeysModalProps) => {
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [newKeyType, setNewKeyType] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  const fetchPixKeys = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', session?.user?.id)
        .single();

      const provider = profile?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'petta-wallet' : 'woovi-wallet';

      const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}?action=pixkeys`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Erro desconhecido da API');
      }

      if (data.pixKeys) {
        setPixKeys(data.pixKeys);
      }
    } catch (err: any) {
      console.error('Erro ao buscar chaves Pix:', err);
      showError(err.message || 'Erro ao carregar chaves Pix');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyType) {
      showError('Selecione o tipo da chave');
      return;
    }
    if (newKeyType !== 'EVP' && !newKeyValue) {
      showError('Informe o valor da chave');
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', session?.user?.id)
        .single();

      const provider = profile?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'petta-wallet' : 'woovi-wallet';

      const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}?action=create-pixkey`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: newKeyType,
          key: newKeyType === 'EVP' ? undefined : newKeyValue
        })
      });

      const data = await res.json();

      if (data.success) {
        showSuccess('Chave Pix criada com sucesso!');
        setShowForm(false);
        setNewKeyType('');
        setNewKeyValue('');
        fetchPixKeys();
      } else {
        showError(data.message || 'Erro ao criar chave Pix');
      }
    } catch (err: any) {
      showError(err.message || 'Erro ao criar chave Pix');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (key: string) => {
    setDeleting(key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_provider')
        .eq('id', session?.user?.id)
        .single();

      const provider = profile?.preferred_provider || 'woovi';
      const functionName = provider === 'petta' ? 'petta-wallet' : 'woovi-wallet';

      const res = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/${functionName}?action=delete-pixkey`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key })
      });

      const data = await res.json();
      if (data.success) {
        showSuccess('Chave Pix removida!');
        fetchPixKeys();
      } else {
        showError(data.message || 'Erro ao remover chave');
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showSuccess('Chave copiada!');
  };

  useEffect(() => {
    if (isOpen) {
      fetchPixKeys();
      setShowForm(false);
    }
  }, [isOpen]);

  const getPlaceholder = () => {
    switch (newKeyType) {
      case 'CPF': return '000.000.000-00';
      case 'CNPJ': return '00.000.000/0001-00';
      case 'EMAIL': return 'email@empresa.com';
      case 'PHONE': return '+5534999999999';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-apple-white border border-apple-border sm:max-w-[460px] p-0 overflow-hidden rounded-3xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-apple-border" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)' }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-3 text-apple-black">
              <img src="/logo-swipy.png" alt="Swipy" className="w-9 h-9 rounded-xl shadow-lg shadow-orange-500/20" />
              Minhas Chaves Pix
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-apple-muted mt-2 ml-12">Gerencie suas chaves Pix para receber pagamentos.</p>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* KEY LIST */}
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-orange-500" size={28} />
              <p className="text-xs text-apple-muted">Carregando chaves...</p>
            </div>
          ) : pixKeys.length === 0 && !showForm ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                <Key size={24} className="text-orange-400" />
              </div>
              <p className="text-apple-dark font-bold text-sm">Nenhuma chave cadastrada</p>
              <p className="text-apple-muted text-xs mt-1">Crie sua primeira chave Pix para começar a receber.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {pixKeys.map((pk, idx) => {
                  const Icon = typeIcons[pk.type] || Key;
                  return (
                    <motion.div
                      key={pk.key + idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 p-3.5 bg-apple-offWhite border border-apple-border rounded-2xl group hover:border-orange-200 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0 border border-orange-200/50">
                        <Icon size={16} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{typeLabels[pk.type] || pk.type}</p>
                        <p className="text-sm font-semibold text-apple-black truncate mt-0.5 font-mono">{pk.key}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyKey(pk.key)} className="p-1.5 hover:bg-orange-100 rounded-lg transition-all" title="Copiar">
                          <Copy size={14} className="text-orange-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(pk.key)}
                          disabled={deleting === pk.key}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-all"
                          title="Remover"
                        >
                          {deleting === pk.key ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} className="text-red-400" />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* CREATE FORM */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Nova Chave Pix</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-apple-muted">Tipo</Label>
                    <Select onValueChange={setNewKeyType} value={newKeyType}>
                      <SelectTrigger className="bg-apple-white border-apple-border h-10 rounded-xl">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-apple-white border-apple-border">
                        <SelectItem value="CPF">CPF</SelectItem>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                        <SelectItem value="EMAIL">E-mail</SelectItem>
                        <SelectItem value="PHONE">Telefone</SelectItem>
                        <SelectItem value="EVP">Chave Aleatória (EVP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newKeyType && newKeyType !== 'EVP' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                      <Label className="text-xs text-apple-muted">Valor da chave</Label>
                      <Input
                        placeholder={getPlaceholder()}
                        className="bg-apple-white border-apple-border h-10 rounded-xl"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                      />
                    </motion.div>
                  )}

                  {newKeyType === 'EVP' && (
                    <p className="text-[11px] text-apple-muted bg-apple-white p-3 rounded-xl border border-apple-border">
                      Uma chave aleatória (EVP) será gerada automaticamente pelo Banco Central.
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowForm(false); setNewKeyType(''); setNewKeyValue(''); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-apple-muted border border-apple-border hover:bg-apple-offWhite transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5"
                    >
                      {creating && <Loader2 size={14} className="animate-spin" />}
                      Criar Chave
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!showForm && (
          <div className="p-4 border-t border-apple-border">
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Cadastrar Nova Chave
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PixKeysModal;
