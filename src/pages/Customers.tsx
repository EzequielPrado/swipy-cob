"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Mail, Plus, Loader2, Edit3, Trash2, FileText, Download, ExternalLink } from 'lucide-react';
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
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
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

  const handleSendEmail = async (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    setActionLoading(`email-${customer.id}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      
      const response = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          to: customer.email,
          subject: 'Atualização de Cadastro - Swipy Fintech LTDA',
          html: `<h1>Olá, ${customer.name}!</h1><p>Confirmamos que seus dados foram atualizados em nosso sistema.</p>`
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) throw new Error(result.details || result.error || 'Erro ao enviar e-mail');
      
      showSuccess(`E-mail enviado para ${customer.email}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showError("O servidor de e-mail demorou muito para responder. Verifique as configurações SMTP.");
      } else {
        showError(error.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Clientes</h2>
            <p className="text-apple-muted mt-1 font-medium">Gerencie sua base e clique em um cliente para ver o histórico (CRM).</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExportCSV}
              className="bg-apple-white hover:bg-apple-offWhite text-apple-dark px-4 py-2 rounded-lg transition-all border border-apple-border flex items-center gap-2 text-sm shadow-sm"
            >
              <Download size={16} /> CSV
            </button>
            <button 
              onClick={handleExportPDF}
              className="bg-apple-white hover:bg-apple-offWhite text-apple-dark px-4 py-2 rounded-lg transition-all border border-apple-border flex items-center gap-2 text-sm shadow-sm"
            >
              <FileText size={16} /> PDF
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} /> Novo Cliente
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou documento..." 
              className="w-full bg-apple-white border border-apple-border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-3xl overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-apple-muted">
              <p>{searchTerm ? "Nenhum resultado para sua busca." : "Nenhum cliente cadastrado."}</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase tracking-[0.2em] border-b border-apple-border">
                <tr>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Documento</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    onClick={() => navigate(`/clientes/${customer.id}`)}
                    className="hover:bg-apple-light transition-colors cursor-pointer group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-apple-border flex items-center justify-center text-xs font-bold text-orange-500 shadow-sm group-hover:border-orange-500 transition-colors">
                          {customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-apple-black group-hover:text-orange-500 transition-colors flex items-center gap-2">
                            {customer.name}
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                          </p>
                          <p className="text-xs text-apple-muted">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs text-apple-dark font-mono tracking-tighter">{customer.tax_id}</td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
                        customer.status === 'em dia' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                        "bg-apple-offWhite text-apple-muted border-apple-border"
                      )}>
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          customer.status === 'em dia' ? "bg-emerald-500" : "bg-apple-muted"
                        )} />
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => handleSendEmail(e, customer)}
                          disabled={actionLoading === `email-${customer.id}`}
                          title="Enviar Notificação" 
                          className="p-2.5 text-apple-muted hover:text-orange-500 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `email-${customer.id}` ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16}/>}
                        </button>
                        <button 
                          onClick={(e) => handleEditClick(e, customer)}
                          title="Editar" 
                          className="p-2.5 text-apple-muted hover:text-blue-500 transition-colors"
                        >
                          <Edit3 size={16}/>
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, customer)}
                          disabled={actionLoading === customer.id}
                          title="Excluir" 
                          className="p-2.5 text-apple-muted hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === customer.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16}/>}
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