"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Factory, Loader2, Search, Play, CheckCircle2, AlertTriangle, 
  FileText, Download, Filter, Package, Calendar, ArrowRight, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const Production = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, products(name, sku, stock_quantity), quotes(id, customers(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (o.products?.sku && o.products.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string, productId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Se concluir, dá entrada automática no estoque do produto
      if (newStatus === 'completed') {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
        if (p) {
          await supabase.from('products').update({ stock_quantity: p.stock_quantity + quantity }).eq('id', productId);
          await supabase.from('inventory_movements').insert({
            user_id: user?.id,
            product_id: productId,
            type: 'in',
            quantity: quantity,
            notes: `Produção Concluída - Ordem #${id.split('-')[0].toUpperCase()}`
          });
          showSuccess("Estoque atualizado com sucesso!");
        }
      }

      showSuccess(`Ordem de produção ${newStatus === 'completed' ? 'finalizada' : 'iniciada'}.`);
      fetchOrders();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(249, 115, 22);
    doc.text("RELATÓRIO DE PRODUÇÃO", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    const tableColumn = ["Data", "Produto", "Qtd", "Cliente / Origem", "Status"];
    const tableRows = filteredOrders.map(o => [
      new Date(o.created_at).toLocaleDateString('pt-BR'),
      o.products?.name || 'Item Excluído',
      o.quantity,
      o.quotes?.customers?.name || 'Venda Avulsa',
      o.status.toUpperCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] }
    });

    doc.save(`relatorio-producao-${new Date().toISOString().split('T')[0]}.pdf`);
    showSuccess("Relatório baixado!");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Factory className="text-orange-500" size={32} />
              Linha de Produção
            </h2>
            <p className="text-zinc-400 mt-1">Gerencie a fabricação de produtos vendidos e acompanhe o fluxo industrial.</p>
          </div>
          <button 
            onClick={handleExportPDF}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl border border-zinc-700 transition-all flex items-center gap-2 text-sm font-bold"
          >
            <FileText size={18} /> Relatório de Produção
          </button>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl border-l-yellow-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-500" /> Aguardando
            </p>
            <p className="text-3xl font-black text-zinc-100">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl border-l-blue-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Play size={14} className="text-blue-500" /> Em Fabricação
            </p>
            <p className="text-3xl font-black text-zinc-100">{orders.filter(o => o.status === 'in_progress').length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl border-l-emerald-500/50">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Concluídos (Mês)
            </p>
            <p className="text-3xl font-black text-zinc-100">{orders.filter(o => o.status === 'completed').length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total de Itens</p>
            <p className="text-3xl font-black text-zinc-100">
              {orders.reduce((acc, curr) => acc + curr.quantity, 0)}
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900/50 p-2 rounded-3xl border border-zinc-800/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por produto ou código..." 
              className="w-full bg-zinc-900 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 pr-2 overflow-x-auto w-full md:w-auto">
            {['all', 'pending', 'in_progress', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  statusFilter === st ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {st === 'all' ? 'Ver Todos' : st === 'pending' ? 'Aguardando' : st === 'in_progress' ? 'Produzindo' : 'Finalizados'}
              </button>
            ))}
          </div>
        </div>

        {/* LISTAGEM DE ORDENS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-2xl">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <Factory size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma ordem de produção para os filtros aplicados.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Ordem / Data</th>
                  <th className="px-8 py-5">Produto</th>
                  <th className="px-8 py-5">Quantidade</th>
                  <th className="px-8 py-5">Cliente / Venda</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className={cn("hover:bg-zinc-800/30 transition-colors", o.status === 'completed' && "opacity-50")}>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-zinc-300 font-mono uppercase">#{o.id.split('-')[0]}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-zinc-100">{o.products?.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">SKU: {o.products?.sku}</p>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-base font-black text-orange-400">{o.quantity} <span className="text-[10px] font-bold text-zinc-500 uppercase">unid.</span></span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-blue-500" />
                        <p className="text-xs text-zinc-300 font-medium">{o.quotes?.customers?.name || 'Venda Direta'}</p>
                      </div>
                      {o.notes && <p className="text-[9px] text-zinc-600 mt-1 italic max-w-xs truncate">{o.notes}</p>}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        o.status === 'pending' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        o.status === 'in_progress' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", 
                          o.status === 'pending' ? "bg-yellow-400" : o.status === 'in_progress' ? "bg-blue-400" : "bg-emerald-400"
                        )} />
                        {o.status === 'pending' ? 'Aguardando' : o.status === 'in_progress' ? 'Produzindo' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {o.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(o.id, 'in_progress', o.product_id, o.quantity)}
                            className="bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-zinc-950 p-2 rounded-lg transition-all"
                            title="Iniciar Produção"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                        )}
                        {o.status === 'in_progress' && (
                          <button 
                            onClick={() => handleUpdateStatus(o.id, 'completed', o.product_id, o.quantity)}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 p-2 rounded-lg transition-all"
                            title="Finalizar e Entrar no Estoque"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Production;