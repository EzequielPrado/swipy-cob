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
    const body = await req.json().catch(() => null);
    if (!body || !body.to || !body.subject || !body.html) {
      console.error("[send-email] Payload inválido:", body);
      return new Response(JSON.stringify({ error: "Dados de envio incompletos (to, subject, html)" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { to, subject, html } = body;
    const hostname = Deno.env.get('SMTP_HOSTNAME');
    const port = Deno.env.get('SMTP_PORT');
    const username = Deno.env.get('SMTP_USERNAME');
    const password = Deno.env.get('SMTP_PASSWORD');

    if (!hostname || !port || !username || !password) {
      console.error("[send-email] Configurações ausentes no Supabase Secrets");
      return new Response(JSON.stringify({ error: "Configure SMTP_HOSTNAME, SMTP_PORT, SMTP_USERNAME e SMTP_PASSWORD nas Secrets do Supabase." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const client = new SmtpClient();
    const portNum = parseInt(port);

    try {
      console.log(`[send-email] Conectando a ${hostname}:${portNum}...`);
      
      // Se a porta for 465, usa TLS direto. Se for 587, usa STARTTLS.
      if (portNum === 465) {
        await client.connectTLS({
          hostname,
          port: portNum,
          username,
          password,
        });
      } else {
        await client.connect({
          hostname,
          port: portNum,
          username,
          password,
        });
      }

      await client.send({
        from: username,
        to,
        subject,
        content: html,
        type: "text/html",
      });

      await client.close();
      console.log("[send-email] Sucesso!");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (smtpErr) {
      console.error("[send-email] Erro na comunicação SMTP:", smtpErr.message);
      return new Response(JSON.stringify({ error: `SMTP Error: ${smtpErr.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    console.error("[send-email] Erro interno:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})