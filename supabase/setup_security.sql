-- =======================================================
-- SWIPY SECURITY & INFRASTRUCTURE (FASE 2)
-- =======================================================

-- 1. Cofre de Credenciais de Lojistas
CREATE TABLE IF NOT EXISTS public.merchant_credentials (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    woovi_api_key TEXT,
    petta_api_key TEXT,
    petta_secret TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar dados existentes de profiles para merchant_credentials
INSERT INTO public.merchant_credentials (id, woovi_api_key, petta_api_key, petta_secret)
SELECT id, woovi_api_key, petta_api_key, petta_secret 
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.merchant_credentials ENABLE ROW LEVEL SECURITY;

-- Regra: Apenas Admins podem ler/gravar via PostgREST (frontend)
CREATE POLICY "Admins can manage credentials" ON public.merchant_credentials
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.system_role = 'Admin'
        )
    );

-- 2. Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem criar seus próprios logs
CREATE POLICY "Users can insert their own logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Apenas Admins podem ler os logs
CREATE POLICY "Admins can view all logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.system_role = 'Admin'
        )
    );

-- 3. Função RPC para Transferência Segura
CREATE OR REPLACE FUNCTION public.execute_safe_transfer(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
    -- Lógica de transferência atômica simplificada
    -- Reduz do remetente
    UPDATE public.profiles 
    SET balance = COALESCE(balance, 0) - p_amount 
    WHERE id = p_sender_id AND COALESCE(balance, 0) >= p_amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Saldo insuficiente ou remetente não encontrado.';
    END IF;

    -- Adiciona ao destinatário
    UPDATE public.profiles 
    SET balance = COALESCE(balance, 0) + p_amount 
    WHERE id = p_receiver_id;

    -- Registra na auditoria
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (p_sender_id, 'transferencia_interna', jsonb_build_object('receiver', p_receiver_id, 'amount', p_amount));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
