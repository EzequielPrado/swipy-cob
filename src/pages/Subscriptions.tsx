"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Plus, Search, Edit3, Trash2, RefreshCcw, Loader2, PauseCircle, PlayCircle, Calendar } from 'lucide-react';
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
      .eq('user_id', user.id) // FILTRO CRÍTICO
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
    if (!confirm("Tem certeza que deseja remover esta assinatura? As cobranças futuras não serão mais geradas.")) return;
    
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
            <h2 className="text-3xl font-bold tracking-tight">Recorrência</h2>
            <p className="text-zinc-400 mt-1">Gerencie cobranças automáticas e assinaturas dos seus clientes.</p>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10"
          >
            <Plus size={18} />
            Nova Assinatura
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[400px]">
          {loading ? (
             <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <RefreshCcw size={48} className="mb-4 opacity-20" />
              <p>Nenhuma assinatura configurada.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Valor Mensal</th>
                  <th className="px-6 py-4 font-semibold">Ciclo (Geração / Vencimento)</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-100">{sub.customers?.name}</p>
                      <p className="text-xs text-zinc-500">{sub.customers?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-sm font-bold text-zinc-200">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.amount)}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5" title="Dia de Geração">
                           <RefreshCcw size={14} className="text-zinc-500" />
                           Dia {sub.generation_day}
                        </div>
                        <div className="w-px h-3 bg-zinc-700" />
                        <div className="flex items-center gap-1.5" title="Dia de Vencimento">
                           <Calendar size={14} className="text-zinc-500" />
                           Dia {sub.due_day}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                        sub.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                        sub.status === 'paused' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-zinc-800 text-zinc-500 border-zinc-700"
                      )}>
                        {sub.status === 'active' ? 'Ativo' : sub.status === 'paused' ? 'Pausado' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                         <button 
                          onClick={() => toggleStatus(sub)}
                          className={cn("p-2 transition-colors", sub.status === 'active' ? "text-zinc-500 hover:text-yellow-400" : "text-zinc-500 hover:text-emerald-400")}
                          title={sub.status === 'active' ? "Pausar" : "Ativar"}
                        >
                          {sub.status === 'active' ? <PauseCircle size={16}/> : <PlayCircle size={16} />}
                        </button>
                        <button 
                          onClick={() => handleEdit(sub)}
                          className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16}/>
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

      <AddSubscriptionModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={fetchSubscriptions} 
      />

      <EditSubscriptionModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedSub(null);
        }}
        onSuccess={fetchSubscriptions}
        subscription={selectedSub}
      />
    </AppLayout>
  );
};

export default Subscriptions;