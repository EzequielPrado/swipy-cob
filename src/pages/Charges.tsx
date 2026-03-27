"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Copy, Trash2, Loader2, Plus, DollarSign, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddChargeModal from '@/components/charges/AddChargeModal';
import AddManualReceivableModal from '@/components/charges/AddManualReceivableModal';

const Charges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCharges = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('charges')
      .select('*, customers(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCharges(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharges();
  }, [user]);

  const copyInternalCheckoutLink = (chargeId: string) => {
    const internalLink = `${window.location.origin}/pagar/${chargeId}`;
    navigator.clipboard.writeText(internalLink);
    showSuccess("Link de checkout copiado!");
  };

  const handleDelete = async (charge: any) => {
    if (!confirm(`Deseja excluir o lançamento de ${charge.customers?.name}?`)) return;
    
    setActionLoading(charge.id);
    try {
      if (charge.method !== 'manual' && charge.woovi_id) {
        await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/delete-woovi-charge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ wooviId: charge.woovi_id })
        });
      }

      const { error } = await supabase
        .from('charges')
        .delete()
        .eq('id', charge.id);

      if (error) throw error;
      
      showSuccess("Lançamento removido.");
      fetchCharges();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contas a Receber</h2>
            <p className="text-zinc-400 mt-1">Gerencie cobranças automáticas e lançamentos manuais de receita.</p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={() => setIsManualModalOpen(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-zinc-700 shadow-xl"
            >
              <DollarSign size={18} /> Lançar Manual
            </button>
            <button 
              onClick={() => setIsAutoModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10"
            >
              <QrCode size={18} /> Nova Cobrança Pix
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Cliente / Origem</th>
                  <th className="px-6 py-5">Valor</th>
                  <th className="px-6 py-5">Vencimento</th>
                  <th className="px-6 py-5">Tipo</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-zinc-500">Nenhum lançamento encontrado.</td>
                  </tr>
                ) : (
                  charges.map((charge) => (
                    <tr 
                      key={charge.id} 
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/financeiro/cobrancas/${charge.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-zinc-100">{charge.customers?.name || 'Cliente removido'}</p>
                        <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{charge.description || 'Sem descrição'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-zinc-200">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-400">
                          {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border",
                          charge.method === 'manual' ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {charge.method === 'manual' ? 'Manual' : 'Automática'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                          charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          charge.status === 'atrasado' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                          "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {charge.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {charge.method !== 'manual' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyInternalCheckoutLink(charge.id);
                              }} 
                              title="Copiar Link de Checkout" 
                              className="p-2 text-zinc-500 hover:text-orange-400 transition-colors"
                            >
                              <Copy size={16}/>
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(charge);
                            }}
                            disabled={actionLoading === charge.id}
                            title="Excluir Lançamento" 
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === charge.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddChargeModal 
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        onSuccess={fetchCharges}
      />

      <AddManualReceivableModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={fetchCharges}
      />
    </AppLayout>
  );
};

export default Charges;