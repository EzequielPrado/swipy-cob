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
    
    // Função auxiliar para buscar todas as transações (Entradas e Saídas)
    const fetchAllTransactions = async () => {
      // Entradas (Charges pagas)
      const chargeRes = await fetch('https://api.woovi.com/api/v1/charge', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const chargeData = chargeRes.ok ? await chargeRes.json() : { charges: [] };
      
      // Saídas (Saques / Transferências)
      const cashoutRes = await fetch('https://api.woovi.com/api/v1/cashout', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const cashoutData = cashoutRes.ok ? await cashoutRes.json() : { cashouts: [] };

      return {
        charges: chargeData.charges || [],
        cashouts: cashoutData.cashouts || []
      };
    };

    if (action === 'balance') {
      // Como o endpoint de account costuma falhar, calculamos o saldo a partir das transações
      const { charges, cashouts } = await fetchAllTransactions();
      
      const totalIn = charges
        .filter((c: any) => c.status === 'COMPLETED')
        .reduce((acc: number, c: any) => acc + (c.value || 0), 0);

      const totalOut = cashouts
        .reduce((acc: number, c: any) => acc + (c.value || 0), 0);

      const calculatedBalance = totalIn - totalOut;

      return new Response(JSON.stringify({ 
        balance: { 
          available: calculatedBalance,
          blocked: 0, // Como é calculado, assumimos 0 bloqueado
          total: calculatedBalance 
        } 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'transactions') {
      const { charges, cashouts } = await fetchAllTransactions();
      
      const paidCharges = charges
        .filter((c: any) => c.status === 'COMPLETED')
        .map((c: any) => ({
          ...c,
          type: 'IN',
          value: c.value,
          time: c.createdAt || c.updatedAt
        }));

      const mappedCashouts = cashouts.map((c: any) => ({
        ...c,
        type: 'OUT',
        value: -(c.value),
        time: c.createdAt
      }));

      const allTransactions = [...paidCharges, ...mappedCashouts].sort((a, b) => {
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