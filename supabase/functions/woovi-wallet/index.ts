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
    if (!authHeader) throw new Error("Autorização ausente")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error("Não autorizado")

    // Busca o AppID configurado no perfil do usuário
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

    const appID = profile.woovi_api_key;
    // LOG DE SEGURANÇA: Mostra apenas o início da chave para conferência
    console.log(`[woovi-wallet] Usando AppID (início): ${appID.substring(0, 8)}... para o usuário ${user.id}`);

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'balance'

    // Usando o domínio primário da OpenPix (mais estável para saldo)
    const API_BASE = 'https://api.openpix.com.br/api/v1'

    if (action === 'balance') {
      const response = await fetch(`${API_BASE}/balance`, {
        headers: { 'Authorization': appID }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[woovi-wallet] Woovi Error ${response.status}:`, errorText)
        throw new Error(`Woovi 404: Verifique se o AppID tem permissão de Wallet e se o endpoint está ativo.`)
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
          'Authorization': appID,
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