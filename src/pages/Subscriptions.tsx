"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Plus, Edit3, Trash2, RefreshCcw, Loader2, PauseCircle, PlayCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddSubscriptionModal from '@/components/subscriptions/AddSubscriptionModal';
import EditSubscriptionModal from '@/components/subscriptions/EditSubscriptionModal';

const Subscriptions = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  const fetchSubscriptions = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, customers(name, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubscriptions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  const handleEdit = (sub: any) => {
    setSelectedSub(sub);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta assinatura? Cobranças futuras não serão geradas.")) return;
    
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (error) showError(error.message);
    else {
      showSuccess("Assinatura removida");
      fetchSubscriptions();
    }
  };

  const toggleStatus = async (sub: any) => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: newStatus })
      .eq('id', sub.id);

    if (error) showError(error.message);
    else {
      showSuccess(`Assinatura ${newStatus === 'active' ? 'ativada' : 'pausada'}`);
      fetchSubscriptions();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Recorrência</h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão de planos e cobranças mensais automáticas.</p>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Nova Assinatura
          </button>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
             <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-apple-muted opacity-60">
              <RefreshCcw size={48} className="mb-4" />
              <p className="font-medium">Nenhuma assinatura ativa.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Valor Mensal</th>
                  <th className="px-8 py-5">Ciclo</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-apple-light transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-apple-black">{sub.customers?.name}</p>
                      <p className="text-xs text-apple-muted">{sub.customers?.email}</p>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-sm font-black text-apple-dark">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.amount)}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 text-[10px] font-bold text-apple-muted uppercase tracking-wider">
                        <div className="flex items-center gap-1.5" title="Dia de Geração">
                           <RefreshCcw size={14} className="text-orange-500" />
                           Gera Dia {sub.generation_day}
                        </div>
                        <div className="w-px h-3 bg-apple-border" />
                        <div className="flex items-center gap-1.5" title="Dia de Vencimento">
                           <Calendar size={14} className="text-blue-500" />
                           Vence Dia {sub.due_day}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        sub.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                        sub.status === 'paused' ? "bg-orange-50 text-orange-600 border-orange-100" :
                        "bg-apple-offWhite text-apple-muted border-apple-border"
                      )}>
                        {sub.status === 'active' ? 'Ativo' : sub.status === 'paused' ? 'Pausado' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                         <button 
                          onClick={() => toggleStatus(sub)}
                          className={cn("p-2 transition-colors", sub.status === 'active' ? "text-apple-muted hover:text-orange-500" : "text-apple-muted hover:text-emerald-500")}
                          title={sub.status === 'active' ? "Pausar" : "Ativar"}
                        >
                          {sub.status === 'active' ? <PauseCircle size={18}/> : <PlayCircle size={18} />}
                        </button>
                        <button 
                          onClick={() => handleEdit(sub)}
                          className="p-2 text-apple-muted hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={18}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id)}
                          className="p-2 text-apple-muted hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddSubscriptionModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={fetchSubscriptions} />
      <EditSubscriptionModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedSub(null); }} onSuccess={fetchSubscriptions} subscription={selectedSub} />
    </AppLayout>
  );
};

export default Subscriptions;