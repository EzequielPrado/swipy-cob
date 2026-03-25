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
    
    if (action === 'balance') {
      const response = await fetch('https://api.woovi.com/api/v1/account', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          throw new Error("Seu AppID não tem permissão para ler a Conta. Ative no painel da Woovi.");
        }
        throw new Error(`Falha ao acessar conta: ${errorText}`);
      }

      const data = await response.json();
      
      let balanceInCents = 0;
      let blockedBalanceInCents = 0;

      // Localiza o objeto da conta na resposta
      const acc = data.account || (data.accounts && data.accounts[0]) || data;

      // Mapeia o saldo disponível e bloqueado
      if (typeof acc.balance === 'number') balanceInCents = acc.balance;
      if (typeof acc.blockedBalance === 'number') blockedBalanceInCents = acc.blockedBalance;
      else if (typeof acc.lockedBalance === 'number') blockedBalanceInCents = acc.lockedBalance;

      const totalInCents = balanceInCents + blockedBalanceInCents;

      return new Response(JSON.stringify({ 
        balance: { 
          available: balanceInCents,
          blocked: blockedBalanceInCents,
          total: totalInCents 
        }, 
        raw: data 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'withdraw') {
      const { amount, pixKey, pixKeyType } = await req.json()
      const response = await fetch(`https://api.woovi.com/api/v1/cashout`, {
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
    return new Response(JSON.stringify({ error: "API_ERROR", message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})