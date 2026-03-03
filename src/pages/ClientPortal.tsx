"use client";

import React, { useState } from 'react';
import { Search, Loader2, Receipt, Building2, CheckCircle2, ExternalLink, UserCircle, Save, Phone, Mail, ShieldCheck, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

const ClientPortal = () => {
  const [taxId, setTaxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [searched, setSearched] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpa o que o usuário digitou
    const cleanInput = taxId.replace(/\D/g, '').trim();
    
    if (cleanInput.length < 11) {
      showError("Insira um CPF ou CNPJ válido");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      console.log(`[Portal] Buscando por documento: ${cleanInput}`);

      // 1. Localizar o cliente
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, tax_id')
        .or(`tax_id.eq.${cleanInput},tax_id.ilike.%${cleanInput}%`);

      if (custError) throw custError;

      if (!customers || customers.length === 0) {
        console.log("[Portal] Nenhum cliente encontrado com este documento.");
        setResults([]);
        return;
      }

      console.log(`[Portal] Encontrado(s) ${customers.length} cliente(s) vinculados.`);

      // 2. Buscar as cobranças. CORREÇÃO: Usamos o alias "profiles:user_id" para forçar o join
      const customerIds = customers.map(c => c.id);
      const { data: charges, error: chargeError } = await supabase
        .from('charges')
        .select(`
          *, 
          profiles:user_id(company, full_name, logo_url, primary_color), 
          customers(email, phone, name)
        `)
        .in('customer_id', customerIds)
        .order('due_date', { ascending: false });

      if (chargeError) throw chargeError;

      console.log(`[Portal] ${charges?.length || 0} cobrança(s) localizada(s).`);
      setResults(charges || []);

    } catch (err: any) {
      console.error("[Portal] Erro na busca:", err.message);
      showError("Erro ao consultar faturas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async (customerId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ email: editData.email, phone: editData.phone })
        .eq('id', customerId);

      if (error) throw error;
      showSuccess("Dados atualizados com sucesso!");
      setEditingId(null);
      handleSearch({ preventDefault: () => {} } as any);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
             <div className="w-14 h-14 bg-orange-500 rounded-[1.2rem] flex items-center justify-center font-bold text-zinc-950 text-3xl shadow-2xl shadow-orange-500/20">S</div>
             <span className="text-4xl font-bold tracking-tighter">Swipy <span className="text-orange-500">Cob</span></span>
          </div>
          <h1 className="text-5xl font-extrabold mb-4 tracking-tighter">Central do Pagador</h1>
          <p className="text-zinc-500 text-lg">Consulte suas faturas e mantenha seus pagamentos em dia.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] shadow-2xl mb-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full" />
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 relative z-10">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={24} />
              <input 
                type="text" 
                placeholder="Insira seu CPF ou CNPJ"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl pl-14 pr-6 py-5 text-xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-mono"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold px-10 py-5 rounded-3xl transition-all shadow-xl shadow-orange-500/20 uppercase tracking-widest text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : "Consultar Faturas"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-zinc-500 font-medium">Digite apenas os números do seu documento.</p>
        </div>

        {searched && !loading && results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {results.length === 0 ? (
              <div className="bg-zinc-900/30 border border-dashed border-zinc-800 p-20 rounded-[3rem] text-center">
                <CheckCircle2 className="mx-auto text-zinc-800 mb-6" size={80} />
                <h3 className="text-2xl font-bold text-zinc-400">Nenhuma fatura encontrada</h3>
                <p className="text-zinc-600 mt-2">Verifique se o documento está correto ou contate o emissor.</p>
              </div>
            ) : (
              results.map((charge) => (
                <div key={charge.id} className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden hover:border-zinc-600 transition-all shadow-2xl">
                  <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between gap-10">
                    <div className="flex-1 space-y-8">
                      <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {charge.profiles?.logo_url ? (
                            <img src={charge.profiles.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                          ) : <Building2 size={32} className="text-zinc-500" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-2">Empresa Emissora</p>
                          <h4 className="text-2xl font-bold text-zinc-100">{charge.profiles?.company || charge.profiles?.full_name}</h4>
                          <div className="flex items-center gap-4 mt-3">
                             <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                              charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            )}>
                              {charge.status}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              Vencimento: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800/50">
                        {editingId === charge.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase ml-2">E-mail</label>
                                <input 
                                  value={editData.email}
                                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase ml-2">WhatsApp</label>
                                <input 
                                  value={editData.phone}
                                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none"
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => handleUpdateContact(charge.customer_id)}
                              className="w-full bg-zinc-100 text-zinc-950 text-[10px] font-bold py-3 rounded-xl"
                            >
                              SALVAR CONTATOS
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-6 text-[11px] text-zinc-500 font-medium">
                               <span className="flex items-center gap-2"><Mail size={14} className="text-zinc-700" /> {charge.customers.email || '---'}</span>
                               <span className="flex items-center gap-2"><Phone size={14} className="text-zinc-700" /> {charge.customers.phone || '---'}</span>
                            </div>
                            <button 
                              onClick={() => {
                                setEditingId(charge.id);
                                setEditData({ email: charge.customers.email, phone: charge.customers.phone });
                              }} 
                              className="text-[10px] text-orange-500 font-bold"
                            >
                              EDITAR
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end md:min-w-[220px] border-t md:border-t-0 md:border-l border-zinc-800 pt-8 md:pt-0 md:pl-10">
                      <div className="text-right w-full">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2">Valor da Fatura</p>
                        <p className="text-4xl font-black text-zinc-100">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                        </p>
                      </div>
                      
                      {charge.status !== 'pago' && (
                        <Link 
                          to={`/pagar/${charge.id}`}
                          className="w-full mt-8 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-5 rounded-3xl flex items-center justify-center gap-2 text-xs"
                        >
                          PAGAR AGORA <ExternalLink size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-24 flex flex-col items-center gap-4 opacity-30">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-600">
            <ShieldCheck size={16} /> Ambiente Seguro
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;