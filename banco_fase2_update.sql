-- 1. Adicionar Preço de Custo na tabela de produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- 2. Criar tabela de Histórico de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in' (entrada), 'out' (saída)
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar segurança (RLS)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_mov_select" ON public.inventory_movements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv_mov_insert" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_mov_update" ON public.inventory_movements FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv_mov_delete" ON public.inventory_movements FOR DELETE TO authenticated USING (auth.uid() = user_id);