"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Loader2, History, TrendingDown, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { cn } from "@/lib/utils";
import EditSupplierModal from '@/components/suppliers/EditSupplierModal';

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const { data: suppData, error: suppError } = await supabase.from('suppliers').select('*').eq('id', id).single();
      if (suppError) throw suppError;
      setSupplier(suppData);
      const { data: expData } = await supabase.from('expenses').select('*').eq('supplier_id', id).order('due_date', { ascending: false });
      if (expData) setExpenses(expData);
    } catch (err: any) { showError(err.message); navigate('/fornecedores'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSupplier();
  }, [id, navigate]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><Link to="/fornecedores" className="p-2 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm"><ArrowLeft size={20} /></Link><div><h2 className="text-2xl font-black text-apple-black tracking-tight">Ficha do Fornecedor</h2><p className="text-[10px] text-orange-500 uppercase font-black tracking-widest mt-1">Gestão de Compras</p></div></div>
          <button onClick={() => setIsEditModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"><Edit3 size={16} /> Editar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm text-center">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-apple-offWhite border-2 border-apple-border flex items-center justify-center text-3xl font-black text-orange-500 shadow-inner mb-6">{supplier.name.charAt(0).toUpperCase()}</div>
              <h3 className="text-xl font-black text-apple-black mb-1">{supplier.name}</h3>
              <p className="text-xs text-apple-muted font-bold mb-10">{supplier.tax_id || 'CNPJ não informado'}</p>
              <div className="space-y-4 text-left border-t border-apple-border pt-8">
                <div className="flex items-center gap-3 text-sm text-apple-dark font-medium"><Mail size={16} className="text-orange-500" /><span>{supplier.email || 'N/A'}</span></div>
                <div className="flex items-center gap-3 text-sm text-apple-dark font-medium"><Phone size={16} className="text-orange-500" /><span>{supplier.phone || 'N/A'}</span></div>
                <div className="flex items-start gap-3 text-sm text-apple-dark font-medium"><MapPin size={16} className="text-orange-500 mt-1 shrink-0" /><span className="leading-relaxed">{supplier.address?.street || 'Sem endereço'}</span></div>
              </div>
            </div>
            <div className="bg-orange-500 p-8 rounded-[2.5rem] shadow-2xl text-white">
               <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingDown size={14} /> Total Pago em Notas</h4>
               <p className="text-4xl font-black tracking-tighter">{currency.format(expenses.filter(e => e.status === 'pago').reduce((acc, c) => acc + Number(c.amount), 0))}</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-apple-border bg-apple-offWhite flex justify-between items-center"><h4 className="text-[10px] font-black text-apple-black uppercase tracking-[0.2em] flex items-center gap-2"><History size={16} className="text-orange-500" /> Histórico de Notas e Despesas</h4></div>
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Vencimento</th><th className="px-8 py-5">Descrição</th><th className="px-8 py-5">Valor</th><th className="px-8 py-5 text-right">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-apple-light transition-colors"><td className="px-8 py-5 text-sm font-bold text-apple-dark">{new Date(exp.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td className="px-8 py-5 text-sm text-apple-muted font-medium truncate max-w-[200px]">{exp.description}</td><td className="px-8 py-5 text-sm font-black text-apple-black">{currency.format(exp.amount)}</td><td className="px-8 py-5 text-right"><span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", exp.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{exp.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EditSupplierModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSuccess={fetchSupplier} supplier={supplier} />
    </AppLayout>
  );
};

export default SupplierDetail;