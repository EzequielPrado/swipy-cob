"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Clock,
  History,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { cn } from "@/lib/utils";

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    totalPaid: 0,
    pending: 0,
    overdue: 0,
    count: 0
  });

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  useEffect(() => {
    const fetchSupplierData = async () => {
      setLoading(true);
      try {
        // 1. Dados do Fornecedor
        const { data: suppData, error: suppError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', id)
          .single();

        if (suppError || !suppData) throw new Error("Fornecedor não encontrado");
        setSupplier(suppData);

        // 2. Histórico de Despesas / Compras
        const { data: expData } = await supabase
          .from('expenses')
          .select('*')
          .eq('supplier_id', id)
          .order('due_date', { ascending: false });

        if (expData) {
          setExpenses(expData);
          
          let paid = 0;
          let pending = 0;
          let overdue = 0;
          const today = new Date().toISOString().split('T')[0];

          expData.forEach(e => {
            const amount = Number(e.amount);
            if (e.status === 'pago') paid += amount;
            else {
              if (e.due_date < today) overdue += amount;
              else pending += amount;
            }
          });

          setMetrics({
            totalPaid: paid,
            pending,
            overdue,
            count: expData.length
          });
        }

      } catch (err: any) {
        showError(err.message);
        navigate('/fornecedores');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();
  }, [id, navigate]);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;
  if (!supplier) return null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/fornecedores" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ficha do Fornecedor</h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase font-mono tracking-widest">Painel de Compras</p>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700">
            {supplier.category || 'Geral'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUNA ESQUERDA: PERFIL */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl text-center">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-3xl font-black text-orange-500 shadow-2xl mb-6">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-1">{supplier.name}</h3>
              <p className="text-xs text-zinc-500 font-mono mb-8">{supplier.tax_id || 'CNPJ não informado'}</p>
              
              <div className="space-y-4 text-left border-t border-zinc-800 pt-8">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Mail size={16} className="text-orange-500" />
                  <span className="truncate">{supplier.email || 'Sem e-mail'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Phone size={16} className="text-orange-500" />
                  <span>{supplier.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-zinc-300">
                  <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">
                    {supplier.address?.street ? (
                      <>{supplier.address.street}<br/>{supplier.address.city || ''}</>
                    ) : 'Endereço não cadastrado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/20 rounded-[2.5rem] p-8 shadow-xl">
              <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <TrendingDown size={14} /> Total Comprado (LTV)
              </h4>
              <p className="text-4xl font-black text-zinc-100">{currencyFormatter.format(metrics.totalPaid + metrics.pending + metrics.overdue)}</p>
              <p className="text-xs text-zinc-500 mt-2">Volume total de despesas lançadas para este parceiro.</p>
            </div>
          </div>

          {/* COLUNA DIREITA: FINANCEIRO */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Clock size={16} className="text-yellow-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Contas a Pagar</span>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{currencyFormatter.format(metrics.pending)}</p>
              </div>
              <div className={cn(
                "rounded-3xl p-6 shadow-xl border",
                metrics.overdue > 0 ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"
              )}>
                <div className={cn("flex items-center gap-2 mb-2", metrics.overdue > 0 ? "text-red-500" : "text-zinc-500")}>
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Em Atraso</span>
                </div>
                <p className={cn("text-2xl font-bold", metrics.overdue > 0 ? "text-red-400" : "text-zinc-100")}>
                  {currencyFormatter.format(metrics.overdue)}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl">
              <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
                <h4 className="font-bold text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-widest">
                  <History size={16} className="text-orange-500" /> Histórico de Notas e Despesas
                </h4>
                <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">{metrics.count} lançamentos</span>
              </div>
              
              {expenses.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 italic">Nenhuma despesa vinculada a este fornecedor.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950/50 text-zinc-500 text-[9px] font-bold uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-6 py-4">Vencimento / Descrição</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {expenses.map(exp => {
                        const isOverdue = exp.status === 'pendente' && exp.due_date < new Date().toISOString().split('T')[0];
                        return (
                          <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-zinc-300">{new Date(exp.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{exp.description}</p>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-zinc-100">
                              {currencyFormatter.format(exp.amount)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                                exp.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                isOverdue ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                                "bg-orange-500/10 text-orange-400 border-orange-500/20"
                              )}>
                                {isOverdue ? 'Atrasado' : exp.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SupplierDetail;