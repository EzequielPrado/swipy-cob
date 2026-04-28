import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

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

    const { data: creds } = await supabaseClient
      .from('merchant_credentials')
      .select('woovi_api_key')
      .eq('id', user.id)
      .single()

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key, transaction_pin')
      .eq('id', user.id)
      .single()

    const appID = (creds?.woovi_api_key || profile?.woovi_api_key)?.trim();

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
        
        const rawType = String(tx.type || '').toUpperCase();
        const isOut = (
          ['OUT', 'WITHDRAWAL', 'WITHDRAW', 'FEE', 'CASHOUT'].includes(rawType) ||
          (tx.value < 0)
        );
        const rawValue = Math.abs(tx.value || 0);
        
        const customerName = tx.payer?.name || tx.customer?.name || tx.destination?.name || '';

        return {
          id,
          type: isOut ? 'OUT' : 'IN',
          value: rawValue,
          valueBRL: rawValue / 100,
          description: tx.comment || tx.infoPagador || (isOut ? `Transferência PIX enviada [${rawType}]` : `PIX recebido [${rawType || 'SEM_TIPO'}]`),
          customer: customerName,
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
      const body = await req.json();
      const { amount, pixKey: rawPixKey, pixKeyType, pin } = body;

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

      // Limpar a chave Pix (remover caracteres não numéricos se for CPF, CNPJ ou Telefone)
      let pixKey = rawPixKey;
      if (['CPF', 'CNPJ', 'PHONE'].includes(pixKeyType)) {
        pixKey = rawPixKey.replace(/\D/g, '');
        // Se for telefone e não tiver o prefixo do país, assume Brasil (+55)
        if (pixKeyType === 'PHONE' && !rawPixKey.startsWith('+')) {
          pixKey = `+55${pixKey}`;
        }
      }

      // Gerar um correlationID único para esta operação
      const correlationID = `withdraw-${crypto.randomUUID()}`;
      
      const payload = {
        type: 'PIX_KEY',
        value: Math.round(amount * 100), // Valor em centavos
        destinationAlias: pixKey,
        destinationAliasType: pixKeyType,
        correlationID: correlationID,
        comment: 'Saque Swipy Pix',
        metadata: {
          source: 'swipy-platform',
          withdraw_id: correlationID
        }
      };

      console.log(`[woovi-wallet] Enviando solicitação para Woovi com AppID: ${appID.substring(0, 5)}...`);

      // Etapa 1: Solicitar o pagamento
      const paymentRes = await fetch('https://api.woovi.com/api/v1/payment', {
        method: 'POST',
        headers: { 
          'Authorization': appID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const paymentData = await paymentRes.json().catch(() => ({}));

      if (!paymentRes.ok) {
        console.error(`[woovi-wallet] Erro na solicitação de pagamento (Status ${paymentRes.status}):`, JSON.stringify(paymentData));
        
        // Extrair mensagem de erro amigável (Woovi às vezes envia {error: true, message: "..."})
        let errMsg = 'Erro desconhecido';
        if (typeof paymentData.message === 'string') errMsg = paymentData.message;
        else if (typeof paymentData.error === 'string') errMsg = paymentData.error;
        else if (paymentData.errors?.[0]?.message) errMsg = paymentData.errors[0].message;
        else if (typeof paymentData === 'string') errMsg = paymentData;

        return new Response(JSON.stringify({ 
          error: "API_ERROR", 
          message: `Erro ao solicitar pagamento: ${errMsg}`,
          details: paymentData
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log(`[woovi-wallet] Pagamento solicitado com sucesso. Aprovando agora...`);

      // Etapa 2: Aprovar o pagamento imediatamente
      const approveRes = await fetch('https://api.woovi.com/api/v1/payment/approve', {
        method: 'POST',
        headers: { 
          'Authorization': appID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          correlationID: correlationID
        })
      });
      
      const approveData = await approveRes.json().catch(() => ({}));

      if (!approveRes.ok) {
        console.error(`[woovi-wallet] Erro na aprovação do pagamento (Status ${approveRes.status}):`, JSON.stringify(approveData));
        
        let errMsg = 'Erro desconhecido na aprovação';
        if (typeof approveData.message === 'string') errMsg = approveData.message;
        else if (typeof approveData.error === 'string') errMsg = approveData.error;

        return new Response(JSON.stringify({ 
          error: "API_ERROR", 
          message: `Erro ao aprovar pagamento: ${errMsg}`,
          details: approveData
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log(`[woovi-wallet] Saque concluído com sucesso:`, approveData);

      return new Response(JSON.stringify({ 
        success: true, 
        payment: paymentData,
        approval: approveData 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ============ ACCOUNT INFO ============
    if (action === 'account') {
      const accRes = await fetch('https://api.woovi.com/api/v1/account', {
        method: 'GET',
        headers: { 'Authorization': appID }
      });
      const accData = await accRes.json();

      if (!accRes.ok) {
        throw new Error(`Erro ao buscar conta: ${JSON.stringify(accData)}`);
      }

      // Normalizar a resposta
      const account = accData.account || accData.accounts?.[0] || null;
      
      return new Response(JSON.stringify({ 
        account: account ? {
          accountId: account.accountId || account.id || '',
          name: account.name || account.owner?.name || '',
          taxId: account.taxID?.taxID || account.owner?.taxID?.taxID || '',
          type: account.type || 'default',
          pixKeys: (account.pixKeys || []).map((k: any) => ({
            key: k.value || k.key || '',
            type: k.type || k.kind || 'UNKNOWN',
            createdAt: k.createdAt || ''
          })),
          balance: {
            available: account.balance?.available ?? account.balance ?? 0,
            blocked: account.balance?.blocked ?? account.balance?.locked ?? 0,
            total: account.balance?.total ?? 0
          },
          owner: {
            name: account.owner?.name || account.name || '',
            taxId: account.owner?.taxID?.taxID || account.taxID?.taxID || '',
            email: account.owner?.email || ''
          }
        } : null,
        raw: accData 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ============ LIST PIX KEYS ============
    if (action === 'pixkeys') {
      let response;
      const getUrls = [
        'https://api.openpix.com.br/api/v1/pix-keys',
        'https://api.woovi.com/api/v1/pix-keys'
      ];

      for (const apiUrl of getUrls) {
        try {
          response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': appID }
          });
          if (response.status !== 404) break;
        } catch { /* try next */ }
      }

      const rawText = await response?.text() || '';
      let data: any = {};
      try { data = JSON.parse(rawText); } catch { /* ignore */ }

      if (!response?.ok) {
        throw new Error(`Erro ao listar chaves Pix: ${data?.error || data?.message || rawText}`);
      }

      const keyList = data.pixKeys || data.keys || data.items || data.data || (Array.isArray(data) ? data : []);

      const formattedKeys = keyList.map((k: any) => ({
        key: k.pixKey || k.key || k.value || k.address || '',
        type: k.type || k.kind || 'UNKNOWN',
        createdAt: k.createdAt || new Date().toISOString()
      })).filter((k: any) => k.key);

      return new Response(JSON.stringify({ pixKeys: formattedKeys }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ============ CREATE PIX KEY ============
    if (action === 'create-pixkey') {
      const body = await req.json();
      const { key, type } = body; // type: CPF, CNPJ, EMAIL, PHONE, EVP

      if (!type) {
        throw new Error("O tipo da chave Pix é obrigatório (CPF, CNPJ, EMAIL, PHONE ou EVP).");
      }

      // Para EVP, não precisa de key
      if (type !== 'EVP' && !key) {
        throw new Error("O valor da chave Pix é obrigatório para este tipo.");
      }

      const pixKeyBody: any = { type };
      if (type !== 'EVP') {
        pixKeyBody.key = key;
      }

      // Tentar múltiplas URLs (woovi e openpix são o mesmo serviço)
      let response;
      let lastError = '';
      
      const urls = [
        'https://api.openpix.com.br/api/v1/pix-keys',
        'https://api.woovi.com/api/v1/pix-keys'
      ];

      for (const apiUrl of urls) {
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': appID,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(pixKeyBody)
          });
          
          // Se não for 404, usamos essa resposta
          if (response.status !== 404) break;
          lastError = `${apiUrl} retornou 404`;
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (!response || response.status === 404) {
        throw new Error(`Endpoint de chave Pix não encontrado. ${lastError}`);
      }

      // Parse seguro da resposta (pode não ser JSON)
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta inesperada da API (${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        let errMsg = '';
        if (typeof data === 'string') errMsg = data;
        else if (data?.error && typeof data.error === 'string') errMsg = data.error;
        else if (data?.message && typeof data.message === 'string') errMsg = data.message;
        else if (data?.error?.message) errMsg = data.error.message;
        else errMsg = JSON.stringify(data);
        
        throw new Error(`Erro API: ${errMsg}`);
      }

      return new Response(JSON.stringify({ success: true, pixKey: data }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ============ DELETE PIX KEY ============
    if (action === 'delete-pixkey') {
      const body = await req.json();
      const { key } = body;

      if (!key) {
        throw new Error("A chave Pix a ser removida é obrigatória.");
      }

      let response;
      const deleteUrls = [
        `https://api.openpix.com.br/api/v1/pix-keys/${encodeURIComponent(key)}`,
        `https://api.woovi.com/api/v1/pix-keys/${encodeURIComponent(key)}`
      ];

      for (const apiUrl of deleteUrls) {
        try {
          response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: { 'Authorization': appID }
          });
          if (response.status !== 404) break;
        } catch { /* try next */ }
      }

      if (!response || response.status === 404) {
        throw new Error("Endpoint de exclusão de chave Pix não encontrado.");
      }

      if (!response.ok) {
        const text = await response.text();
        let errMsg = text;
        try { const d = JSON.parse(text); errMsg = d?.error || d?.message || text; } catch { /* use raw */ }
        throw new Error(`Erro ao remover chave Pix: ${errMsg}`);
      }

      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    throw new Error("Ação inválida")

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "API_ERROR", message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})