"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Search, Plus, Loader2, Trash2, Package, Tag, Archive, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { showError, showSuccess } from '@/utils/toast';
import AddProductModal from '@/components/inventory/AddProductModal';
import ProductDetailsModal from '@/components/inventory/ProductDetailsModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Deseja excluir o produto "${name}"?`)) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      showSuccess('Produto excluído');
      fetchProducts();
    } catch (err: any) { showError(err.message); }
  };

  const handleRowClick = (product: any) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black">Produtos & Serviços</h2>
            <p className="text-apple-muted mt-1 font-medium">Gestão de catálogo e controle de estoque centralizado.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"><Plus size={18} /> Novo Item</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Total SKUs</p><p className="text-3xl font-black text-apple-black">{products.length}</p></div>
          <div className="bg-apple-white border border-apple-border p-6 rounded-[2rem] shadow-sm"><p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-2">Unidades em Estoque</p><p className="text-3xl font-black text-apple-black">{products.reduce((acc, c) => acc + (c.stock_quantity || 0), 0)}</p></div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-apple-white p-2 rounded-[2rem] border border-apple-border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-muted" size={18} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou SKU..." className="w-full bg-transparent border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-0 outline-none text-apple-black" />
          </div>
          <div className="w-full md:w-auto flex items-center gap-2 pr-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px] bg-apple-offWhite border-apple-border h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="bg-apple-white border-apple-border text-apple-black"><SelectItem value="all">Todas</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-apple-offWhite text-apple-muted text-[10px] uppercase font-bold tracking-[0.2em] border-b border-apple-border">
                <tr><th className="px-8 py-5">Produto</th><th className="px-8 py-5">Estoque</th><th className="px-8 py-5">Preço Venda</th><th className="px-8 py-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-apple-border">
                {filteredProducts.map((p) => (
                  <tr key={p.id} onClick={() => handleRowClick(p)} className="hover:bg-apple-light transition-colors cursor-pointer group">
                    <td className="px-8 py-5"><p className="text-sm font-bold text-apple-black group-hover:text-orange-500 transition-colors">{p.name}</p><p className="text-[10px] text-apple-muted font-bold font-mono">SKU: {p.sku}</p></td>
                    <td className="px-8 py-5"><span className={cn("text-sm font-black", p.stock_quantity > 0 ? "text-emerald-600" : "text-red-500")}>{p.stock_quantity} un</span></td>
                    <td className="px-8 py-5 text-sm font-black text-apple-black">{currency.format(p.price)}</td>
                    <td className="px-8 py-5 text-right"><button onClick={(e) => handleDelete(e, p.id, p.name)} className="p-2 text-apple-muted hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchProducts} />
      <ProductDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} product={selectedProduct} />
    </AppLayout>
  );
};

export default Products;