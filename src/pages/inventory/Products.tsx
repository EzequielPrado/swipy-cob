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
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Controle do modal de detalhes
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  // Extrair categorias únicas para o filtro
  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [products]);

  // Aplica a busca por texto E o filtro de categoria
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchLower) ||
                            (p.sku && p.sku.toLowerCase().includes(searchLower));
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Deseja excluir o produto "${name}"? Esta ação não pode ser desfeita.`)) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      showSuccess('Produto excluído com sucesso');
      fetchProducts();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleRowClick = (product: any) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Produtos e Serviços</h2>
            <p className="text-zinc-400 mt-1">Gerencie seu catálogo de vendas e controle de estoque.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus size={18} /> Novo Item
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Package size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Total de Itens</span>
            </div>
            <p className="text-3xl font-bold text-zinc-100">{products.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Archive size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Em Estoque (Soma)</span>
            </div>
            <p className="text-3xl font-bold text-zinc-100">
              {products.reduce((acc, curr) => acc + (curr.stock_quantity || 0), 0)}
            </p>
          </div>
        </div>

        {/* Área de Filtros Aprimorada */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900/50 p-2 rounded-3xl border border-zinc-800/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou SKU..." 
              className="w-full bg-zinc-900 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-0 outline-none transition-all"
            />
          </div>
          
          <div className="w-full md:w-auto flex items-center gap-2 pr-2">
            <Filter size={16} className="text-zinc-500 ml-2 md:ml-0" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[220px] bg-zinc-900 border-zinc-800 h-11 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectItem value="all" className="font-bold text-orange-400">Todas as Categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[400px] shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Package size={48} className="mb-4 opacity-20" />
              <p>Nenhum produto encontrado com esses filtros.</p>
              {(searchTerm || selectedCategory !== 'all') && (
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                  className="mt-4 text-xs text-orange-500 hover:underline"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5">Item</th>
                  <th className="px-8 py-5">Categoria</th>
                  <th className="px-8 py-5">Estoque</th>
                  <th className="px-8 py-5">Preço</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(product)}
                  >
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-sm font-bold text-zinc-100 group-hover:text-orange-400 transition-colors">{product.name}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{product.sku || 'Sem SKU'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight bg-zinc-800 text-zinc-300">
                        <Tag size={10} />
                        {product.category || 'Geral'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "text-sm font-bold",
                        product.stock_quantity > 0 ? "text-emerald-400" : "text-zinc-500"
                      )}>
                        {product.stock_quantity} un
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-zinc-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => handleDelete(e, product.id, product.name)}
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

      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchProducts}
      />

      <ProductDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        product={selectedProduct}
      />
    </AppLayout>
  );
};

export default Products;