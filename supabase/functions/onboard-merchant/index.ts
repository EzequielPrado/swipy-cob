import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, planId } = await req.json()

    // 1. Buscar dados do novo lojista e do plano
    const { data: merchant } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
    const { data: plan } = await supabaseAdmin.from('system_plans').select('*').eq('id', planId).single()
    
    if (!merchant || !plan) throw new Error("Dados insuficientes para onboarding")

    // 2. Localizar o Administrador Master do Sistema (quem vai receber o pagamento)
    const { data: admin } = await supabaseAdmin
      .from('profiles')
      .select('id, woovi_api_key, company')
      .eq('is_admin', true)
      .order('updated_at', { ascending: true })
      .limit(1)
      .single()

    if (!admin?.woovi_api_key) throw new Error("Administrador do sistema não configurado.")

    console.log(`[onboard] Cadastrando ${merchant.full_name} como cliente de ${admin.company}`);

    // 3. Cadastrar o lojista como CLIENTE do Admin na Woovi
    const customerRes = await fetch('https://api.woovi.com/api/v1/customer', {
      method: 'POST',
      headers: { 'Authorization': admin.woovi_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: merchant.company || merchant.full_name,
        email: merchant.email, // Supondo que temos o email no profile
        taxID: merchant.cpf?.replace(/\D/g, ''),
        phone: merchant.phone,
        correlationID: `cust_${userId}`
      })
    })
    
    const customerData = await customerRes.json()
    const wooviCustomerId = customerData.customer?.identifier

    // 4. Salvar este lojista na tabela de 'customers' do Admin
    const { data: dbCustomer } = await supabaseAdmin.from('customers').insert({
      user_id: admin.id, // O dono do cliente é o admin
      name: merchant.company || merchant.full_name,
      email: merchant.email,
      tax_id: merchant.cpf,
      phone: merchant.phone,
      woovi_id: wooviCustomerId,
      status: 'em dia'
    }).select().single()

    // 5. Se o plano for pago (> 0), gerar a cobrança Pix
    let chargeId = null;
    if (plan.price > 0 && dbCustomer) {
      const chargeRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          customerId: dbCustomer.id,
          amount: plan.price,
          method: 'pix',
          dueDate: new Date().toISOString().split('T')[0],
          userId: admin.id, // Cobrança em nome do Admin
          description: `Assinatura Plano ${plan.name} - Swipy`,
          origin: "https://swipy.com" // Placeholder
        })
      })
      const chargeData = await chargeRes.json()
      chargeId = chargeData.id
    }

    return new Response(JSON.stringify({ success: true, chargeId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[onboard-error]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})