"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { cn } from "@/lib/utils";

const AccountantDashboard = () => {
  const { user, setActiveMerchant } = useAuth();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyMerchants = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('accountant_id', user.id);

        if (error) throw error;

        if (profiles) {
          const enriched = await Promise.all(profiles.map(async (p) => {
            const { data: charges } = await supabase
              .from('charges')
              .select('amount')
              .eq('user_id', p.id)
              .eq('status', 'pago');
            
            const tpv = charges?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            return { ...p, tpv };
          }));
          setMerchants(enriched);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyMerchants();
  }, [user]);

  const handleAccessClient = (merchant: any) => {
    setActiveMerchant(merchant);
    navigate('/'); // Vai para a home, agora visualizando os dados do cliente
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalPortfolioTpv = merchants.reduce((acc, curr) => acc + curr.tpv, 0);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
             <Briefcase className="text-orange-500" size={32} />
             Portal do Parceiro
          </h2>
          <p className="text-zinc-500 font-medium">Gestão consolidada da sua carteira de clientes Swipy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-orange-500/20 transition-all">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Empresas Gerenciadas</p>
              <h3 className="text-4xl font-black text-zinc-100">{merchants.length}</h3>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={100} /></div>
           </div>
           <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Volume Agregado (TPV)</p>
              <h3 className="text-4xl font-black text-emerald-500">{currency.format(totalPortfolioTpv)}</h3>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={100} /></div>
           </div>
           <div className="bg-orange-500/5 border border-orange-500/10 p-8 rounded-[2.5rem] shadow-xl">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">Status da Parceria</p>
              <h3 className="text-xl font-black text-zinc-100">Contador Credenciado</h3>
              <p className="text-xs text-zinc-500 mt-2">Você tem permissão para acessar e auditar os dados financeiros de seus clientes vinculados.</p>
           </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800 bg-zinc-950/20 flex justify-between items-center">
             <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
               <Building2 size={20} className="text-orange-500" /> Carteira de Clientes
             </h3>
             <span className="text-[10px] font-black text-zinc-500 uppercase bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">Sincronizado</span>
          </div>
          
          {merchants.length === 0 ? (
            <div className="p-20 text-center text-zinc-500 italic">Nenhum cliente vinculado ao seu registro de contador.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800/30">
              {merchants.map((m) => (
                <div key={m.id} className="bg-zinc-900 p-8 flex flex-col justify-between hover:bg-zinc-950 transition-all group">
                  <div className="flex justify-between items-start mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-orange-500 shadow-inner group-hover:border-orange-500/30 transition-colors">
                           <Building2 size={24} />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-zinc-100">{m.company || 'Pessoa Física'}</h4>
                           <p className="text-xs text-zinc-500 font-medium">{m.full_name}</p>
                        </div>
                     </div>
                     <span className={cn(
                       "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border",
                       m.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                     )}>
                        {m.status}
                     </span>
                  </div>

                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-4">
                        <span className="text-zinc-500 font-medium">TPV (Cobranças Pagas)</span>
                        <span className="font-bold text-zinc-200">{currency.format(m.tpv)}</span>
                     </div>
                     <button 
                      onClick={() => handleAccessClient(m)}
                      className="w-full mt-4 bg-zinc-800 group-hover:bg-orange-500 group-hover:text-zinc-950 text-zinc-300 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                     >
                        ACESSAR ERP DO CLIENTE <ChevronRight size={18} />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AccountantDashboard;