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

    // Pegar usuário pelo token JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Autorização ausente")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error("Não autorizado")

    // Pegar o token específico deste usuário configurado no painel
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.woovi_api_key) {
      return new Response(JSON.stringify({ error: "MISSING_KEY" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'balance'

    // Endpoint oficial: api.woovi.com ou api.openpix.com.br
    const API_BASE = 'https://api.woovi.com/api/v1'

    if (action === 'balance') {
      console.log(`[woovi-wallet] Consultando saldo para: ${user.id}`)
      
      const response = await fetch(`${API_BASE}/balance`, {
        headers: { 'Authorization': profile.woovi_api_key }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[woovi-wallet] Woovi Error (${response.status}):`, errorText)
        throw new Error(`Woovi retornou erro ${response.status}: ${errorText.substring(0, 50)}`)
      }

      const data = await response.json()
      return new Response(JSON.stringify(data), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (action === 'withdraw') {
      const { amount, pixKey, pixKeyType } = await req.json()
      
      const response = await fetch(`${API_BASE}/cashout`, {
        method: 'POST',
        headers: { 
          'Authorization': profile.woovi_api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: Math.round(amount * 100), pixKey, pixKeyType })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro no Saque: ${errorText}`)
      }

      const data = await response.json()
      return new Response(JSON.stringify(data), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    throw new Error("Ação inválida")

  } catch (error: any) {
    console.error("[woovi-wallet] Erro:", error.message)
    return new Response(JSON.stringify({ error: "API_ERROR", message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})