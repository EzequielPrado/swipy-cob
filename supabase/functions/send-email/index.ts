import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.to || !body.subject || !body.html) {
      throw new Error("Payload inválido. Certifique-se de enviar 'to', 'subject' e 'html'.");
    }

    const { to, subject, html } = body;
    
    const hostname = Deno.env.get('SMTP_HOSTNAME');
    const port = Deno.env.get('SMTP_PORT');
    const username = Deno.env.get('SMTP_USERNAME');
    const password = Deno.env.get('SMTP_PASSWORD');

    // Logs para debug (verificando se as variáveis existem sem mostrar a senha)
    console.log("[send-email] Verificando configurações:", { 
      hasHost: !!hostname, 
      hasPort: !!port, 
      hasUser: !!username, 
      hasPass: !!password 
    });

    if (!hostname || !port || !username || !password) {
      throw new Error("Configurações SMTP incompletas nas Secrets do Supabase (HOSTNAME, PORT, USERNAME, PASSWORD).");
    }

    const client = new SmtpClient();

    try {
      console.log(`[send-email] Conectando ao servidor: ${hostname}:${port}`);
      
      // Tenta conexão TLS (porta 465)
      await client.connectTLS({
        hostname,
        port: parseInt(port),
        username,
        password,
      });

      console.log("[send-email] Autenticado. Enviando e-mail para:", to);

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

    } catch (connError: any) {
      console.error("[send-email] Erro na conexão SMTP:", connError.message);
      throw new Error(`Falha na conexão SMTP: ${connError.message}`);
    }

  } catch (error: any) {
    console.error("[send-email] Erro na função:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})