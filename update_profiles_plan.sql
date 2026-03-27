-- Adiciona a coluna de ID do plano na tabela de perfis
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.system_plans(id) ON DELETE SET NULL;

-- Garante que os admins podem atualizar essa coluna
-- (A política de update em profiles já permite que admins editem qualquer perfil no seu sistema)