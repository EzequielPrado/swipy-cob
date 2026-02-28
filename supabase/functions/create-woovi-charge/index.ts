import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { customerId, amount, method, dueDate, userId, description } = await req.json()

    // 1. Busca o token da Woovi no perfil do usuário
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key, status')
      .eq('id', userId)
      .single()

    if (profileErr || !profile?.woovi_api_key) {
      throw new Error("Usuário não possui Token Woovi configurado. Entre em contato com o suporte.")
    }

    if (profile.status !== 'active') {
      throw new Error("Sua conta está suspensa ou aguardando aprovação.")
    }

    // 2. Busca o cliente
    const { data: customer, error: custError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (custError || !customer) throw new Error("Cliente não encontrado")

    const correlationID = crypto.randomUUID()

    // 3. Cria na Woovi usando o token do usuário
    const wooviRes = await fetch('https://api.woovi.com/api/v1/charge', {
      method: 'POST',
      headers: {
        'Authorization': profile.woovi_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        correlationID,
        value: Math.round(amount * 100),
        comment: description,
        customer: {
          name: customer.name,
          email: customer.email,
          taxID: customer.tax_id
        }
      })
    })

    const wooviData = await wooviRes.json()
    if (!wooviRes.ok) throw new Error(wooviData.error || "Erro na Woovi")

    // 4. Salva localmente
    const { data: charge, error: chargeError } = await supabaseClient
      .from('charges')
      .insert({
        user_id: userId,
        customer_id: customerId,
        amount,
        description,
        method,
        due_date: dueDate,
        woovi_id: wooviData.charge.identifier,
        correlation_id: correlationID,
        payment_link: wooviData.charge.paymentLinkUrl,
        pix_qr_code: wooviData.charge.brCode, 
        pix_qr_image_base64: wooviData.charge.qrCodeImage || null, 
        status: 'pendente'
      })
      .select()
      .single()

    if (chargeError) throw chargeError

    return new Response(JSON.stringify(charge), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})