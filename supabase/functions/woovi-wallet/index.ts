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
      let total = 0;
      let found = false;

      // Percorre todas as contas se for um array
      if (accData.accounts && Array.isArray(accData.accounts)) {
         accData.accounts.forEach((acc: any) => {
            if (acc.balance && typeof acc.balance === 'object') {
               total += (acc.balance.total || 0);
               blocked += (acc.balance.blocked || acc.balance.locked || 0);
               let accAvailable = acc.balance.available !== undefined ? acc.balance.available : ((acc.balance.total || 0) - (acc.balance.blocked || acc.balance.locked || 0));
               available += accAvailable;
               found = true;
            } else if (typeof acc.balance === 'number') {
               let accAvailable = acc.balance;
               let accBlocked = acc.blockedBalance || acc.lockedBalance || 0;
               available += accAvailable;
               blocked += accBlocked;
               total += (accAvailable + accBlocked);
               found = true;
            }
         });
      } else if (accData.account) {
         const acc = accData.account;
         if (acc.balance && typeof acc.balance === 'object') {
             total = acc.balance.total || 0;
             blocked = acc.balance.blocked || acc.balance.locked || 0;
             available = acc.balance.available !== undefined ? acc.balance.available : (total - blocked);
             found = true;
         } else if (typeof acc.balance === 'number') {
             available = acc.balance;
             blocked = acc.blockedBalance || acc.lockedBalance || 0;
             total = available + blocked;
             found = true;
         }
      }

      if (found) {
         return new Response(JSON.stringify({ 
           balance: { 
             available: available, 
             blocked: blocked, 
             total: total 
           } 
         }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
         return new Response(JSON.stringify({ 
           error: true, 
           message: `Estrutura de conta não mapeada: ${JSON.stringify(accData).substring(0, 100)}...` 
         }), { 
           status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
         });
      }
    }

    if (action === 'transactions') {
      const skip = parseInt(url.searchParams.get('skip') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      // 1. Buscar transações PIX reais (entradas e saídas)
      const txRes = await fetch(`https://api.woovi.com/api/v1/transaction?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const txData = txRes.ok ? await txRes.json() : { transactions: [] };

      // 2. Buscar cobranças pagas (backup/complemento)
      const chargeRes = await fetch(`https://api.woovi.com/api/v1/charge?status=COMPLETED&skip=0&limit=${limit}`, {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const chargeData = chargeRes.ok ? await chargeRes.json() : { charges: [] };
      
      // 3. Buscar saques (cashouts)
      const cashoutRes = await fetch('https://api.woovi.com/api/v1/cashout', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const cashoutData = cashoutRes.ok ? await cashoutRes.json() : { cashouts: [] };

      // Mapa de transactionIDs já processados para evitar duplicatas
      const processedIds = new Set<string>();

      // Normalizar transações PIX reais
      const pixTransactions = (txData.transactions || []).map((tx: any) => {
        const id = tx.transactionID || tx.endToEndId || tx.correlationID || crypto.randomUUID();
        processedIds.add(id);
        
        const isOut = tx.type === 'OUT' || tx.type === 'WITHDRAWAL' || (tx.value < 0);
        const rawValue = Math.abs(tx.value || 0);
        
        return {
          id,
          type: isOut ? 'OUT' : 'IN',
          value: rawValue,
          valueBRL: rawValue / 100,
          description: tx.comment || tx.infoPagador || (isOut ? 'Transferência PIX enviada' : 'PIX recebido'),
          customer: tx.payer?.name || tx.customer?.name || tx.destination?.name || '',
          customerTaxId: tx.payer?.taxID?.taxID || tx.customer?.taxID?.taxID || '',
          date: tx.time || tx.createdAt || tx.updatedAt || new Date().toISOString(),
          endToEndId: tx.endToEndId || tx.raw?.endToEndId || '',
          correlationID: tx.correlationID || '',
          source: 'pix'
        };
      });

      // Normalizar cobranças pagas (que talvez não retornem nas transactions)
      const chargeTransactions = (chargeData.charges || [])
        .filter((c: any) => c.status === 'COMPLETED')
        .filter((c: any) => {
          const id = c.transactionID || c.correlationID;
          if (processedIds.has(id)) return false;
          processedIds.add(id);
          return true;
        })
        .map((c: any) => ({
          id: c.transactionID || c.correlationID || crypto.randomUUID(),
          type: 'IN',
          value: c.value || 0,
          valueBRL: (c.value || 0) / 100,
          description: c.comment || c.additionalInfo?.[0]?.value || 'Cobrança PIX recebida',
          customer: c.customer?.name || c.payer?.name || '',
          customerTaxId: c.customer?.taxID?.taxID || c.payer?.taxID?.taxID || '',
          date: c.paidAt || c.updatedAt || c.createdAt || new Date().toISOString(),
          endToEndId: c.transactionID || '',
          correlationID: c.correlationID || '',
          source: 'charge'
        }));

      // Normalizar saques
      const cashoutTransactions = (cashoutData.cashouts || []).map((c: any) => ({
        id: c.correlationID || c.transactionID || crypto.randomUUID(),
        type: 'OUT',
        value: c.value || 0,
        valueBRL: (c.value || 0) / 100,
        description: c.comment || 'Saque / Transferência PIX',
        customer: c.destination?.name || c.destinationAlias?.name || '',
        customerTaxId: c.destination?.taxID?.taxID || '',
        date: c.createdAt || new Date().toISOString(),
        endToEndId: c.endToEndId || '',
        correlationID: c.correlationID || '',
        source: 'cashout'
      }));

      // Combinar e ordenar por data (mais recente primeiro)
      const allTransactions = [...pixTransactions, ...chargeTransactions, ...cashoutTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calcular totais
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
        pageInfo: txData.pageInfo || { skip, limit, hasNextPage: false }
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