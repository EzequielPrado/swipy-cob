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
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    if (!user) throw new Error("Não autorizado")

    const { code } = await req.json()
    if (!code) throw new Error("Código de autorização ausente")

    console.log("[nuvemshop-auth] Trocando código pelo token...");

    // 1. Chamar API da Nuvemshop para pegar o Token
    const tokenRes = await fetch('https://www.nuvemshop.com.br/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('NUVEMSHOP_CLIENT_ID'),
        client_secret: Deno.env.get('NUVEMSHOP_CLIENT_SECRET'),
        grant_type: 'authorization_code',
        code: code
      })
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenData.error_description || "Erro na Nuvemshop")

    // 2. Salvar na tabela de integrações
    const { error: dbError } = await supabaseAdmin
      .from('integrations')
      .upsert({
        user_id: user.id,
        provider: 'nuvemshop',
        access_token: tokenData.access_token,
        store_id: tokenData.user_id.toString(),
        status: 'active',
        settings: {
          token_type: tokenData.token_type,
          scope: tokenData.scope,
          connected_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[nuvemshop-auth] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})