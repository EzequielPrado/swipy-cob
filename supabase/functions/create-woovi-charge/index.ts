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

    // 1. Busca perfil do lojista
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key, status, company, full_name')
      .eq('id', userId)
      .single()

    if (profileErr || !profile?.woovi_api_key) {
      throw new Error("Configuração Woovi ausente no perfil.")
    }

    // 2. Busca dados do cliente
    const { data: customer, error: custError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (custError || !customer) throw new Error("Cliente não encontrado")

    const correlationID = crypto.randomUUID()

    // 3. Cria na Woovi
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

    // 5. DISPARO AUTOMÁTICO WHATSAPP (Régua de Cobrança)
    try {
      console.log(`[create-woovi-charge] Iniciando disparo de WhatsApp para ${customer.phone || customer.email}`);
      
      const merchantName = profile.company || profile.full_name || "Nossa Empresa";
      const checkoutUrl = `https://mxkorxmazthagjaqwrfk.supabase.co/pagar/${charge.id}`;
      
      // Geramos um QR Code público que a Meta consegue acessar (necessário para o Header Image)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(wooviData.charge.brCode)}&.png`;

      // Chamamos a função de envio interna
      const whatsappRes = await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          to: customer.phone,
          templateName: 'boleto1',
          language: 'en', // Sincronizado com seu template na Meta
          imageUrl: qrImageUrl,
          variables: [
            customer.name, 
            merchantName, 
            new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(amount)
          ],
          buttonVariable: checkoutUrl
        })
      });

      const waResult = await whatsappRes.json();
      console.log("[create-woovi-charge] Resposta WhatsApp:", waResult);
      
    } catch (waErr) {
      console.error("[create-woovi-charge] Falha no disparo automático:", waErr.message);
      // Não travamos a criação da cobrança se o WhatsApp falhar
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