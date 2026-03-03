"use client";

import React, { useState } from 'react';
import { Search, Loader2, Receipt, Building2, CheckCircle2, ExternalLink, UserCircle, Save, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

const ClientPortal = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [searched, setSearched] = useState(false);
  
  // Estado para edição de contato
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) return;

    setLoading(true);
    setSearched(true);

    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('tax_id', cleanCpf);

      if (!customers || customers.length === 0) {
        setResults([]);
        return;
      }

      const customerIds = customers.map(c => c.id);
      const { data: charges } = await supabase
        .from('charges')
        .select('*, profiles(company, full_name), customers(email, phone)')
        .in('customer_id', customerIds)
        .order('due_date', { ascending: false });

      setResults(charges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (charge: any) => {
    setEditingId(charge.id);
    setEditData({
      email: charge.customers.email || '',
      phone: charge.customers.phone || ''
    });
  };

  const handleUpdateContact = async (customerId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          email: editData.email,
          phone: editData.phone
        })
        .eq('id', customerId);

      if (error) throw error;
      showSuccess("Dados atualizados com sucesso!");
      setEditingId(null);
      // Recarrega os dados
      handleSearch({ preventDefault: () => {} } as any);
    } catch (err: any) {
      showError("Erro ao atualizar dados: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-6 font-sans">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
             <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-bold text-zinc-950 text-2xl shadow-xl shadow-orange-500/20">S</div>
             <span className="text-3xl font-bold tracking-tight">Swipy <span className="text-orange-500">Cob</span></span>
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Central do Pagador</h1>
          <p className="text-zinc-500 max-w-md mx-auto">Consulte suas faturas de todos os lojistas parceiros em um só lugar.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl mb-12">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
              <input 
                type="text" 
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-lg focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-mono placeholder:text-zinc-800"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || cpf.replace(/\D/g, '').length < 11}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/10 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Consultar"}
            </button>
          </form>
        </div>

        {searched && !loading && results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {results.length === 0 ? (
              <div className="bg-zinc-900/30 border border-dashed border-zinc-800 p-16 rounded-[2rem] text-center">
                <CheckCircle2 className="mx-auto text-zinc-800 mb-6" size={64} />
                <h3 className="text-xl font-bold text-zinc-400">Nenhuma pendência encontrada</h3>
                <p className="text-zinc-600 text-sm mt-2">Se você acredita que isso é um erro, entre em contato com o lojista.</p>
              </div>
            ) : (
              results.map((charge) => (
                <div key={charge.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all shadow-lg">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 border border-zinc-700">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Empresa emissora</p>
                          <h4 className="text-xl font-bold text-zinc-100">{charge.profiles?.company || charge.profiles?.full_name}</h4>
                          <div className="flex items-center gap-3 mt-2">
                             <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                              charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            )}>
                              {charge.status}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                              Vence em {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Painel de Contato */}
                      <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50">
                        {editingId === charge.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase">Seu E-mail</label>
                                <input 
                                  value={editData.email}
                                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500/50"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase">Seu Telefone</label>
                                <input 
                                  value={editData.phone}
                                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500/50"
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => handleUpdateContact(charge.customer_id)}
                              disabled={saving}
                              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                            >
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              SALVAR MEUS DADOS
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4 text-[10px] text-zinc-500 font-medium">
                               <span className="flex items-center gap-1.5"><Mail size={12}/> {charge.customers.email || '---'}</span>
                               <span className="flex items-center gap-1.5"><Phone size={12}/> {charge.customers.phone || '---'}</span>
                            </div>
                            <button onClick={() => startEditing(charge)} className="text-[10px] text-orange-500 font-bold hover:underline">ATUALIZAR CONTATO</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end md:min-w-[180px] border-t md:border-t-0 md:border-l border-zinc-800 pt-6 md:pt-0 md:pl-8">
                      <div className="text-right w-full">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor Total</p>
                        <p className="text-3xl font-bold text-zinc-100">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                        </p>
                      </div>
                      
                      {charge.status !== 'pago' && (
                        <Link 
                          to={`/pagar/${charge.id}`}
                          className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-lg shadow-orange-500/10"
                        >
                          PAGAR AGORA <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-20 flex flex-col items-center gap-4 opacity-30">
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            <span>Segurança</span>
            <div className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Transparência</span>
            <div className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Swipy Cob</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;