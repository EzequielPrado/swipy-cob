"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, CreditCard, Activity, AlertTriangle, Loader2, RefreshCw, Zap,
  Building2, CalendarCheck, MessageSquare, TrendingUp, DollarSign, Package, Factory, ArrowUpRight, ShieldCheck, Globe
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalCharges: 0, activeSubs: 0, overdueAmount: 0, totalVolumePaid: 0, arpu: 0 });
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const [profilesRes, chargesRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id'),
        supabase.from('charges').select('amount, status'),
        supabase.from('subscriptions').select('amount').eq('status', 'active'),
      ]);
      const totalUsers = profilesRes.data?.length || 0;
      const totalPaid = chargesRes.data?.filter(c => c.status === 'pago').reduce((acc, c) => acc + Number(c.amount), 0) || 0;
      const mrr = subsRes.data?.reduce((acc, c) => acc + Number(c.amount), 0) || 0;
      setStats({ totalUsers, totalCharges: chargesRes.data?.length || 0, activeSubs: subsRes.data?.length || 0, overdueAmount: 0, totalVolumePaid: totalPaid, arpu: totalUsers > 0 ? (mrr / totalUsers) : 0 });
      const { data: charges } = await supabase.from('charges').select('*, customers(name), profiles:user_id(company, full_name)').order('created_at', { ascending: false }).limit(10);
      if (charges) setRecentCharges(charges);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchGlobalData(); }, []);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-center">
          <div><h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-apple-black"><ShieldCheck className="text-orange-500" size={32} /> SaaS Governance</h2><p className="text-apple-muted font-medium italic">Gestão da Swipy Fintech LTDA</p></div>
          <button onClick={fetchGlobalData} className="p-3 bg-apple-white border border-apple-border rounded-2xl text-apple-muted shadow-sm hover:bg-apple-light transition-all"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Lojistas Base</p><p className="text-4xl font-black text-apple-black">{stats.totalUsers}</p></div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">TPV Agregado</p><p className="text-4xl font-black text-emerald-600">{currency.format(stats.totalVolumePaid)}</p></div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">ARPU Mensal</p><p className="text-4xl font-black text-blue-600">{currency.format(stats.arpu)}</p></div>
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Assinaturas</p><p className="text-4xl font-black text-orange-500">{stats.activeSubs}</p></div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-apple-border bg-apple-offWhite"><h3 className="text-xs font-black text-apple-black uppercase tracking-widest flex items-center gap-2"><Activity size={16} className="text-orange-500" /> Monitor de Transações</h3></div>
          <table className="w-full text-left">
            <thead className="bg-apple-offWhite text-apple-muted text-[9px] font-black uppercase tracking-[0.2em]">
              <tr><th className="px-8 py-5">Lojista</th><th className="px-8 py-5">Cliente</th><th className="px-8 py-5">Valor</th><th className="px-8 py-5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-apple-border">
              {recentCharges.map((c) => (
                <tr key={c.id} className="hover:bg-apple-light transition-colors"><td className="px-8 py-5 font-bold text-apple-black">{c.profiles?.company || 'PF'}</td><td className="px-8 py-5 text-apple-muted font-medium">{c.customers?.name}</td><td className="px-8 py-5 font-black text-apple-black">{currency.format(c.amount)}</td><td className="px-8 py-5"><span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase border", c.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{c.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;