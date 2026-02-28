import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, subject, html } = await req.json()
    
    const hostname = Deno.env.get('SMTP_HOSTNAME')
    const port = Deno.env.get('SMTP_PORT')
    const username = Deno.env.get('SMTP_USERNAME')
    const password = Deno.env.get('SMTP_PASSWORD')

    if (!hostname || !port || !username || !password) {
      console.error("[send-email] Variáveis SMTP ausentes:", { hostname: !!hostname, port: !!port, user: !!username, pass: !!password })
      throw new Error("Configurações de SMTP (HOSTNAME, PORT, USERNAME, PASSWORD) não encontradas nas Secrets do projeto.")
    }

    console.log("[send-email] Preparando envio para:", to)

    const client = new SmtpClient()

    await client.connectTLS({
      hostname: hostname,
      port: parseInt(port),
      username: username,
      password: password,
    })

    await client.send({
      from: username,
      to,
      subject,
      content: html,
      type: "text/html",
    })

    await client.close()

    console.log("[send-email] E-mail enviado com sucesso")

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("[send-email] Erro fatal:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})