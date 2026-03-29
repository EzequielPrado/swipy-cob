"use client";

import React, { useState } from 'react';
import { Search, Loader2, Building2, CheckCircle2, ExternalLink, Mail, Phone, ShieldCheck, FileText, AlertCircle, ArrowRight, User } from 'lucide-react';
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
    
    // Limpeza rigorosa: remove tudo que não for número
    const cleanInput = taxId.replace(/\D/g, '').trim();
    
    if (cleanInput.length < 11) {
      showError("Por favor, insira um CPF ou CNPJ completo.");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // 1. Localizar registros de cliente com este documento em qualquer lojista
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id')
        .or(`tax_id.eq.${cleanInput},tax_id.ilike.%${cleanInput}%`);

      if (custError) throw custError;

      if (!customers || customers.length === 0) {
        setResults([]);
        return;
      }

      // 2. Buscar cobranças pendentes para estes IDs encontrados
      const customerIds = customers.map(c => c.id);
      const { data: charges, error: chargeError } = await supabase
        .from('charges')
        .select(`
          *, 
          profiles:user_id(company, full_name, logo_url, primary_color), 
          customers(name, tax_id)
        `)
        .in('customer_id', customerIds)
        .neq('status', 'pago') 
        .order('due_date', { ascending: true });

      if (chargeError) throw chargeError;
      setResults(charges || []);

    } catch (err: any) {
      console.error("[Portal] Erro de consulta:", err.message);
      showError("Não foi possível realizar a consulta agora.");
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center py-12 px-6 font-sans antialiased">
      <div className="w-full max-w-3xl">
        
        {/* CABEÇALHO PORTAL */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-3 mb-8 bg-white p-3 rounded-2xl shadow-sm border border-apple-border">
             <img src="/logo-swipy.png" alt="Swipy" className="w-8 h-8 object-contain" />
             <span className="text-xl font-black tracking-tighter">Portal do Cliente</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-apple-black">Suas faturas em um só lugar.</h1>
          <p className="text-[#86868B] text-lg font-medium max-w-lg mx-auto">Consulte seus débitos pendentes e realize pagamentos instantâneos via PIX.</p>
        </div>

        {/* CAMPO DE BUSCA MAGNÉTICO */}
        <div className="bg-white border border-apple-border p-2 md:p-3 rounded-[2.5rem] shadow-xl shadow-black/5 mb-16 flex flex-col md:flex-row gap-2 transition-all focus-within:ring-4 focus-within:ring-orange-500/10">
          <div className="relative flex-1">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#86868B]">
              <Search size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Digite seu CPF ou CNPJ"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full bg-transparent border-none rounded-3xl pl-16 pr-6 py-5 text-xl focus:ring-0 outline-none font-bold placeholder:text-[#D2D2D7] text-apple-black"
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black px-10 py-5 rounded-[2rem] transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Consultar"}
          </button>
        </div>

        {/* LISTA DE RESULTADOS */}
        {searched && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={40} />
                <p className="text-sm font-bold text-apple-muted uppercase tracking-widest">Sincronizando faturas...</p>
              </div>
            ) : results && results.length === 0 ? (
              <div className="bg-white border border-apple-border p-20 rounded-[3rem] text-center shadow-sm">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100">
                  <CheckCircle2 className="text-emerald-500" size={48} />
                </div>
                <h3 className="text-2xl font-black text-apple-black">Tudo regularizado!</h3>
                <p className="text-apple-muted mt-2 font-medium">Não encontramos cobranças pendentes para o documento **{taxId}**.</p>
              </div>
            ) : results && (
              <div className="grid grid-cols-1 gap-6">
                {results.map((charge) => {
                   const primaryColor = charge.profiles?.primary_color || '#f97316';
                   return (
                    <div key={charge.id} className="bg-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row group">
                      
                      {/* DETALHES DO EMISSOR */}
                      <div className="flex-1 p-8 md:p-10 space-y-8">
                        <div className="flex items-start gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] border border-apple-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-2">
                            {charge.profiles?.logo_url ? (
                              <img src={charge.profiles.logo_url} className="w-full h-full object-contain" alt="Logo" />
                            ) : <Building2 size={28} className="text-[#D2D2D7]" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: primaryColor }}>Empresa Emissora</p>
                            <h4 className="text-2xl font-black text-apple-black leading-tight">{charge.profiles?.company || charge.profiles?.full_name}</h4>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-5">
                               <span className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                charge.status === 'atrasado' ? "bg-red-50 text-red-600 border-red-100" : "bg-orange-50 text-orange-600 border-orange-100"
                              )}>
                                {charge.status === 'atrasado' ? 'Vencida' : 'Pendente'}
                              </span>
                              <span className="text-[10px] text-apple-muted font-bold uppercase tracking-widest flex items-center gap-2 bg-[#F5F5F7] px-4 py-1.5 rounded-full border border-apple-border">
                                <Calendar size={12} className="text-orange-500" />
                                Vencimento: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {charge.description && (
                          <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-apple-border flex gap-3 items-start">
                             <FileText size={16} className="text-[#86868B] mt-0.5" />
                             <div>
                                <p className="text-[9px] font-black text-apple-muted uppercase tracking-widest mb-1">Referência do Pagamento</p>
                                <p className="text-sm text-apple-dark font-medium leading-relaxed italic">"{charge.description}"</p>
                             </div>
                          </div>
                        )}
                      </div>

                      {/* VALOR E CALL TO ACTION */}
                      <div className="bg-[#F5F5F7]/50 border-t md:border-t-0 md:border-l border-apple-border p-10 flex flex-col justify-between items-center md:items-end text-center md:text-right min-w-[280px] group-hover:bg-white transition-colors">
                        <div className="w-full">
                          <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Valor da Fatura</p>
                          <p className="text-5xl font-black text-apple-black tracking-tighter">
                            {currencyFormatter.format(charge.amount)}
                          </p>
                        </div>
                        
                        <Link 
                          to={`/pagar/${charge.id}`}
                          style={{ backgroundColor: primaryColor }}
                          className="w-full mt-10 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 text-sm transition-all active:scale-95 shadow-xl hover:brightness-110"
                        >
                          PAGAR COM PIX <ArrowRight size={20} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RODAPÉ DE CONFIANÇA */}
        <div className="mt-24 pt-12 border-t border-apple-border flex flex-col items-center gap-6 opacity-60">
          <div className="flex items-center text-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#86868B] max-w-md">
            <ShieldCheck size={20} className="shrink-0 text-emerald-600" /> 
            Ambiente Seguro processado pela Swipy Fintech e Instituição de Pagamento Woovi.
          </div>
          <div className="flex gap-8 text-[9px] font-bold text-apple-muted uppercase tracking-widest">
             <Link to="/" className="hover:text-apple-black">Sobre a Swipy</Link>
             <span className="cursor-default">Ajuda</span>
             <span className="cursor-default">Termos de Uso</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;