import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { to, templateName, variables, imageUrl, buttonVariable, language } = await req.json()
    
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      console.error("[send-whatsapp] Erro: WHATSAPP_ACCESS_TOKEN ou PHONE_NUMBER_ID não configurados.");
      throw new Error("Configuração de WhatsApp pendente nas Secrets do Supabase.")
    }

    const cleanNumber = to.replace(/\D/g, '')
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`

    console.log(`[send-whatsapp] Enviando '${templateName}' para ${finalNumber}. Variáveis:`, variables);

    const components = []

    if (imageUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: imageUrl } }]
      })
    }

    if (variables && variables.length > 0) {
      components.push({
        type: "body",
        parameters: variables.map((val: string) => ({ type: "text", text: String(val) }))
      })
    }

    if (buttonVariable) {
      components.push({
        type: "button",
        sub_type: "url",
        index: 0, // Assume que o botão com link dinâmico é o primeiro da lista
        parameters: [
          { type: "text", text: String(buttonVariable) } 
        ]
      })
    }

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
          language: { code: language || "en_US" },
          components
        }
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error("[send-whatsapp] Erro API Meta:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: result.error?.message || "Erro API Meta", details: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    console.log(`[send-whatsapp] Sucesso! ID Mensagem: ${result.messages?.[0]?.id}`);
    return new Response(JSON.stringify({ success: true, id: result.messages?.[0]?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[send-whatsapp] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})