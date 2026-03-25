"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCcw,
  Loader2,
  Clock,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { cn } from "@/lib/utils";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [charges, setCharges] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Métricas
  const [metrics, setMetrics] = useState({
    ltv: 0, // Lifetime Value (Total Pago)
    pending: 0,
    overdue: 0,
    totalCharges: 0
  });

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        // 1. Dados do Cliente
        const { data: custData, error: custError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();

        if (custError || !custData) throw new Error("Cliente não encontrado");
        setCustomer(custData);

        // 2. Histórico de Cobranças (Vendas)
        const { data: chargeData } = await supabase
          .from('charges')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });

        if (chargeData) {
          setCharges(chargeData);
          
          let ltv = 0;
          let pending = 0;
          let overdue = 0;

          chargeData.forEach(c => {
            if (c.status === 'pago') ltv += Number(c.amount);
            if (c.status === 'pendente') pending += Number(c.amount);
            if (c.status === 'atrasado') overdue += Number(c.amount);
          });

          setMetrics({
            ltv,
            pending,
            overdue,
            totalCharges: chargeData.length
          });
        }

        // 3. Assinaturas Ativas
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });

        if (subData) setSubscriptions(subData);

      } catch (err: any) {
        showError(err.message);
        navigate('/clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [id, navigate]);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;
  if (!customer) return null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/clientes" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Perfil do Cliente</h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase font-mono tracking-widest">CRM 360º</p>
            </div>
          </div>
          <span className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border",
            metrics.overdue > 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : 
            customer.status === 'em dia' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
          )}>
            {metrics.overdue > 0 ? "Inadimplente" : customer.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUNA ESQUERDA: DADOS DO CLIENTE */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-3xl font-black text-orange-500 shadow-2xl mb-6">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-1">{customer.name}</h3>
              <p className="text-xs text-zinc-500 font-mono">{customer.tax_id}</p>
              
              <div className="mt-8 space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Mail size={16} className="text-orange-500" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Phone size={16} className="text-orange-500" />
                  <span>{customer.phone || 'Não informado'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-zinc-300">
                  <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">
                    {customer.address?.street ? (
                      <>{customer.address.street}, {customer.address.number}<br/>
                      {customer.address.neighborhood} - {customer.address.city}/{customer.address.state}</>
                    ) : 'Endereço não cadastrado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 shadow-xl">
              <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <DollarSign size={14} /> LTV (Lifetime Value)
              </h4>
              <p className="text-4xl font-black text-emerald-400">{currencyFormatter.format(metrics.ltv)}</p>
              <p className="text-xs text-emerald-500/70 mt-2 font-medium">Total gasto por este cliente na sua empresa desde o cadastro.</p>
            </div>
          </div>

          {/* COLUNA DIREITA: FINANCEIRO E HISTÓRICO */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CARDS RESUMO FINANCEIRO */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Clock size={16} className="text-yellow-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">A Receber</span>
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

            {/* ASSINATURAS ATIVAS */}
            {subscriptions.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
                <h4 className="font-bold text-zinc-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                  <RefreshCcw size={16} className="text-orange-500" /> Planos / Assinaturas
                </h4>
                <div className="space-y-4">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-zinc-100">{sub.description || 'Plano Recorrente'}</p>
                        <p className="text-xs text-zinc-500 mt-1">Gera dia {sub.generation_day} • Vence dia {sub.due_day}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-400">{currencyFormatter.format(sub.amount)}</p>
                        <span className={cn(
                          "inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          sub.status === 'active' ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                        )}>{sub.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HISTÓRICO DE COBRANÇAS / VENDAS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
                <h4 className="font-bold text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-widest">
                  <History size={16} className="text-orange-500" /> Histórico de Vendas / Faturas
                </h4>
                <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">{metrics.totalCharges} registros</span>
              </div>
              
              {charges.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">Nenhuma cobrança registrada para este cliente.</div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950/80 text-zinc-500 text-[10px] uppercase tracking-[0.2em] sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4">Data / Ref</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {charges.map(charge => (
                        <tr 
                          key={charge.id} 
                          onClick={() => navigate(`/financeiro/cobrancas/${charge.id}`)}
                          className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                              {new Date(charge.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                              <FileText size={12} />
                              <span className="truncate max-w-[150px]">{charge.description || 'Cobrança Avulsa'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-100">
                            {currencyFormatter.format(charge.amount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                              charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              charge.status === 'atrasado' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                              "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            )}>
                              {charge.status}
                            </span>
                          </td>
                        </tr>
                      ))}
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

export default CustomerDetail;