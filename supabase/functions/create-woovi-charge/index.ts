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

    const { customerId, amount, method, dueDate, userId, description, origin } = await req.json()

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key, company, full_name')
      .eq('id', userId)
      .single()

    if (!profile?.woovi_api_key) throw new Error("Configuração Woovi ausente")

    const { data: customer } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (!customer) throw new Error("Cliente não encontrado")

    const correlationID = crypto.randomUUID()

    const wooviRes = await fetch('https://api.woovi.com/api/v1/charge', {
      method: 'POST',
      headers: { 'Authorization': profile.woovi_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correlationID,
        value: Math.round(amount * 100),
        comment: description,
        customer: { name: customer.name, email: customer.email, taxID: customer.tax_id }
      })
    })

    const wooviData = await wooviRes.json()
    if (!wooviRes.ok) throw new Error(wooviData.error || "Erro Woovi")

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
        pix_qr_image_base64: wooviData.charge.qrCodeImage, 
        status: 'pendente'
      })
      .select().single()

    if (chargeError) throw chargeError

    // BUSCAR REGRA DE CRIAÇÃO (Offset -1)
    const { data: creationRule } = await supabaseClient
      .from('billing_rules')
      .select('*')
      .eq('day_offset', -1)
      .eq('is_active', true)
      .single();

    if (creationRule) {
      try {
        const merchantName = profile.company || profile.full_name || "Nossa Empresa";
        const systemCheckoutUrl = `${origin}/pagar/${charge.id}`;
        
        // Se houver imagem na regra, usa ela, senão gera QR Code temporário
        const imageUrl = creationRule.image_url || `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(wooviData.charge.brCode)}&.png`;

        const variables = creationRule.mapping.map((key: string) => {
          if (key === 'customer_name') return customer.name;
          if (key === 'merchant_name') return merchantName;
          if (key === 'amount') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(amount);
          if (key === 'due_date') return new Date(dueDate).toLocaleDateString('pt-BR');
          if (key === 'payment_link') return systemCheckoutUrl;
          return '---';
        });

        const waRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            to: customer.phone,
            templateName: creationRule.name,
            language: creationRule.language || 'en',
            imageUrl: imageUrl,
            variables: variables,
            buttonVariable: charge.id
          })
        });

        await supabaseClient.from('notification_logs').insert({
          charge_id: charge.id,
          type: 'whatsapp',
          status: waRes.ok ? 'success' : 'error',
          message: waRes.ok ? 'WhatsApp de criação enviado' : 'Falha ao enviar WhatsApp de criação'
        });

      } catch (waErr) {
        console.error("Erro WA:", waErr.message);
      }
    }

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