import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const PETTA_BASE_URL = 'https://api.petta.me'

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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error("Não autorizado")

    // Buscar credenciais Petta do perfil do usuário
    const { data: creds } = await supabaseClient
      .from('merchant_credentials')
      .select('petta_api_key')
      .eq('id', user.id)
      .single()

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('petta_api_key, transaction_pin')
      .eq('id', user.id)
      .single()

    const apiKey = (creds?.petta_api_key || profile?.petta_api_key)?.trim();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "MISSING_KEY", message: "Token Petta não configurado." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'balance';

    // ==================== SALDO ====================
    if (action === 'balance') {
      const balRes = await fetch(`${PETTA_BASE_URL}/seller-wallet/balance`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey }
      });
      
      const balData = await balRes.json();

      if (!balRes.ok || !balData.status) {
        return new Response(JSON.stringify({ error: true, message: `Erro ao consultar saldo Petta: ${JSON.stringify(balData)}` }), { 
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const wallet = balData.data;
      // Petta retorna valores em centavos
      return new Response(JSON.stringify({ 
        balance: { 
          available: wallet.balance || 0,
          blocked: wallet.blockedBalance || 0, 
          total: (wallet.balance || 0) + (wallet.blockedBalance || 0)
        } 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ==================== TRANSAÇÕES ====================
    if (action === 'transactions') {
      const skip = parseInt(url.searchParams.get('skip') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      // 1. Buscar transações (cobranças/pagamentos)
      const txRes = await fetch(`${PETTA_BASE_URL}/transactions?skip=${skip}&take=${limit}`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey }
      });
      const txData = txRes.ok ? await txRes.json() : { status: false, data: [] };

      // 2. Buscar saques
      const wdRes = await fetch(`${PETTA_BASE_URL}/withdrawals?skip=0&take=${limit}`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey }
      });
      const wdData = wdRes.ok ? await wdRes.json() : { status: false, data: [] };

      const processedIds = new Set<string>();

      // Normalizar transações Petta
      const txList = Array.isArray(txData.data) ? txData.data : (txData.data ? [txData.data] : []);
      const transactions = txList
        .filter((tx: any) => tx.status === 'PAID' || tx.status === 'COMPLETED' || tx.status === 'PENDING')
        .map((tx: any) => {
          processedIds.add(tx.id);
          const isPaid = tx.status === 'PAID' || tx.status === 'COMPLETED';
          return {
            id: tx.id,
            type: 'IN' as const,
            value: tx.amount || 0,
            valueBRL: (tx.amount || 0) / 100,
            description: tx.description || tx.items?.[0]?.title || `Cobrança ${tx.method || 'PIX'}`,
            customer: tx.customer?.name || '',
            customerTaxId: tx.customer?.document || '',
            date: tx.paidAt || tx.createdAt || new Date().toISOString(),
            endToEndId: tx.id,
            correlationID: tx.id,
            source: 'petta_charge',
            status: tx.status
          };
        });

      // Normalizar saques
      const wdList = Array.isArray(wdData.data) ? wdData.data : (wdData.data ? [wdData.data] : []);
      const withdrawals = wdList.map((wd: any) => ({
        id: wd.id,
        type: 'OUT' as const,
        value: wd.amount || 0,
        valueBRL: (wd.amount || 0) / 100,
        description: `Saque PIX - ${wd.pixKeyType || 'Chave'}: ${wd.pixKey || ''}`,
        customer: '',
        customerTaxId: '',
        date: wd.processedAt || wd.approvedAt || wd.createdAt || new Date().toISOString(),
        endToEndId: wd.end2end || wd.id,
        correlationID: wd.id,
        source: 'petta_withdrawal',
        status: wd.status
      }));

      // Combinar e ordenar
      const allTransactions = [...transactions, ...withdrawals]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalIn = allTransactions.filter(t => t.type === 'IN').reduce((s, t) => s + t.valueBRL, 0);
      const totalOut = allTransactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.valueBRL, 0);

      return new Response(JSON.stringify({ 
        transactions: allTransactions,
        summary: {
          totalIn,
          totalOut,
          net: totalIn - totalOut,
          count: allTransactions.length
        },
        pageInfo: { skip, limit, hasNextPage: txList.length >= limit }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==================== SAQUE (WITHDRAW) ====================
    if (action === 'withdraw') {
      const { amount, pixKey, pixKeyType, pin } = await req.json()
      
      if (!profile?.transaction_pin) {
        throw new Error("PIN de transação não configurado. Por favor, configure seu PIN no painel.")
      }

      const msgBuffer = new TextEncoder().encode(pin || '');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (profile.transaction_pin !== hashHex) {
        throw new Error("PIN de transação incorreto.")
      }
      
      const response = await fetch(`${PETTA_BASE_URL}/withdrawals`, {
        method: 'POST',
        headers: { 
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          amount: Math.round(amount * 100), // Converter para centavos
          pixKey, 
          pixKeyType: pixKeyType || 'CPF',
          method: 'PIX'
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro no Saque Petta: ${errorText}`)
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
