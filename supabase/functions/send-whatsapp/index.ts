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
      throw new Error("Configuração de WhatsApp pendente nas Secrets do Supabase.")
    }

    if (!to) {
      throw new Error("O número de destino (campo 'to') é obrigatório.");
    }

    const cleanNumber = to.replace(/\D/g, '')
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`
    
    // Ajuste: templates brasileiros geralmente são pt_BR
    const langCode = language || "pt_BR";

    console.log(`[send-whatsapp] Enviando '${templateName}' (${langCode}) para ${finalNumber}.`);

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
        index: 0,
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
          language: { code: langCode },
          components
        }
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error("[send-whatsapp] Erro da Meta:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: result.error?.message || "Erro API Meta" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log("[send-whatsapp] Mensagem aceita pela Meta ID:", result.messages?.[0]?.id);

    return new Response(JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }), {
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