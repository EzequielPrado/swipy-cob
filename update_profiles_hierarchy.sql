-- Adiciona o campo que identifica a empresa 'mãe' do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Comentário: Se merchant_id for NULL, o usuário é o dono da conta (lojista).
-- Se merchant_id tiver valor, ele é um funcionário vinculado àquele ID.