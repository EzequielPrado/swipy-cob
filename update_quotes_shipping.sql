-- Adicionar colunas de rastreio e logística na tabela de orçamentos
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.quotes.carrier IS 'Nome da transportadora responsável pelo envio';
COMMENT ON COLUMN public.quotes.tracking_code IS 'Código ou link de rastreamento do pedido';