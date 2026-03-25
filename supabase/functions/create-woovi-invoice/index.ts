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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Não autorizado")
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) throw new Error("Usuário não encontrado")

    const { chargeId, customerId, amount, description } = await req.json()

    // 1. Pegar Token do Lojista
    const { data: profile } = await supabaseClient.from('profiles').select('woovi_api_key, company, full_name').eq('id', user.id).single()
    if (!profile?.woovi_api_key) throw new Error("Token Woovi não configurado em Configurações.")

    // 2. Pegar Dados do Cliente
    const { data: customer } = await supabaseClient.from('customers').select('*').eq('id', customerId).single()
    if (!customer) throw new Error("Cliente não encontrado")

    const merchantName = profile.company || profile.full_name || "Nossa Empresa";

    // 3. Montar Payload da Woovi (Conforme documentação fornecida)
    const payload = {
      description: description || `Fatura de Serviços - ${merchantName}`,
      billingDate: new Date().toISOString(),
      correlationID: chargeId || crypto.randomUUID(),
      value: Math.round(amount * 100),
      customer: {
        taxID: customer.tax_id.replace(/\D/g, ''),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: {
          zipcode: customer.address?.zipcode || '',
          street: customer.address?.street || '',
          number: customer.address?.number || '',
          state: customer.address?.state || '',
          country: 'BR'
        }
      }
    }

    const response = await fetch('https://api.woovi.com/api/v1/invoice', {
      method: 'POST',
      headers: {
        'Authorization': profile.woovi_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Erro na API da Woovi")

    const invoiceUrl = result.invoice.linkUrl || result.invoice.url

    // 4. Disparar WhatsApp se houver telefone
    if (customer.phone) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({
            to: customer.phone,
            templateName: 'invoice_ready', // Nome fictício, deve bater com seu template Meta
            variables: [customer.name, merchantName, invoiceUrl],
            buttonVariable: invoiceUrl
          })
        })
      } catch (waErr) {
        console.error("[Invoice] Falha ao enviar WhatsApp:", waErr.message)
      }
    }

    // 5. Registrar evento
    await supabaseClient.from('notification_logs').insert({
      charge_id: chargeId,
      type: 'system',
      status: 'success',
      message: `Fatura Fiscal emitida via Woovi. Link: ${invoiceUrl}`
    })

    return new Response(JSON.stringify({ success: true, url: invoiceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})