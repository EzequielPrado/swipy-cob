"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { FileText, Plus, Search, Loader2, ExternalLink, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError } from '@/utils/toast';
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';

const Fiscal = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('notification_logs').select('*, charges!inner (amount, user_id, customers (name))').eq('type', 'system').ilike('message', '%Fatura Fiscal emitida%').eq('charges.user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) { showError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [user]);

  const filtered = invoices.filter(inv => inv.charges?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const extractUrl = (msg: string) => { const parts = msg.split('Link: '); return parts.length > 1 ? parts[1].trim() : '#'; };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div><h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3"><FileText className="text-orange-500" size={32} /> Módulo Fiscal</h2><p className="text-apple-muted mt-1 font-medium">Controle de notas fiscais e faturas eletrônicas.</p></div>
          <button onClick={() => setIsModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm"><Plus size={18} /> Emitir Fatura</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm flex items-center gap-4"><div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] text-apple-muted font-black uppercase tracking-widest">Status de Emissão</p><p className="text-lg font-black text-apple-black uppercase">Woovi Invoicing Ativo</p></div></div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm flex items-center gap-4"><div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-100"><FileText size={24} /></div><div><p className="text-[10px] text-apple-muted font-black uppercase tracking-widest">Documentos Emitidos</p><p className="text-3xl font-black text-apple-black">{invoices.length}</p></div></div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite"><h3 className="text-xs font-black text-apple-black uppercase tracking-widest">Histórico de Notas</h3></div>
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div> : filtered.length === 0 ? <div className="text-center py-20 text-apple-muted font-medium italic"><p>Nenhuma nota emitida este mês.</p></div> : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Fatura / Cliente</th><th className="px-8 py-5">Emissão</th><th className="px-8 py-5">Valor</th><th className="px-8 py-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-apple-light transition-colors"><td className="px-8 py-5"><p className="text-sm font-bold text-apple-black">NF-e de Serviço</p><p className="text-[10px] text-apple-muted font-bold">{inv.charges?.customers?.name}</p></td><td className="px-8 py-5 text-sm text-apple-dark font-medium">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</td><td className="px-8 py-5 text-sm font-black text-apple-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.charges?.amount || 0)}</td><td className="px-8 py-5 text-right"><a href={extractUrl(inv.message)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-apple-offWhite hover:bg-apple-light border border-apple-border text-[9px] font-black uppercase px-4 py-2 rounded-xl transition-all shadow-sm">Ver PDF <ExternalLink size={12} /></a></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <IssueInvoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchInvoices} />
    </AppLayout>
  );
};

export default Fiscal;