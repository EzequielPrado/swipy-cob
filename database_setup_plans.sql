-- 1. Criação da tabela de planos
CREATE TABLE IF NOT EXISTS public.system_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  max_employees INTEGER NOT NULL DEFAULT 5,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita a segurança de linha (RLS)
ALTER TABLE public.system_plans ENABLE ROW LEVEL SECURITY;

-- 3. Política: Todos os usuários logados podem ver os planos
DROP POLICY IF EXISTS "Planos visiveis para todos" ON public.system_plans;
CREATE POLICY "Planos visiveis para todos" ON public.system_plans
FOR SELECT TO authenticated USING (true);

-- 4. Política: Apenas Administradores podem Criar, Editar ou Excluir planos
DROP POLICY IF EXISTS "Acesso total para admins" ON public.system_plans;
CREATE POLICY "Acesso total para admins" ON public.system_plans
FOR ALL TO authenticated USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);