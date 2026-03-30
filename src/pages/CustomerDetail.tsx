"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, FileText, DollarSign, ShieldCheck, CheckCircle2, RefreshCcw, Loader2, Clock, History, AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { cn } from "@/lib/utils";
import CustomerDocumentsSection from '@/components/customers/CustomerDocumentsSection';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [networkScore, setNetworkScore] = useState({ score: 100, label: 'Excelente', color: 'text-emerald-500' });

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const { data: custData, error: custError } = await supabase.from('customers').select('*').eq('id', id).single();
        if (custError) throw custError;
        setCustomer(custData);

        const { data: chargeData } = await supabase.from('charges').select('*').eq('customer_id', id).order('created_at', { ascending: false });
        if (chargeData) setCharges(chargeData);

        const cleanTaxId = custData.tax_id?.replace(/\D/g, '');
        const { data: globalCharges } = await supabase.from('charges').select('status, customers!inner(tax_id)');
        
        const myGlobalCharges = globalCharges?.filter((c: any) => c.customers.tax_id?.replace(/\D/g, '') === cleanTaxId) || [];
        const paid = myGlobalCharges.filter(c => c.status === 'pago').length;
        const total = myGlobalCharges.length;
        
        const rate = total > 0 ? (paid / total) * 100 : 100;
        
        if (rate >= 90) setNetworkScore({ score: Math.round(rate), label: 'Confiável', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' });
        else if (rate >= 60) setNetworkScore({ score: Math.round(rate), label: 'Risco Médio', color: 'text-orange-500 bg-orange-50 border-orange-100' });
        else setNetworkScore({ score: Math.round(rate), label: 'Risco Alto', color: 'text-red-500 bg-red-50 border-red-100' });

      } catch (err: any) { showError(err.message); navigate('/clientes'); } finally { setLoading(false); }
    };
    fetchCustomer();
  }, [id, navigate]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/clientes" className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-black text-apple-black tracking-tight">{customer.name}</h2>
              <p className="text-[10px] text-orange-500 uppercase font-black tracking-widest mt-1">Dados Consolidados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm", networkScore.color)}>
               <Zap size={12} className="inline mr-1.5" /> Score Rede: {networkScore.score}
             </div>
             <span className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm", customer.status === 'em dia' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100")}>
               Sua Loja: {customer.status}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] p-10 shadow-sm text-center">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-apple-offWhite border-2 border-apple-border flex items-center justify-center text-3xl font-black text-orange-500 shadow-inner mb-6">{customer.name.charAt(0).toUpperCase()}</div>
              <h3 className="text-xl font-black text-apple-black mb-1">{customer.name}</h3>
              <p className="text-xs text-apple-muted font-bold font-mono tracking-tighter mb-10">{customer.tax_id}</p>
              
              <div className="space-y-4 text-left border-t border-apple-border pt-8">
                <div className="flex items-center gap-3 text-sm text-apple-dark font-medium"><Mail size={16} className="text-orange-500" /><span className="truncate">{customer.email}</span></div>
                <div className="flex items-center gap-3 text-sm text-apple-dark font-medium"><Phone size={16} className="text-orange-500" /><span>{customer.phone || 'N/A'}</span></div>
                <div className="flex items-start gap-3 text-sm text-apple-dark font-medium"><MapPin size={16} className="text-orange-500 mt-1 shrink-0" /><span className="leading-relaxed">{customer.address?.street ? `${customer.address.street}, ${customer.address.number}` : 'Endereço não cadastrado'}</span></div>
              </div>
            </div>

            <div className="bg-apple-black p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><ShieldCheck size={100} className="text-orange-500" /></div>
               <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <ShieldCheck size={14} /> Swipy Intelligence
               </h4>
               <p className="text-white text-lg font-bold mb-2">Reputação na Plataforma</p>
               <div className="mt-6 flex items-center gap-4">
                  <div className="text-4xl font-black text-white">{networkScore.score}</div>
                  <div className="h-10 w-px bg-white/20" />
                  <div>
                    <p className={cn("text-xs font-black uppercase tracking-widest", networkScore.color.split(' ')[0])}>{networkScore.label}</p>
                    <p className="text-[9px] text-zinc-500 font-medium leading-tight mt-1">Baseado no histórico de pagamentos em toda a rede Swipy.</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="p-8 border-b border-apple-border bg-apple-offWhite flex justify-between items-center">
                <h4 className="text-[10px] font-black text-apple-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={16} className="text-orange-500" /> Suas Transações com este Cliente
                </h4>
              </div>
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr><th className="px-8 py-5">Emissão</th><th className="px-8 py-5">Descrição</th><th className="px-8 py-5">Valor</th><th className="px-8 py-5 text-right">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {charges.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-10 text-center text-apple-muted italic">Nenhuma transação registrada nesta loja.</td></tr>
                  ) : charges.map(charge => (
                    <tr key={charge.id} className="hover:bg-apple-light transition-colors">
                      <td className="px-8 py-5 text-sm font-bold text-apple-dark">{new Date(charge.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-5 text-sm text-apple-muted font-medium truncate max-w-[200px]">{charge.description || 'Venda PDV'}</td>
                      <td className="px-8 py-5 text-sm font-black text-apple-black">{currency.format(charge.amount)}</td>
                      <td className="px-8 py-5 text-right"><span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", charge.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{charge.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* NOVA SEÇÃO DE DOCUMENTOS */}
            <CustomerDocumentsSection customerId={id!} userId={customer.user_id} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CustomerDetail;