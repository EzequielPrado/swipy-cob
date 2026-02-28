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

    const { customerId, amount, method, dueDate, userId } = await req.json()
    const WOOVI_API_KEY = Deno.env.get('WOOVI_API_KEY')

    const { data: customer, error: custError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (custError || !customer) throw new Error("Cliente não encontrado")

    const correlationID = crypto.randomUUID()

    const wooviRes = await fetch('https://api.woovi.com/api/v1/charge', {
      method: 'POST',
      headers: {
        'Authorization': WOOVI_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        correlationID,
        value: Math.round(amount * 100),
        customer: {
          name: customer.name,
          email: customer.email,
          taxID: customer.tax_id
        }
      })
    })

    const wooviData = await wooviRes.json()
    if (!wooviRes.ok) throw new Error(wooviData.error || "Erro na Woovi")

    // Woovi retorna a imagem em wooviData.charge.qrCode.image
    const { data: charge, error: chargeError } = await supabaseClient
      .from('charges')
      .insert({
        user_id: userId,
        customer_id: customerId,
        amount,
        method,
        due_date: dueDate,
        woovi_id: wooviData.charge.identifier,
        correlation_id: correlationID,
        payment_link: wooviData.charge.paymentLinkUrl,
        pix_qr_code: wooviData.charge.brCode, // Texto para o "Copia e Cola"
        pix_qr_image_base64: wooviData.charge.qrCode?.image || null, // Imagem real do QR Code
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