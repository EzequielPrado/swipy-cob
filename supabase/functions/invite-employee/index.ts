import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email, fullName, systemRole, companyName, origin } = await req.json();

    if (!email || !fullName) {
      throw new Error("E-mail e Nome são obrigatórios para criar o acesso.");
    }

    // Cliente Admin para ignorar RLS e criar o usuário no Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Gera uma senha temporária segura de 6 dígitos
    const tempPassword = `Swipy@${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company: companyName
      }
    });

    if (authError) {
      throw new Error(`Erro na criação: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 3. Atualiza a tabela Profile vinculando o cargo (RBAC)
    await supabaseAdmin.from('profiles').update({
      system_role: systemRole,
      status: 'active'
    }).eq('id', userId);

    // 4. Envio do E-mail via SMTP (usando suas Secrets configuradas)
    const hostname = Deno.env.get('SMTP_HOSTNAME')?.trim();
    const port = Deno.env.get('SMTP_PORT')?.trim();
    const username = Deno.env.get('SMTP_USERNAME')?.trim();
    const password = Deno.env.get('SMTP_PASSWORD')?.trim();

    if (hostname && username && password) {
      const client = new SmtpClient();
      const portNum = parseInt(port || '587');
      
      if (portNum === 465) {
        await client.connectTLS({ hostname, port: portNum, username, password });
      } else {
        await client.connect({ hostname, port: portNum, username, password });
      }

      const loginUrl = `${origin}/login`;
      
      const html = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #f97316;">Bem-vindo ao Swipy ERP!</h2>
          <p>Olá <strong>${fullName}</strong>,</p>
          <p>Seu acesso foi liberado por <strong>${companyName}</strong>. Seu perfil no sistema é: <strong>${systemRole}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Suas credenciais de acesso:</strong></p>
            <p style="margin: 0 0 5px 0;">E-mail: <strong>${email}</strong></p>
            <p style="margin: 0;">Senha Temporária: <strong>${tempPassword}</strong></p>
          </div>
          
          <p>Recomendamos que você altere sua senha após o primeiro login.</p>
          <a href="${loginUrl}" style="display: inline-block; background-color: #f97316; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Acessar Sistema</a>
        </div>
      `;

      await client.send({
        from: username,
        to: email,
        subject: `Seu Acesso ao Swipy ERP - ${companyName}`,
        content: html,
        type: "text/html",
      });

      await client.close();
    } else {
      console.warn("Credenciais SMTP não encontradas. O usuário foi criado, mas o e-mail não foi enviado.");
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})