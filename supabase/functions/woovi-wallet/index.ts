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
      return new Response(JSON.stringify({ error: "MISSING_KEY", message: "Token Woovi não configurado." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'balance'
    
    if (action === 'balance') {
      // 1. Primeiro, listamos a conta para descobrir o ID correto dela
      const listResponse = await fetch('https://api.woovi.com/api/v1/account', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      
      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        return new Response(JSON.stringify({ error: "WOOVI_ERROR", message: `Falha ao listar contas: ${errorText}` }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const listData = await listResponse.json();
      let accountId = null;
      let rawData = listData;

      // Pega o ID da primeira conta retornada
      if (listData.accounts && listData.accounts.length > 0) {
        accountId = listData.accounts[0].id || listData.accounts[0].identifier || listData.accounts[0]._id;
      } else if (listData.account) {
        accountId = listData.account.id || listData.account.identifier || listData.account._id;
      }

      let balanceInCents = 0;
      let blockedBalanceInCents = 0;

      // 2. Se encontrou o ID, faz a requisição ESPECÍFICA para a conta (igual ao seu código)
      if (accountId) {
        const detailResponse = await fetch(`https://api.woovi.com/api/v1/account/${accountId}`, {
          method: 'GET',
          headers: { 'Authorization': appID }
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          rawData = detailData; // Usamos este retorno como base oficial
          
          const accDetail = detailData.account || detailData;
          if (typeof accDetail.balance === 'number') balanceInCents = accDetail.balance;
          if (typeof accDetail.blockedBalance === 'number') blockedBalanceInCents = accDetail.blockedBalance;
          else if (typeof accDetail.lockedBalance === 'number') blockedBalanceInCents = accDetail.lockedBalance;
        }
      } else {
        // Fallback caso não venha ID na listagem
        const accFallback = listData.account || (listData.accounts && listData.accounts[0]) || listData;
        if (typeof accFallback.balance === 'number') balanceInCents = accFallback.balance;
        if (typeof accFallback.blockedBalance === 'number') blockedBalanceInCents = accFallback.blockedBalance;
        else if (typeof accFallback.lockedBalance === 'number') blockedBalanceInCents = accFallback.lockedBalance;
      }

      const totalInCents = balanceInCents + blockedBalanceInCents;

      return new Response(JSON.stringify({ 
        balance: { 
          available: balanceInCents,
          blocked: blockedBalanceInCents,
          total: totalInCents 
        }, 
        raw: rawData 
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