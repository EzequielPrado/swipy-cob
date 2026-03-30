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

    const authHeader = req.headers.get('Authorization')
    const { data: { user: inviter }, error: inviterError } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    
    if (inviterError || !inviter) throw new Error("Não autorizado para convidar.")

    const { email, fullName, systemRole, companyName } = await req.json();

    if (!email || !fullName) {
      throw new Error("E-mail e Nome são obrigatórios.");
    }

    console.log(`[invite-employee] Enviando convite oficial para: ${email}`);

    // Usamos inviteUserByEmail para disparar o fluxo de e-mail do Supabase
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        full_name: fullName, 
        company: companyName 
      },
      // Redireciona o usuário para a tela de reset de senha após clicar no link do e-mail
      redirectTo: `${req.headers.get('origin')}/resetar-senha`
    });

    if (inviteError) throw inviteError;

    const userId = inviteData.user.id;

    // Vincula o perfil ao lojista que convidou (merchant_id)
    await supabaseAdmin.from('profiles').update({
      system_role: systemRole,
      status: 'active',
      merchant_id: inviter.id,
      company: companyName
    }).eq('id', userId);

    return new Response(JSON.stringify({ success: true, userId, inviteSent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[invite-employee] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})