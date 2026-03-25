import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email, fullName, systemRole, companyName } = await req.json();

    if (!email || !fullName) {
      throw new Error("E-mail e Nome são obrigatórios para criar o acesso.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const tempPassword = `Swipy@${Math.floor(100000 + Math.random() * 900000)}`;
    let userId = '';

    // 1. Verifica se o usuário já existe na base Auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      // Atualiza a senha temporária do usuário existente
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });
      console.log(`[invite-employee] Usuário ${email} já existia. Senha atualizada.`);
    } else {
      // Cria o novo usuário
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
        throw new Error(`Erro ao criar o acesso: ${authError.message}`);
      }
      userId = authData.user.id;
      console.log(`[invite-employee] Novo usuário ${email} criado com sucesso.`);
    }

    // 2. Atualiza a tabela Profile vinculando o cargo (RBAC)
    await supabaseAdmin.from('profiles').update({
      system_role: systemRole,
      status: 'active'
    }).eq('id', userId);

    // Retorna Sucesso (200) com a senha temporária instantaneamente
    return new Response(JSON.stringify({ 
      success: true, 
      userId, 
      tempPassword 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[invite-employee] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})