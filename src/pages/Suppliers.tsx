"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Building2, Trash2, Mail, Phone, Tag, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import AddSupplierModal from '@/components/suppliers/AddSupplierModal';

const Suppliers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').eq('user_id', user.id).order('name', { ascending: true });
    if (data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, [user]);

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div><h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3"><Building2 className="text-orange-500" size={32} /> Fornecedores</h2><p className="text-apple-muted mt-1 font-medium">Gestão de compras e parceiros de suprimentos.</p></div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm"><Plus size={18} /> Novo Parceiro</button>
        </div>

        <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar fornecedor..." className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm" /></div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Fornecedor</th><th className="px-8 py-5">Categoria</th><th className="px-8 py-5">Contato</th><th className="px-8 py-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filtered.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/fornecedores/${s.id}`)} className="hover:bg-apple-light transition-colors cursor-pointer group"><td className="px-8 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-apple-offWhite border border-apple-border flex items-center justify-center text-orange-500 font-black">{s.name.charAt(0).toUpperCase()}</div><div><p className="text-sm font-bold text-apple-black group-hover:text-orange-500 transition-colors flex items-center gap-2">{s.name} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" /></p><p className="text-[10px] text-apple-muted font-bold font-mono">{s.tax_id}</p></div></div></td><td className="px-8 py-5"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-apple-offWhite border border-apple-border text-apple-dark"><Tag size={10} /> {s.category || 'Geral'}</span></td><td className="px-8 py-5"><p className="text-xs text-apple-dark font-medium">{s.email || '---'}</p></td><td className="px-8 py-5 text-right"><button onClick={(e) => { e.stopPropagation(); if (confirm('Remover?')) supabase.from('suppliers').delete().eq('id', s.id).then(() => fetchSuppliers()); }} className="p-2 text-apple-muted hover:text-red-500"><Trash2 size={18}/></button></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <AddSupplierModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchSuppliers} />
    </AppLayout>
  );
};

export default Suppliers;