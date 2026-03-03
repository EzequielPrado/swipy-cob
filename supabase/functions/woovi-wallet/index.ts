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
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key')
      .eq('id', user.id)
      .single()

    const appID = profile?.woovi_api_key?.trim();

    if (!appID) {
      return new Response(JSON.stringify({ error: "MISSING_KEY" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'balance'
    
    // Tentamos Woovi primeiro, se falhar tentamos OpenPix (comum em Wallet)
    const API_DOMAINS = ['https://api.woovi.com/api/v1', 'https://api.openpix.com.br/api/v1']

    if (action === 'balance') {
      let lastError = '';
      
      for (const base of API_DOMAINS) {
        const endpoint = `${base}/balance`;
        console.log(`[woovi-wallet] Tentando GET ${endpoint}`);

        const response = await fetch(endpoint, {
          headers: { 'Authorization': appID }
        })
        
        if (response.ok) {
          const data = await response.json()
          return new Response(JSON.stringify(data), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const errorText = await response.text();
        lastError = `Status ${response.status}: ${errorText}`;
        console.warn(`[woovi-wallet] Falha em ${base}: ${lastError}`);
        
        // Se for 403, é erro de permissão definitivo no AppID
        if (response.status === 403) {
          throw new Error("Seu AppID não tem permissão de 'Wallet'. Ative-a no painel da Woovi (API -> Editar AppID -> Permissões).");
        }
      }
      
      throw new Error(`Não foi possível acessar o saldo. Detalhes: ${lastError}`);
    }

    if (action === 'withdraw') {
      const { amount, pixKey, pixKeyType } = await req.json()
      
      // Para Cashout (Saque), a API costuma ser mais rigorosa no domínio
      const response = await fetch(`${API_DOMAINS[0]}/cashout`, {
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