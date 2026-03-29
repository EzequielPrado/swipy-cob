"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Plus, Edit3, Trash2, RefreshCcw, Loader2, PauseCircle, PlayCircle, Calendar, FileText, Tag, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddContractModal from '@/components/contracts/AddContractModal';
import EditContractModal from '@/components/contracts/EditContractModal';

const Contracts = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, customers(name, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setContracts(data);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, [user]);

  const toggleStatus = async (contract: any) => {
    const newStatus = contract.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', contract.id);
    if (error) showError(error.message);
    else { showSuccess(`Contrato ${newStatus === 'active' ? 'ativado' : 'pausado'}`); fetchContracts(); }
  };

  const handleEditClick = (contract: any) => {
    setSelectedContract(contract);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o contrato ${number}? Esta ação não pode ser desfeita.`)) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showSuccess("Contrato removido com sucesso.");
      fetchContracts();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <FileText className="text-orange-500" size={32} /> Gestão de Contratos
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Controle de receitas recorrentes, vigência e termos comerciais.</p>
          </div>
          <button onClick={() => setIsAddOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95">
            <Plus size={20} /> NOVO CONTRATO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Contratos Vigentes</p><p className="text-3xl font-black text-apple-black">{contracts.filter(c => c.status === 'active').length}</p></div>
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">Faturamento Recorrente (MRR)</p><p className="text-3xl font-black text-emerald-600">{currency.format(contracts.filter(c => c.status === 'active').reduce((acc, c) => acc + Number(c.amount), 0))}</p></div>
           <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-1">A vencer (30 dias)</p><p className="text-3xl font-black text-orange-500">---</p></div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-20 opacity-30 italic font-bold italic"><p>Nenhum contrato localizado.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-6">ID / Contratante</th>
                    <th className="px-8 py-6">Categoria</th>
                    <th className="px-8 py-6">Ciclo / Frequência</th>
                    <th className="px-8 py-6 text-right">Valor</th>
                    <th className="px-8 py-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-apple-light transition-colors group">
                      <td className="px-8 py-5">
                         <p className="text-[10px] font-black text-orange-500 font-mono mb-0.5">#{c.contract_number || c.id.split('-')[0].toUpperCase()}</p>
                         <p className="text-sm font-bold text-apple-black group-hover:text-orange-500 transition-colors">{c.customers?.name}</p>
                      </td>
                      <td className="px-8 py-5">
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-apple-offWhite border border-apple-border text-apple-dark">
                           <Tag size={10} /> {c.category || 'Geral'}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-apple-black uppercase flex items-center gap-1.5">
                               <RefreshCcw size={12} className="text-blue-500" />
                               {c.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                            </span>
                            <span className="text-[9px] font-bold text-apple-muted">
                               {c.frequency === 'weekly' ? 'Toda semana' : `Dia ${c.generation_day} de cada mês`}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-apple-black">{currency.format(c.amount)}</td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-1">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border mr-2",
                              c.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                            )}>{c.status}</span>
                            
                            <button onClick={() => handleEditClick(c)} className="p-2 text-apple-muted hover:text-blue-500 transition-all" title="Editar">
                              <Edit3 size={18}/>
                            </button>
                            <button onClick={() => toggleStatus(c)} className="p-2 text-apple-muted hover:text-orange-500 transition-all" title={c.status === 'active' ? 'Pausar' : 'Ativar'}>
                              {c.status === 'active' ? <PauseCircle size={18}/> : <PlayCircle size={18}/>}
                            </button>
                            <button 
                              onClick={() => handleDelete(c.id, c.contract_number || 'S/N')} 
                              disabled={deletingId === c.id}
                              className="p-2 text-apple-muted hover:text-red-500 transition-all disabled:opacity-50"
                              title="Excluir"
                            >
                              {deletingId === c.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>}
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <AddContractModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={fetchContracts} />
      <EditContractModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedContract(null); }} onSuccess={fetchContracts} contract={selectedContract} />
    </AppLayout>
  );
};

export default Contracts;