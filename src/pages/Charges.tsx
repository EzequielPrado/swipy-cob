"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Copy, Trash2, Loader2, Plus, DollarSign, QrCode, FileText, Receipt, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddChargeModal from '@/components/charges/AddChargeModal';
import AddManualReceivableModal from '@/components/charges/AddManualReceivableModal';
import IssueInvoiceModal from '@/components/fiscal/IssueInvoiceModal';

const Charges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCharges = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('charges')
      .select('*, customers(name, id)')
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

  const handleOpenFiscal = (e: React.MouseEvent, charge: any) => {
    e.stopPropagation();
    setSelectedCharge(charge);
    setIsFiscalModalOpen(true);
  };

  const handleMarkAsPaidQuick = async (charge: any) => {
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount);
    if (!confirm(`Confirmar recebimento de ${formattedAmount} de ${charge.customers?.name}?`)) return;
    
    setActionLoading(charge.id);
    try {
      // 1. Se houver uma conta bancária vinculada, atualiza o saldo dela
      if (charge.bank_account_id) {
        const { data: account } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('id', charge.bank_account_id)
          .single();
        
        if (account) {
          const newBalance = Number(account.balance || 0) + Number(charge.amount || 0);
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', charge.bank_account_id);
        }
      }

      // 2. Atualiza o status da cobrança
      const { error } = await supabase
        .from('charges')
        .update({ status: 'pago' })
        .eq('id', charge.id);

      if (error) throw error;
      
      // 3. Registrar Log de Auditoria
      await supabase.from('notification_logs').insert({
        charge_id: charge.id,
        type: 'payment',
        status: 'success',
        message: `Baixa manual realizada. Valor de ${formattedAmount} conciliado.`
      });

      showSuccess("Pagamento confirmado e saldo atualizado!");
      fetchCharges();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
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
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Contas a Receber</h2>
            <p className="text-apple-muted mt-1 font-medium">Gerencie cobranças automáticas e lançamentos manuais de receita.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <button 
              onClick={() => setIsManualModalOpen(true)}
              className="flex-1 sm:flex-none justify-center bg-apple-white hover:bg-apple-offWhite text-apple-black font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-apple-border shadow-sm"
            >
              <DollarSign size={18} className="text-emerald-500" /> Lançar Manual
            </button>
            <button 
              onClick={() => setIsAutoModalOpen(true)}
              className="flex-1 sm:flex-none justify-center bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <QrCode size={18} /> Nova Cobrança Pix
            </button>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-5">Cliente / Origem</th>
                    <th className="px-8 py-5">Valor</th>
                    <th className="px-8 py-5">Vencimento</th>
                    <th className="px-8 py-5">Tipo</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {charges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-10 text-center text-apple-muted font-medium">Nenhum lançamento encontrado.</td>
                    </tr>
                  ) : (
                    charges.map((charge) => (
                      <tr 
                        key={charge.id} 
                        className="hover:bg-apple-light transition-colors cursor-pointer group"
                        onClick={() => navigate(`/financeiro/cobrancas/${charge.id}`)}
                      >
                        <td className="px-8 py-4">
                          <p className="text-sm font-bold text-apple-black group-hover:text-orange-500 transition-colors">{charge.customers?.name || 'Cliente removido'}</p>
                          <p className="text-[10px] text-apple-muted truncate max-w-[200px] font-medium">{charge.description || 'Sem descrição'}</p>
                        </td>
                        <td className="px-8 py-4 text-sm font-black text-apple-black">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm text-apple-dark font-medium">
                            {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border",
                            charge.method === 'manual' ? "bg-apple-light text-apple-muted border-apple-border" : "bg-orange-50 text-orange-600 border-orange-100"
                          )}>
                            {charge.method === 'manual' ? 'Manual' : 'Automática'}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                            charge.status === 'pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            charge.status === 'atrasado' ? "bg-red-50 text-red-600 border-red-100" : 
                            "bg-orange-50 text-orange-600 border-orange-100"
                          )}>
                            {charge.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {charge.status !== 'pago' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsPaidQuick(charge);
                                }}
                                disabled={actionLoading === charge.id}
                                title="Confirmar Pagamento" 
                                className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                              >
                                {actionLoading === charge.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>}
                              </button>
                            )}
                            {charge.status === 'pago' && (
                              <button 
                                onClick={(e) => handleOpenFiscal(e, charge)}
                                title="Emitir Nota Fiscal" 
                                className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                              >
                                <FileText size={16}/>
                              </button>
                            )}
                            {charge.method !== 'manual' && charge.status !== 'pago' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyInternalCheckoutLink(charge.id);
                                }} 
                                title="Copiar Link de Checkout" 
                                className="p-2.5 text-apple-muted hover:text-orange-500 transition-colors"
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
                              className="p-2.5 text-apple-muted hover:text-red-500 transition-colors disabled:opacity-50"
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
            </div>
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

      <IssueInvoiceModal 
        isOpen={isFiscalModalOpen}
        onClose={() => {
          setIsFiscalModalOpen(false);
          setSelectedCharge(null);
        }}
        onSuccess={fetchCharges}
        defaultData={selectedCharge ? {
          customerId: selectedCharge.customer_id,
          amount: selectedCharge.amount.toString(),
          description: selectedCharge.description || `Referente à cobrança #${selectedCharge.id.split('-')[0].toUpperCase()}`
        } : undefined}
      />
    </AppLayout>
  );
};

export default Charges;