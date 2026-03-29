"use client";

import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  FileArchive, 
  Download, 
  Loader2, 
  CalendarDays, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  History,
  FileJson,
  Package
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from '@/utils/toast';

const FILE_TYPES = [
  { id: 'sintegra', label: 'Sintegra (Arquivo Magnético)', icon: FileText, desc: 'Arquivo .TXT posicional para validação na SEFAZ.' },
  { id: 'xml_batch', label: 'Lote de XMLs (NF-e)', icon: FileArchive, desc: 'Compactado com todos os XMLs de notas do mês.' },
  { id: 'inventory', label: 'Livro de Inventário (P7)', icon: Package, desc: 'Posição de estoque para fechamento de balanço.' }
];

const FiscalFiles = () => {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('sintegra');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    today.setDate(1);
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    d.setDate(1);
    for(let i=0; i<12; i++) {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() - 1);
    }
    return options;
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    // Simulação de chamada para Edge Function que processaria a lógica do Sintegra
    setTimeout(() => {
      setLoading(false);
      showSuccess(`Arquivo ${selectedType.toUpperCase()} gerado com sucesso!`);
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div>
          <h2 className="text-3xl font-black text-apple-black flex items-center gap-3">
            <FileArchive className="text-orange-500" size={32} /> Arquivos Fiscais
          </h2>
          <p className="text-apple-muted mt-1 font-medium">Geração de obrigações acessórias e exportação para contabilidade.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CONFIGURAÇÃO DE GERAÇÃO */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-[10px] font-black text-apple-muted uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <CalendarDays size={16} className="text-orange-500" /> Configurar Exportação
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-apple-dark ml-1">Período de Competência</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-14 bg-apple-offWhite border-apple-border rounded-2xl font-bold text-orange-500 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-apple-white border-apple-border">
                      {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-apple-muted px-1">Recomendamos gerar após o dia 5 do mês subsequente.</p>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold text-apple-dark ml-1">Tipo de Arquivo</label>
                   <div className="space-y-3">
                      {FILE_TYPES.map(type => (
                        <button 
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group",
                            selectedType === type.id ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/10" : "bg-apple-offWhite border-apple-border hover:border-apple-dark"
                          )}
                        >
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                             selectedType === type.id ? "bg-orange-500 text-white" : "bg-white text-apple-muted group-hover:text-apple-black shadow-sm"
                           )}>
                              <type.icon size={20} />
                           </div>
                           <div>
                              <p className={cn("text-sm font-black", selectedType === type.id ? "text-orange-600" : "text-apple-black")}>{type.label}</p>
                              <p className="text-[10px] text-apple-muted font-medium leading-tight">{type.desc}</p>
                           </div>
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-apple-border">
                 <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-apple-black text-white font-black py-5 rounded-3xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
                    SOLICITAR GERAÇÃO DO ARQUIVO
                 </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start gap-4">
               <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={24} />
               <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">Conformidade Garantida</h4>
                  <p className="text-xs text-blue-800 leading-relaxed mt-1 font-medium">
                    Os arquivos gerados seguem rigorosamente o Manual de Orientação do Convênio ICMS 57/95 e atualizações. 
                    Lembre-se de validar o arquivo no programa da SEFAZ antes da transmissão.
                  </p>
               </div>
            </div>
          </div>

          {/* HISTÓRICO DE DOWNLOADS */}
          <div className="space-y-6">
             <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
                <h3 className="text-xs font-bold text-apple-black uppercase tracking-widest mb-8 flex items-center gap-2">
                  <History size={16} className="text-orange-500" /> Exportações Recentes
                </h3>
                
                <div className="flex-1 space-y-4">
                   {[1, 2].map((_, i) => (
                     <div key={i} className="p-4 bg-apple-offWhite border border-apple-border rounded-2xl flex items-center justify-between group hover:border-orange-200 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-white border border-apple-border flex items-center justify-center text-emerald-500 shadow-sm">
                              <CheckCircle2 size={18} />
                           </div>
                           <div>
                              <p className="text-xs font-black text-apple-black">Sintegra_2024_04.txt</p>
                              <p className="text-[9px] text-apple-muted font-bold uppercase">Gerado em 10/05/2024</p>
                           </div>
                        </div>
                        <button className="p-2 text-apple-muted hover:text-orange-500 transition-colors">
                           <Download size={16} />
                        </button>
                     </div>
                   ))}
                   
                   <div className="py-12 text-center opacity-30 italic">
                      <p className="text-[10px] font-bold uppercase tracking-widest">Fim do histórico disponível</p>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default FiscalFiles;