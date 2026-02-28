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

  const { to, subject, html } = await req.json()
  
  console.log("[send-email] Preparando envio para:", to)

  const client = new SmtpClient()

  await client.connectTLS({
    hostname: Deno.env.get('SMTP_HOSTNAME') || '',
    port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
    username: Deno.env.get('SMTP_USERNAME') || '',
    password: Deno.env.get('SMTP_PASSWORD') || '',
  })

  await client.send({
    from: Deno.env.get('SMTP_USERNAME') || '',
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
})