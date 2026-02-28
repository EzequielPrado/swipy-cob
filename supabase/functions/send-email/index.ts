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
    const hostname = Deno.env.get('SMTP_HOSTNAME')?.trim();
    const port = Deno.env.get('SMTP_PORT')?.trim();
    const username = Deno.env.get('SMTP_USERNAME')?.trim();
    const password = Deno.env.get('SMTP_PASSWORD')?.trim();

    if (!hostname || !port || !username || !password) {
      throw new Error("Faltam configurações SMTP nas Secrets do Supabase.");
    }

    const portNum = parseInt(port);
    const client = new SmtpClient();

    console.log(`[send-email] Tentando conexão: ${hostname}:${portNum} (Modo: ${portNum === 465 ? 'SSL/TLS' : 'STARTTLS'})`);

    try {
      if (portNum === 465) {
        // SSL Direto
        await client.connectTLS({
          hostname,
          port: portNum,
          username,
          password,
        });
      } else {
        // STARTTLS (Porta 587 ou 25)
        await client.connect({
          hostname,
          port: portNum,
          username,
          password,
        });
      }

      console.log(`[send-email] Autenticado. Enviando para ${to}...`);

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

    } catch (netErr) {
      console.error("[send-email] Erro de Rede/Conexão:", netErr.message);
      
      let msg = "Não foi possível conectar ao servidor de e-mail.";
      if (netErr.message.includes("TimedOut")) {
        msg = `Timeout na porta ${portNum}. O firewall do seu servidor (${hostname}) pode estar bloqueando o Supabase. Tente alternar entre as portas 465 e 587.`;
      }

      return new Response(JSON.stringify({ error: msg, details: netErr.message }), {
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