import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    if (!user) throw new Error("Não autorizado")

    const secretId = Deno.env.get('BELVO_SECRET_ID');
    const secretPassword = Deno.env.get('BELVO_SECRET_PASSWORD');
    
    if (!secretId || !secretPassword) {
      throw new Error("Credenciais do Belvo não configuradas.");
    }
    
    const authStr = btoa(`${secretId}:${secretPassword}`);

    // Buscar integração ativa
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'belvo')
      .single()

    if (!integration || !integration.access_token) {
      throw new Error("Integração Open Finance não encontrada.");
    }

    const linkId = integration.access_token; 

    console.log(`[belvo-sync] Sincronizando dados para o link ${linkId}`);

    // 1. Buscar Contas Bancárias (Accounts) no Belvo
    const accRes = await fetch(`https://sandbox.belvo.com/api/accounts/?link=${linkId}`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authStr}` }
    });
    const accData = await accRes.json();
    if (!accRes.ok) throw new Error("Erro ao buscar contas no banco: " + JSON.stringify(accData));

    const accounts = accData.results || [];
    let bankAccountId = null;
    
    if (accounts.length > 0) {
       const firstAcc = accounts[0];
       const accName = `${firstAcc.institution.name} - ${firstAcc.name} (Open Finance)`;
       
       const { data: existingAcc } = await supabaseAdmin
         .from('bank_accounts')
         .select('id')
         .eq('user_id', user.id)
         .eq('name', accName)
         .maybeSingle();
         
       if (existingAcc) {
         bankAccountId = existingAcc.id;
         // Atualiza o saldo se a conta já existir
         await supabaseAdmin.from('bank_accounts').update({ balance: firstAcc.balance?.current || 0 }).eq('id', bankAccountId);
       } else {
         const { data: newAcc } = await supabaseAdmin
           .from('bank_accounts')
           .insert({
             user_id: user.id,
             name: accName,
             type: 'corrente',
             balance: firstAcc.balance?.current || 0
           })
           .select('id').single();
         bankAccountId = newAcc?.id;
       }
    }

    // 2. Extrair Transações (Transactions)
    const trxRes = await fetch(`https://sandbox.belvo.com/api/transactions/?link=${linkId}`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authStr}` }
    });
    
    const trxData = await trxRes.json();
    if (!trxRes.ok) throw new Error("Erro ao buscar extrato: " + JSON.stringify(trxData));

    const transactions = trxData.results || [];
    let insertedCount = 0;

    for (const t of transactions) {
      // Ignora transações em status pendente no banco (só processa as liquidadas)
      if (t.status === 'PENDING') continue;

      const { data: existingTrx } = await supabaseAdmin
        .from('bank_transactions')
        .select('id')
        .eq('external_id', t.id)
        .maybeSingle();

      if (!existingTrx) {
        await supabaseAdmin.from('bank_transactions').insert({
          user_id: user.id,
          bank_account_id: bankAccountId,
          description: t.description || 'Transação Belvo',
          amount: Math.abs(t.amount),
          date: t.value_date,
          type: t.type === 'INFLOW' ? 'credit' : 'debit',
          status: 'pending', // Cai como pendente de conciliação no ERP Swipy
          external_id: t.id
        });
        insertedCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, accountsSynced: accounts.length, transactionsInserted: insertedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[belvo-sync] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 })
  }
})