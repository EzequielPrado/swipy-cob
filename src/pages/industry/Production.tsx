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
    const { data, error } = await supabase.from('production_orders').select('*, products(name, sku, stock_quantity), quotes(id, customers(name))').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || (o.products?.sku && o.products.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string, productId: string, quantity: number) => {
    try {
      await supabase.from('production_orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
      if (newStatus === 'completed') {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
        if (p) {
          await supabase.from('products').update({ stock_quantity: p.stock_quantity + quantity }).eq('id', productId);
          await supabase.from('inventory_movements').insert({ user_id: user?.id, product_id: productId, type: 'in', quantity: quantity, notes: `Produção Concluída - Ordem #${id.split('-')[0].toUpperCase()}` });
        }
      }
      showSuccess(`Ordem ${newStatus === 'completed' ? 'finalizada' : 'iniciada'}.`);
      fetchOrders();
    } catch (err: any) { showError(err.message); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3"><Factory className="text-orange-500" size={32} /> Linha de Produção</h2>
            <p className="text-apple-muted mt-1 font-medium">Gerencie a fabricação e o fluxo industrial.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Aguardando', icon: AlertTriangle, color: 'text-orange-500', bg: 'border-l-orange-500', filter: 'pending' },
            { label: 'Em Produção', icon: Play, color: 'text-blue-500', bg: 'border-l-blue-500', filter: 'in_progress' },
            { label: 'Concluídos', icon: CheckCircle2, color: 'text-emerald-500', bg: 'border-l-emerald-500', filter: 'completed' },
            { label: 'Total Itens', icon: Package, color: 'text-apple-muted', bg: 'border-l-apple-border', filter: 'all' }
          ].map(stat => (
            <div key={stat.label} className={cn("bg-apple-white border border-apple-border p-6 rounded-3xl shadow-sm border-l-4", stat.bg)}>
              <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2 flex items-center gap-2"><stat.icon size={14} className={stat.color} /> {stat.label}</p>
              <p className="text-3xl font-black text-apple-black">{stat.filter === 'all' ? orders.reduce((acc, c) => acc + c.quantity, 0) : orders.filter(o => o.status === stat.filter).length}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-apple-white p-2 rounded-[2rem] border border-apple-border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar produto ou código..." className="w-full bg-transparent border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-0 outline-none text-apple-black" />
          </div>
          <div className="flex gap-1 pr-1 overflow-x-auto">
            {['all', 'pending', 'in_progress', 'completed'].map((st) => (
              <button key={st} onClick={() => setStatusFilter(st)} className={cn("px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", statusFilter === st ? "bg-orange-500 text-white" : "bg-apple-offWhite text-apple-muted hover:bg-apple-light")}>
                {st === 'all' ? 'Todos' : st === 'pending' ? 'Aguardando' : st === 'in_progress' ? 'Produzindo' : 'Finalizados'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 text-apple-muted font-bold italic"><p>Nenhuma ordem de produção ativa.</p></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-black tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Ordem</th><th className="px-8 py-5">Produto</th><th className="px-8 py-5">Qtd</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className={cn("hover:bg-apple-light transition-colors group", o.status === 'completed' && "opacity-60")}>
                    <td className="px-8 py-5 font-mono text-xs font-black uppercase">#{o.id.split('-')[0]}</td>
                    <td className="px-8 py-5"><p className="text-sm font-bold text-apple-black">{o.products?.name}</p><p className="text-[10px] text-apple-muted font-bold">SKU: {o.products?.sku}</p></td>
                    <td className="px-8 py-5"><span className="text-base font-black text-orange-600">{o.quantity} <span className="text-[10px] text-apple-muted uppercase">un.</span></span></td>
                    <td className="px-8 py-5">
                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", o.status === 'pending' ? "bg-orange-50 text-orange-600 border-orange-100" : o.status === 'in_progress' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>{o.status === 'pending' ? 'Aguardando' : o.status === 'in_progress' ? 'Produzindo' : 'Finalizado'}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       {o.status === 'pending' && <button onClick={() => handleUpdateStatus(o.id, 'in_progress', o.product_id, o.quantity)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"><Play size={16} fill="currentColor" /></button>}
                       {o.status === 'in_progress' && <button onClick={() => handleUpdateStatus(o.id, 'completed', o.product_id, o.quantity)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><CheckCircle2 size={16} /></button>}
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