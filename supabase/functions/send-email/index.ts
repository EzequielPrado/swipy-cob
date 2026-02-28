import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"
import { writeAll } from "https://deno.land/std@0.190.0/streams/write_all.ts"

// Patch para compatibilidade com Deno 2.0/Supabase atual
if (!(Deno as any).writeAll) {
  (Deno as any).writeAll = writeAll;
}

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
    const hostname = Deno.env.get('SMTP_HOSTNAME');
    const port = Deno.env.get('SMTP_PORT');
    const username = Deno.env.get('SMTP_USERNAME');
    const password = Deno.env.get('SMTP_PASSWORD');

    if (!hostname || !port || !username || !password) {
      throw new Error("Configurações SMTP ausentes nas Secrets.");
    }

    const client = new SmtpClient();
    const portNum = parseInt(port);

    console.log(`[send-email] Iniciando envio para ${to} via ${hostname}:${portNum}...`);

    try {
      // Se a porta for 465, usamos SSL implícito (connectTLS)
      // Para 587, usamos STARTTLS (connect)
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
      console.log("[send-email] E-mail enviado com sucesso!");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (smtpErr) {
      // Log detalhado para depuração
      console.error("[send-email] Erro na biblioteca SMTP:", smtpErr);
      
      // Se o erro for a resposta 250, tentamos uma mensagem mais clara
      const errorMsg = smtpErr.message || String(smtpErr);
      if (errorMsg.includes("250")) {
        throw new Error("O servidor SMTP enviou uma saudação que a biblioteca não conseguiu processar. Tente mudar a porta de 465 para 587 (ou vice-versa) nas Secrets.");
      }
      
      throw smtpErr;
    }

  } catch (err) {
    console.error("[send-email] Falha geral:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})