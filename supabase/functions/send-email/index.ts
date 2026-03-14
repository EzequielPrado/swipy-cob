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
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { to, subject, html } = body;
    const hostname = Deno.env.get('SMTP_HOSTNAME')?.trim();
    const port = Deno.env.get('SMTP_PORT')?.trim();
    const username = Deno.env.get('SMTP_USERNAME')?.trim();
    const password = Deno.env.get('SMTP_PASSWORD')?.trim();

    if (!hostname || !port || !username || !password) {
      throw new Error("Configuração SMTP incompleta nas Secrets do Supabase.");
    }

    const portNum = parseInt(port);
    const client = new SmtpClient();

    console.log(`[send-email] Conectando a ${hostname}:${portNum}...`);

    try {
      if (portNum === 465) {
        await client.connectTLS({
          hostname,
          port: portNum,
          username,
          password,
        });
      } else {
        // Portas 587 ou 25
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
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (connErr) {
      console.error("[send-email] Detalhes do erro:", connErr.message);
      
      let tip = "Verifique as credenciais.";
      if (connErr.message.includes("timed out")) {
        tip = "A conexão expirou. Provavelmente a porta " + port + " está bloqueada pelo provedor ou firewall. Tente a porta 587.";
      }

      return new Response(JSON.stringify({ 
        error: "Erro de conexão SMTP", 
        details: connErr.message,
        tip: tip
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})