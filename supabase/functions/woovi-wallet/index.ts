import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("No authorization header")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error("[woovi-wallet] Erro de autenticação:", authError?.message)
      throw new Error("Não autorizado")
    }

    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.woovi_api_key) {
      console.warn("[woovi-wallet] Usuário sem API Key configurada:", user.id)
      return new Response(JSON.stringify({ error: "MISSING_KEY", message: "Configure sua API Key da Woovi nas configurações." }), { 
        status: 200, // Retornamos 200 para o front tratar amigavelmente
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'balance'

    if (action === 'balance') {
      console.log("[woovi-wallet] Consultando saldo para o usuário:", user.id)
      
      const response = await fetch('https://api.woovi.com/api/v1/balance', {
        headers: { 'Authorization': profile.woovi_api_key }
      })
      
      const data = await response.json()
      console.log("[woovi-wallet] Resposta da Woovi:", JSON.stringify(data))
      
      return new Response(JSON.stringify(data), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (action === 'withdraw') {
      const { amount, pixKey, pixKeyType } = await req.json()
      console.log("[woovi-wallet] Solicitando saque:", { amount, pixKeyType })
      
      const response = await fetch('https://api.woovi.com/api/v1/cashout', {
        method: 'POST',
        headers: { 
          'Authorization': profile.woovi_api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: Math.round(amount * 100), pixKey, pixKeyType })
      })
      
      const data = await response.json()
      console.log("[woovi-wallet] Resposta do saque:", JSON.stringify(data))
      
      return new Response(JSON.stringify(data), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    throw new Error("Ação inválida")

  } catch (error: any) {
    console.error("[woovi-wallet] Erro interno:", error.message)
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})