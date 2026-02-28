"use client";

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Filter, Mail, FileText, UserX, Plus, Loader2, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEditClick = (customer: any) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
            <p className="text-zinc-400 mt-1">Gerencie sua base de assinantes e acompanhe a saúde financeira individual.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg transition-all border border-zinc-800">Exportar CSV</button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Novo Cliente
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF ou CNPJ..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <p>Nenhum cliente cadastrado.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="text-orange-500 text-sm mt-2 hover:underline"
              >
                Cadastrar o primeiro cliente
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Cliente</th>
                  <th className="px-6 py-5">CPF / CNPJ</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                          {customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm font-semibold text-zinc-100">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{customer.tax_id}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                        customer.status === 'em dia' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          customer.status === 'em dia' ? "bg-emerald-400" : "bg-zinc-500"
                        )} />
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Enviar Cobrança" className="p-2 text-zinc-500 hover:text-orange-400 transition-colors"><Mail size={16}/></button>
                        <button 
                          onClick={() => handleEditClick(customer)}
                          title="Editar Cliente" 
                          className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"
                        >
                          <Edit3 size={16}/>
                        </button>
                        <button title="Bloquear Acesso" className="p-2 text-zinc-500 hover:text-red-400 transition-colors"><UserX size={16}/></button>
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