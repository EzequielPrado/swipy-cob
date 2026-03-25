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
      // Buscar o saldo REAL direto do Banco Central / Woovi
      const accRes = await fetch('https://api.woovi.com/api/v1/account', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      
      const accData = await accRes.json();

      if (!accRes.ok) {
         return new Response(JSON.stringify({ error: true, message: `Acesso negado ou erro na Woovi: ${JSON.stringify(accData)}` }), { 
           status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
         });
      }

      let available = 0;
      let blocked = 0;
      let found = false;

      // Localiza o saldo no objeto de resposta da conta
      if (accData.account && typeof accData.account.balance === 'number') {
         available = accData.account.balance;
         blocked = accData.account.blockedBalance || accData.account.lockedBalance || 0;
         found = true;
      } else if (accData.accounts && accData.accounts.length > 0 && typeof accData.accounts[0].balance === 'number') {
         available = accData.accounts[0].balance;
         blocked = accData.accounts[0].blockedBalance || accData.accounts[0].lockedBalance || 0;
         found = true;
      }

      if (found) {
         return new Response(JSON.stringify({ 
           balance: { 
             available: available, 
             blocked: blocked, 
             total: available + blocked 
           } 
         }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
         // Caso a Woovi mude a estrutura da resposta, enviamos o erro para a tela para mapearmos
         return new Response(JSON.stringify({ 
           error: true, 
           message: `Estrutura de conta diferente: ${JSON.stringify(accData).substring(0, 100)}...` 
         }), { 
           status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
         });
      }
    }

    if (action === 'transactions') {
      const chargeRes = await fetch('https://api.woovi.com/api/v1/charge', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const chargeData = chargeRes.ok ? await chargeRes.json() : { charges: [] };
      
      const cashoutRes = await fetch('https://api.woovi.com/api/v1/cashout', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const cashoutData = cashoutRes.ok ? await cashoutRes.json() : { cashouts: [] };

      const paidCharges = (chargeData.charges || [])
        .filter((c: any) => c.status === 'COMPLETED')
        .map((c: any) => ({
          ...c,
          type: 'IN',
          value: c.value,
          time: c.createdAt || c.updatedAt
        }));

      const cashouts = (cashoutData.cashouts || []).map((c: any) => ({
        ...c,
        type: 'OUT',
        value: -(c.value),
        time: c.createdAt
      }));

      const allTransactions = [...paidCharges, ...cashouts].sort((a, b) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      return new Response(JSON.stringify({ transactions: allTransactions }), {
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