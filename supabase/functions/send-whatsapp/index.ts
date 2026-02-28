import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Adicionado parâmetro 'language'
    const { to, templateName, variables, imageUrl, buttonVariable, language } = await req.json()
    
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) throw new Error("Configuração pendente nas Secrets.")

    const cleanNumber = to.replace(/\D/g, '')
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`

    // Montando os componentes do template
    const components = []

    // 1. Header (Imagem)
    if (imageUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: imageUrl } }]
      })
    }

    // 2. Body (Texto com variáveis)
    if (variables && variables.length > 0) {
      components.push({
        type: "body",
        parameters: variables.map((val: string) => ({ type: "text", text: String(val) }))
      })
    }

    // 3. Botão (URL Dinâmica) - Geralmente o índice 0 é o primeiro botão
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
          // Usa o idioma enviado ou fallback para en_US (Inglês)
          language: { code: language || "en_US" },
          components
        }
      })
    })

    const result = await response.json()
    if (!response.ok) {
      console.error("Erro Meta:", JSON.stringify(result));
      throw new Error(result.error?.message || "Erro API Meta")
    }

    return new Response(JSON.stringify({ success: true, id: result.messages?.[0]?.id }), {
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