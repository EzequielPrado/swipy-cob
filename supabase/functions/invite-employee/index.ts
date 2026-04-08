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
    )

    const authHeader = req.headers.get('Authorization')
    const { data: { user: inviter }, error: inviterError } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    
    if (inviterError || !inviter) throw new Error("Não autorizado para convidar")

    const { email, fullName, systemRole, companyName } = await req.json()

    if (!email || !fullName) {
      throw new Error("E-mail e Nome são obrigatórios")
    }

    const appUrl = Deno.env.get('APP_URL')?.trim() || 'https://mxkorxmazthagjaqwrfk.supabase.co'
    const redirectTo = `${appUrl.replace(/\/$/, '')}/resetar-senha`

    console.log("[invite-employee] Enviando convite oficial", { email, redirectTo })

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        full_name: fullName, 
        company: companyName 
      },
      redirectTo
    })

    if (inviteError) {
      console.error("[invite-employee] Falha no convite", { message: inviteError.message })
      throw inviteError
    }

    const invitedUser = inviteData.user
    if (!invitedUser?.id) {
      throw new Error("Usuário convidado não foi retornado pelo Supabase")
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').update({
      full_name: fullName,
      company: companyName,
      system_role: systemRole,
      status: 'active',
      merchant_id: inviter.id
    }).eq('id', invitedUser.id)

    if (profileError) {
      console.error("[invite-employee] Falha ao atualizar perfil", { message: profileError.message, userId: invitedUser.id })
      throw profileError
    }

    return new Response(JSON.stringify({ success: true, userId: invitedUser.id, inviteSent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[invite-employee] Erro", { message: error.message })
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})