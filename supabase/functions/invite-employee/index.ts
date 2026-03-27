import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Identificar quem está convidando (o lojista) através do token
    const authHeader = req.headers.get('Authorization')
    const { data: { user: inviter }, error: inviterError } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    
    if (inviterError || !inviter) throw new Error("Não autorizado para convidar.")

    const { email, fullName, systemRole, companyName } = await req.json();

    if (!email || !fullName) {
      throw new Error("E-mail e Nome são obrigatórios.");
    }

    const tempPassword = `Swipy@${Math.floor(100000 + Math.random() * 900000)}`;
    let userId = '';

    // 1. Verifica se o usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });
    } else {
      // Cria o novo usuário
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, company: companyName }
      });

      if (authError) throw authError;
      userId = authData.user.id;
    }

    // 2. VINCULAÇÃO CRÍTICA: Definimos o merchant_id como o ID do lojista que convidou
    await supabaseAdmin.from('profiles').update({
      system_role: systemRole,
      status: 'active',
      merchant_id: inviter.id, // <--- Aqui está o vínculo
      company: companyName
    }).eq('id', userId);

    return new Response(JSON.stringify({ success: true, userId, tempPassword }), {
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