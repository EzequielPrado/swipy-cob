"use client";

import React, { useState } from 'react';
import { Search, Loader2, Building2, CheckCircle2, ExternalLink, Mail, Phone, ShieldCheck, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { showError } from '@/utils/toast';

const ClientPortal = () => {
  const [taxId, setTaxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanInput = taxId.replace(/\D/g, '').trim();
    
    if (cleanInput.length < 11) {
      showError("Insira um CPF ou CNPJ válido");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // 1. Localizar o cliente
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id')
        .or(`tax_id.eq.${cleanInput},tax_id.ilike.%${cleanInput}%`);

      if (custError) throw custError;

      if (!customers || customers.length === 0) {
        setResults([]);
        return;
      }

      // 2. Buscar APENAS cobranças que NÃO estão pagas
      const customerIds = customers.map(c => c.id);
      const { data: charges, error: chargeError } = await supabase
        .from('charges')
        .select(`
          *, 
          profiles:user_id(company, full_name, logo_url, primary_color), 
          customers(email, phone, name)
        `)
        .in('customer_id', customerIds)
        .neq('status', 'pago') 
        .order('due_date', { ascending: true });

      if (chargeError) throw chargeError;
      setResults(charges || []);

    } catch (err: any) {
      console.error("[Portal] Erro:", err.message);
      showError("Erro ao consultar faturas.");
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-apple-light text-apple-black flex flex-col items-center py-12 px-6 font-sans">
      <div className="w-full max-w-3xl">
        
        {/* CABEÇALHO */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
             <img src="/logo-swipy.png" alt="Swipy" className="w-10 h-10 object-contain" />
             <span className="text-3xl font-black tracking-tighter">Swipy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-apple-black">Regularize seus débitos</h1>
          <p className="text-apple-muted text-lg font-medium">Acesse suas faturas em aberto e realize o pagamento via PIX.</p>
        </div>

        {/* BUSCA ESTILO APPLE */}
        <div className="bg-apple-white border border-apple-border p-2 md:p-3 rounded-[2.5rem] shadow-sm mb-12 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-apple-muted">
              <Search size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Digite seu CPF ou CNPJ"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full bg-transparent border-none rounded-3xl pl-16 pr-6 py-5 text-xl focus:ring-0 outline-none font-bold text-apple-black placeholder:text-apple-muted"
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black px-10 py-5 rounded-[2rem] transition-all shadow-lg shadow-orange-500/10 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Consultar"}
          </button>
        </div>

        {/* RESULTADOS */}
        {searched && !loading && results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {results.length === 0 ? (
              <div className="bg-apple-white border border-apple-border p-16 rounded-[2.5rem] text-center shadow-sm">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                  <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-apple-black">Tudo em dia!</h3>
                <p className="text-apple-muted mt-2 font-medium">Não encontramos faturas pendentes para o documento informado.</p>
              </div>
            ) : (
              results.map((charge) => (
                <div key={charge.id} className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm hover:border-orange-200 transition-all flex flex-col md:flex-row">
                  
                  {/* LADO INFO */}
                  <div className="flex-1 p-8 md:p-10 space-y-8">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-apple-offWhite border border-apple-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-2">
                        {charge.profiles?.logo_url ? (
                          <img src={charge.profiles.logo_url} className="w-full h-full object-contain" alt="Logo" />
                        ) : <Building2 size={24} className="text-apple-muted" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Cobrante</p>
                        <h4 className="text-xl font-black text-apple-black leading-tight">{charge.profiles?.company || charge.profiles?.full_name}</h4>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                           <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            charge.status === 'atrasado' ? "bg-red-50 text-red-600 border-red-100" : "bg-orange-50 text-orange-600 border-orange-100"
                          )}>
                            {charge.status === 'atrasado' ? 'Vencida' : 'Pendente'}
                          </span>
                          <span className="text-[10px] text-apple-muted font-bold uppercase tracking-widest flex items-center gap-1.5 bg-apple-offWhite px-3 py-1 rounded-full border border-apple-border">
                            Vencimento: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {charge.description && (
                      <div className="bg-apple-offWhite p-4 rounded-2xl border border-apple-border">
                         <p className="text-[9px] font-black text-apple-muted uppercase tracking-widest mb-1 flex items-center gap-2"><FileText size={12} /> Referência</p>
                         <p className="text-xs text-apple-dark font-medium italic">{charge.description}</p>
                      </div>
                    )}
                  </div>

                  {/* LADO VALOR E AÇÃO */}
                  <div className="bg-apple-offWhite border-t md:border-t-0 md:border-l border-apple-border p-8 md:p-10 flex flex-col justify-between items-center md:items-end text-center md:text-right min-w-[240px]">
                    <div className="w-full">
                      <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Valor da Fatura</p>
                      <p className="text-4xl font-black text-apple-black tracking-tighter">
                        {currencyFormatter.format(charge.amount)}
                      </p>
                    </div>
                    
                    <Link 
                      to={`/pagar/${charge.id}`}
                      className="w-full mt-8 bg-apple-black hover:bg-zinc-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all active:scale-95 shadow-xl"
                    >
                      PAGAR AGORA <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RODAPÉ DE SEGURANÇA */}
        <div className="mt-20 flex flex-col items-center gap-6 opacity-40">
          <div className="flex items-center text-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-apple-muted max-w-sm">
            <ShieldCheck size={18} className="shrink-0 text-emerald-600" /> 
            Ambiente Seguro processado pela Swipy Fintech e Instituição de Pagamento Woovi.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;