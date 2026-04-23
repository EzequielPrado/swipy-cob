"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Mail, Plus, Loader2, Edit3, Trash2, FileText, Download, ExternalLink, Filter, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { useNavigate } from 'react-router-dom';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import { showError, showSuccess } from '@/utils/toast';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';

const Customers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    
    // Buscar clientes e cobranças em paralelo
    const [customersRes, chargesRes] = await Promise.all([
      supabase.from('customers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('charges').select('customer_id, status, due_date, amount').eq('user_id', user.id)
    ]);

    if (!customersRes.error && customersRes.data) {
      const allCharges = chargesRes.data || [];
      const today = new Date().toISOString().split('T')[0];

      // Calcular status real de cada cliente baseado nas cobranças
      const customersWithStatus = customersRes.data.map(customer => {
        const custCharges = allCharges.filter(c => c.customer_id === customer.id);
        
        // Verificar se tem cobranças atrasadas
        const hasOverdue = custCharges.some(c => 
          c.status === 'atrasado' || 
          (c.status === 'pendente' && c.due_date && c.due_date < today)
        );

        // Calcular total devido
        const totalOverdue = custCharges
          .filter(c => c.status === 'atrasado' || (c.status === 'pendente' && c.due_date && c.due_date < today))
          .reduce((sum, c) => sum + Number(c.amount || 0), 0);

        return {
          ...customer,
          computed_status: hasOverdue ? 'inadimplente' : 'em dia',
          total_overdue: totalOverdue
        };
      });

      setCustomers(customersWithStatus);

      // Atualizar o campo status no banco (assíncrono, sem bloquear a UI)
      customersWithStatus.forEach(async (c) => {
        const newStatus = c.computed_status;
        if (c.status !== newStatus) {
          await supabase.from('customers').update({ status: newStatus }).eq('id', c.id);
        }
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tax_id && c.tax_id.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) return showError("Nada para exportar");
    exportToCSV(filteredCustomers, `clientes-${new Date().toISOString().split('T')[0]}`);
    showSuccess("CSV gerado com sucesso!");
  };

  const handleExportPDF = () => {
    if (filteredCustomers.length === 0) return showError("Nada para exportar");
    exportToPDF(filteredCustomers, "Relatório de Clientes - Swipy Fintech LTDA", `clientes-${new Date().toISOString().split('T')[0]}`);
    showSuccess("PDF gerado com sucesso!");
  };

  const handleEditClick = (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir o cliente ${customer.name}?`)) return;

    setActionLoading(customer.id);
    try {
      if (customer.woovi_id) {
        await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/delete-woovi-customer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ wooviId: customer.woovi_id })
        });
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      showSuccess('Cliente excluído com sucesso');
      fetchCustomers();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 md:gap-8">
        {/* CABEÇALHO FLEXÍVEL */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-apple-black flex items-center gap-3">
              <User size={32} className="text-orange-500" /> Clientes
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão de base e inteligência comercial (CRM).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button 
              onClick={handleExportCSV}
              className="flex-1 md:flex-none bg-apple-white hover:bg-apple-offWhite text-apple-dark px-4 py-2.5 rounded-xl transition-all border border-apple-border flex items-center justify-center gap-2 text-xs font-bold shadow-sm"
            >
              <Download size={16} /> CSV
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex-1 md:flex-none bg-apple-white hover:bg-apple-offWhite text-apple-dark px-4 py-2.5 rounded-xl transition-all border border-apple-border flex items-center justify-center gap-2 text-xs font-bold shadow-sm"
            >
              <FileText size={16} /> PDF
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95"
            >
              <Plus size={18} /> NOVO CLIENTE
            </button>
          </div>
        </div>

        {/* BUSCA */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nome, e-mail ou CPF/CNPJ..." 
            className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm text-apple-black"
          />
        </div>

        {/* TABELA RESPONSIVA COM WRAPPER DE ROLAGEM */}
        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-orange-500">
              <Loader2 className="animate-spin" size={40} />
              <p className="text-xs font-black uppercase tracking-widest">Sincronizando base...</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                  <tr>
                    <th className="px-8 py-6">Entidade / Responsável</th>
                    <th className="px-8 py-6">Documento</th>
                    <th className="px-8 py-6">Situação</th>
                    <th className="px-8 py-6 text-right">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-apple-muted font-bold italic">
                        Nenhum registro localizado.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr 
                        key={customer.id} 
                        onClick={() => navigate(`/clientes/${customer.id}`)}
                        className="hover:bg-apple-light transition-colors cursor-pointer group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-apple-offWhite border border-apple-border flex items-center justify-center text-sm font-black text-orange-500 shadow-inner group-hover:border-orange-500 group-hover:bg-orange-50 transition-all">
                              {customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-black text-apple-black group-hover:text-orange-500 transition-colors flex items-center gap-2">
                                {customer.name}
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-all text-orange-500" />
                              </p>
                              <p className="text-[11px] text-apple-muted font-medium truncate max-w-[150px] sm:max-w-none">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs text-apple-dark font-mono font-bold tracking-tighter bg-apple-offWhite px-2 py-1 rounded-md border border-apple-border">
                            {customer.tax_id}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            (customer.computed_status || customer.status) === 'em dia' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            "bg-red-50 text-red-600 border-red-100"
                          )}>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              (customer.computed_status || customer.status) === 'em dia' 
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                : "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            )} />
                            {(customer.computed_status || customer.status)}
                          </span>
                          {customer.total_overdue > 0 && (
                            <p className="text-[10px] text-red-500 font-bold mt-1">
                              Dívida: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.total_overdue)}
                            </p>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={(e) => handleEditClick(e, customer)}
                              className="p-3 text-apple-muted hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Edit3 size={18}/>
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, customer)}
                              disabled={actionLoading === customer.id}
                              className="p-3 text-apple-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                            >
                              {actionLoading === customer.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>}
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

      <AddCustomerModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchCustomers}
      />

      <EditCustomerModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSuccess={fetchCustomers}
        customer={selectedCustomer}
      />
    </AppLayout>
  );
};

export default Customers;