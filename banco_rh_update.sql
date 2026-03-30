-- Evolução da Tabela de Colaboradores (Módulo de Gente e Gestão)
ALTER TABLE public.employees 

-- 1. Dados Pessoais
ADD COLUMN IF NOT EXISTS social_name TEXT,
ADD COLUMN IF NOT EXISTS rg_number TEXT,
ADD COLUMN IF NOT EXISTS rg_issuer TEXT,
ADD COLUMN IF NOT EXISTS rg_issue_date DATE,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Brasileira',
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS is_pcd BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pcd_type TEXT,
ADD COLUMN IF NOT EXISTS race TEXT,

-- 2. Contato & Endereço
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS landline TEXT,
ADD COLUMN IF NOT EXISTS extension TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,

-- 3. Vínculo (Extensão) e Dados Bancários
ADD COLUMN IF NOT EXISTS work_regime TEXT DEFAULT 'Presencial',
ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_agency TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_type TEXT DEFAULT 'Corrente',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'PIX',
ADD COLUMN IF NOT EXISTS pix_key TEXT,

-- 4. Documentos Legais e Benefícios
ADD COLUMN IF NOT EXISTS ctps_number TEXT,
ADD COLUMN IF NOT EXISTS ctps_series TEXT,
ADD COLUMN IF NOT EXISTS pis_pasep TEXT,
ADD COLUMN IF NOT EXISTS voter_id TEXT,
ADD COLUMN IF NOT EXISTS cnh_number TEXT,
ADD COLUMN IF NOT EXISTS cnh_category TEXT,
ADD COLUMN IF NOT EXISTS cnh_expiry DATE,
ADD COLUMN IF NOT EXISTS health_plan_provider TEXT,
ADD COLUMN IF NOT EXISTS meal_voucher NUMERIC,
ADD COLUMN IF NOT EXISTS transport_voucher_desc TEXT,

-- 5. Saúde e Segurança (SST)
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS aso_admission_date DATE,
ADD COLUMN IF NOT EXISTS aso_result TEXT DEFAULT 'Apto',

-- 6. Dados de Desligamento
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS termination_type TEXT,
ADD COLUMN IF NOT EXISTS termination_reason TEXT,
ADD COLUMN IF NOT EXISTS exit_interview BOOLEAN DEFAULT false;