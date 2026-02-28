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
      return new Response(JSON.stringify({ error: "Dados incompletos (to, subject, html)" }), {
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
      throw new Error("Configurações SMTP ausentes nas Secrets do Supabase.");
    }

    const client = new SmtpClient();
    const portNum = parseInt(port);

    console.log(`[send-email] DIAGNÓSTICO: Tentando conectar a ${hostname} na porta ${portNum}...`);

    try {
      // Tenta a conexão com timeout manual para evitar travamento infinito
      const connectPromise = portNum === 465 
        ? client.connectTLS({ hostname, port: portNum, username, password })
        : client.connect({ hostname, port: portNum, username, password });

      // Aguarda a conexão (Timeout implícito do Deno é de ~30s)
      await connectPromise;
      
      console.log(`[send-email] Conexão estabelecida com sucesso. Enviando e-mail para ${to}...`);

      await client.send({
        from: username,
        to,
        subject,
        content: html,
        type: "text/html",
      });

      await client.close();
      console.log("[send-email] E-mail enviado!");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (smtpErr) {
      console.error("[send-email] Erro de Conexão:", smtpErr.message);
      
      let friendlyMessage = smtpErr.message;
      if (smtpErr.message.includes("TimedOut") || smtpErr.message.includes("connection timed out")) {
        friendlyMessage = `Tempo de conexão esgotado. Verifique se a porta ${portNum} está correta para o host ${hostname} e se o firewall do seu servidor permite conexões externas.`;
      }

      return new Response(JSON.stringify({ error: friendlyMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    console.error("[send-email] Erro Fatal:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})