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

    // Busca o AppID no perfil
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key')
      .eq('id', user.id)
      .single()

    // Importante: .trim() para remover espaços acidentais
    const appID = profile?.woovi_api_key?.trim();

    if (!appID) {
      return new Response(JSON.stringify({ error: "MISSING_KEY" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    console.log(`[woovi-wallet] Usuário ${user.id} chamando API. Chave: ${appID.substring(0, 8)}...`);

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'balance'
    
    // Tentando api.woovi.com como primário
    const API_BASE = 'https://api.woovi.com/api/v1'

    if (action === 'balance') {
      const endpoint = `${API_BASE}/balance`;
      console.log(`[woovi-wallet] Chamando GET ${endpoint}`);

      const response = await fetch(endpoint, {
        headers: { 'Authorization': appID }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[woovi-wallet] Woovi Error ${response.status} em ${endpoint}:`, errorText)
        
        // Se der 404, pode ser que a Woovi exija o domínio openpix
        if (response.status === 404) {
          throw new Error("API Woovi retornou 404. Verifique se este AppID tem permissão de Wallet ativada no painel da Woovi (Menu API -> Editar AppID -> Permissões).")
        }
        
        throw new Error(`Erro Woovi ${response.status}: ${errorText}`)
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
    console.error("[woovi-wallet] Erro crítico:", error.message)
    return new Response(JSON.stringify({ error: "API_ERROR", message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})