import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handler para CORS (browser)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, templateName, variables } = await req.json()
    
    // Configurações da Meta via Secrets do Supabase
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      console.error("[send-whatsapp] Credenciais WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausentes");
      throw new Error("Configuração do WhatsApp pendente nas Secrets do Supabase.")
    }

    // Formatar número (remover caracteres e garantir DDI)
    const cleanNumber = to.replace(/\D/g, '')
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`

    console.log(`[send-whatsapp] Enviando template ${templateName} para ${finalNumber}`);

    // Chamada oficial para a API da Meta (Graph API)
    const response = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: finalNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: variables.map((val: string) => ({
                type: "text",
                text: val
              }))
            }
          ]
        }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[send-whatsapp] Erro Meta API:", result);
      throw new Error(result.error?.message || "Erro ao disparar WhatsApp")
    }

    return new Response(JSON.stringify({ success: true, messageId: result.messages[0].id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[send-whatsapp] Erro interno:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})