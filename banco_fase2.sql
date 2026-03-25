-- 1. Criação da Tabela de Produtos
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  sku TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Segurança)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para Produtos
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Criação da Tabela de Orçamentos
CREATE TABLE public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select" ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Criação da Tabela de Itens do Orçamento
CREATE TABLE public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_items_select" ON public.quote_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
);
CREATE POLICY "quote_items_insert" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
);
CREATE POLICY "quote_items_update" ON public.quote_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
);
CREATE POLICY "quote_items_delete" ON public.quote_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
);