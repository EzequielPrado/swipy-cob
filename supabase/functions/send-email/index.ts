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
      return new Response(JSON.stringify({ error: "Dados incompletos (to, subject ou html ausentes)" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { to, subject, html } = body;
    
    // Captura e limpa as secrets
    const hostname = Deno.env.get('SMTP_HOSTNAME')?.trim();
    const port = Deno.env.get('SMTP_PORT')?.trim();
    const username = Deno.env.get('SMTP_USERNAME')?.trim();
    const password = Deno.env.get('SMTP_PASSWORD')?.trim();

    if (!hostname || !port || !username || !password) {
      console.error("[send-email] Erro: Faltam Secrets SMTP no Supabase.");
      return new Response(JSON.stringify({ 
        error: "Configuração SMTP incompleta.", 
        details: "Verifique se SMTP_HOSTNAME, SMTP_PORT, SMTP_USERNAME e SMTP_PASSWORD estão definidos nas Secrets do projeto." 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const portNum = parseInt(port);
    const client = new SmtpClient();

    console.log(`[send-email] Tentando enviar para ${to} via ${hostname}:${portNum}...`);

    try {
      if (portNum === 465) {
        // Porta 465 geralmente usa SSL/TLS direto
        await client.connectTLS({
          hostname,
          port: portNum,
          username,
          password,
        });
      } else {
        // Porta 587 ou 25 geralmente usa STARTTLS
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
      console.log("[send-email] E-mail enviado com sucesso!");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (connErr) {
      console.error("[send-email] Erro na conexão SMTP:", connErr.message);
      return new Response(JSON.stringify({ 
        error: "Falha na conexão com o servidor de e-mail.", 
        details: connErr.message,
        tip: "Se estiver usando a porta 465, tente a 587 (e vice-versa). Certifique-se de que o usuário/senha estão corretos."
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    console.error("[send-email] Erro Fatal:", err.message);
    return new Response(JSON.stringify({ error: "Erro interno no servidor de e-mail.", details: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})