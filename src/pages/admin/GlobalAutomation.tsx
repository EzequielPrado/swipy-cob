"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  MessageSquare, 
  Settings2, 
  Plus, 
  Trash2, 
  Save, 
  Smartphone, 
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess } from '@/utils/toast';

const GlobalAutomation = () => {
  const [triggers, setTriggers] = useState([
    { id: 1, day: 'D-3', name: 'vencimento_proximo', label: 'Lembrete de Vencimento', msg: 'Olá {{1}}, sua fatura de {{2}} vence em 3 dias. Pague aqui: {{3}}' },
    { id: 2, day: 'D0', name: 'cobranca_vencendo_hoje', label: 'Aviso de Vencimento Hoje', msg: 'Bom dia {{1}}! Sua fatura de {{2}} vence hoje. Link: {{3}}' },
    { id: 3, day: 'D+1', name: 'aviso_atraso', label: 'Primeiro Aviso de Atraso', msg: 'Olá {{1}}, notamos que seu pagamento de {{2}} ainda não caiu. Link: {{3}}' },
  ]);

  const handleSave = () => {
    showSuccess("Configurações da Régua Global salvas com sucesso!");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuração da Régua Global</h2>
          <p className="text-zinc-400 mt-1">Gerencie os templates de WhatsApp (Meta) que serão usados por todos os lojistas.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                  <MessageSquare size={18} className="text-orange-500" /> Templates Ativos na Meta
                </h3>
                <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-zinc-700">
                  <Plus size={14} /> ADICIONAR GATILHO
                </button>
              </div>

              <div className="divide-y divide-zinc-800">
                {triggers.map((t) => (
                  <div key={t.id} className="p-6 space-y-4 hover:bg-zinc-950/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-10 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center font-bold text-orange-500 text-xs">
                          {t.day}
                        </div>
                        <div className="flex-1">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Nome do Template (Meta)</Label>
                          <Input 
                            defaultValue={t.name} 
                            className="bg-zinc-950 border-zinc-800 h-9 font-mono text-xs text-orange-400"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Título Interno</Label>
                          <Input 
                            defaultValue={t.label} 
                            className="bg-zinc-950 border-zinc-800 h-9"
                          />
                        </div>
                      </div>
                      <button className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div>
                      <Label className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Texto de Apoio (Simulação)</Label>
                      <Textarea 
                        defaultValue={t.msg} 
                        className="bg-zinc-950 border-zinc-800 text-xs text-zinc-400 min-h-[60px]"
                      />
                      <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
                        <Info size={10} /> Variáveis: {"{{1}}"} = Nome, {"{{2}}"} = Valor, {"{{3}}"} = Link de Pagamento.
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800">
                <button 
                  onClick={handleSave}
                  className="w-full bg-orange-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
                >
                  <Save size={18} /> Salvar Alterações na Régua
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-200 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">
                <Settings2 size={16} className="text-orange-500" /> Status da Integração
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone size={18} className="text-emerald-500" />
                    <span className="text-sm font-semibold">API Meta</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">ATIVO</span>
                </div>
                
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Phone Number ID</p>
                  <p className="text-xs font-mono text-zinc-300">*********3421</p>
                </div>

                <div className="flex items-start gap-3 p-4 bg-orange-500/5 rounded-xl border border-orange-500/10">
                  <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    A alteração do <span className="text-zinc-300 font-bold">Access Token</span> e <span className="text-zinc-300 font-bold">ID do Telefone</span> deve ser feita diretamente nas <span className="text-orange-500">Secrets do Supabase</span> para garantir a criptografia das chaves.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-200 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                <HelpCircle size={16} className="text-zinc-500" /> Ajuda com Templates
              </h3>
              <ul className="space-y-3">
                <li className="text-[10px] text-zinc-500 leading-relaxed">
                  1. Crie o template no painel <span className="text-blue-400">Meta Business Suite</span>.
                </li>
                <li className="text-[10px] text-zinc-500 leading-relaxed">
                  2. Aguarde a aprovação da Meta (geralmente 2 a 12 horas).
                </li>
                <li className="text-[10px] text-zinc-500 leading-relaxed">
                  3. Copie o nome EXATO e cole aqui no painel.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default GlobalAutomation;