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

    const { code } = await req.json()
    if (!code) throw new Error("Código de autorização ausente")

    const CLIENT_ID = "28762";
    const CLIENT_SECRET = "d7c43cd574f2a328361e7322a7ad5dabece3df60b47a3b3f";

    // 1. Trocar Código por Token
    console.log(`[nuvemshop-auth] Trocando código pelo token...`);
    const tokenRes = await fetch('https://www.nuvemshop.com.br/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code
      })
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error("[nuvemshop-auth] Erro no Token Exchange:", tokenData);
      throw new Error(tokenData.error_description || "Erro ao obter token na Nuvemshop");
    }

    const accessToken = tokenData.access_token;
    const storeId = tokenData.user_id.toString();
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/nuvemshop-webhook`;

    // 2. VALIDAR TOKEN (Teste simples na API da Nuvemshop)
    // Nota: Usamos 'Authentication' com 'bearer' minúsculo, conforme docs da Nuvemshop
    const checkRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/shop`, {
      headers: { 
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'Swipy ERP (suporte@swipy.com)'
      }
    });

    if (!checkRes.ok) {
      const checkData = await checkRes.text();
      console.error("[nuvemshop-auth] Token inválido ou sem permissão:", checkData);
      throw new Error("Token gerado pela Nuvemshop foi rejeitado pela API.");
    }

    console.log(`[nuvemshop-auth] Token validado para loja ${storeId}. Registrando Webhook...`);

    // 3. Registrar o Webhook
    // IMPORTANTE: Nuvemshop exige o header 'Authentication' (não 'Authorization')
    const regRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
      method: 'POST',
      headers: { 
        'Authentication': `bearer ${accessToken}`, 
        'Content-Type': 'application/json',
        'User-Agent': 'Swipy ERP (suporte@swipy.com)'
      },
      body: JSON.stringify({ event: "order/created", url: webhookUrl })
    });

    const regData = await regRes.json();
    
    if (!regRes.ok) {
      const errorMsg = JSON.stringify(regData);
      // Se o erro for que o webhook já existe, não paramos o processo
      if (errorMsg.includes("already exists") || errorMsg.includes("webhook_already_active")) {
        console.log(`[nuvemshop-auth] Webhook já estava configurado.`);
      } else {
        console.error("[nuvemshop-auth] Erro no registro do webhook:", regData);
        throw new Error(`Nuvemshop negou o registro do Webhook: ${regData.error || regData.message || 'Unauthorized'}`);
      }
    }

    // 4. Salvar Integração
    await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'nuvemshop');

    const { error: dbError } = await supabaseAdmin
      .from('integrations')
      .insert({
        user_id: user.id,
        provider: 'nuvemshop',
        access_token: accessToken,
        store_id: storeId,
        status: 'active',
        settings: {
          connected_at: new Date().toISOString(),
          webhook_id: regData.id || 'existing'
        }
      })

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true, storeId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[nuvemshop-auth] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})