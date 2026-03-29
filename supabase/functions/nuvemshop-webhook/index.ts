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

    const payload = await req.json()
    const storeId = payload.store_id?.toString()
    const event = req.headers.get('x-linkedstore-event') || payload.event;

    console.log(`[nuvemshop-webhook] Recebido evento: ${event} para a loja: ${storeId}`);

    if (!storeId) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), { status: 400, headers: corsHeaders });
    }

    // 1. Busca a integração ativa do lojista
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('user_id, access_token')
      .eq('store_id', storeId)
      .eq('provider', 'nuvemshop')
      .single()

    if (!integration) {
      console.warn(`[nuvemshop-webhook] Nenhuma integração encontrada para a loja ${storeId}`);
      return new Response(JSON.stringify({ error: "Integração não encontrada" }), { status: 200, headers: corsHeaders });
    }

    if (event === 'order/created' || event === 'order/paid') {
      const orderId = payload.id;
      
      // 2. Busca detalhes completos do pedido na API da Nuvemshop
      const orderRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`, {
        headers: { 
          'Authentication': `bearer ${integration.access_token}`, 
          'User-Agent': 'Swipy ERP (suporte@swipy.com)' 
        }
      })
      
      if (!orderRes.ok) throw new Error(`Erro ao buscar pedido: ${orderRes.status}`);

      const order = await orderRes.json();

      // 3. Processamento de Cliente Seguro (Sem Upsert para evitar quebra de constraint)
      const customerData = order.customer || {};
      const cleanTaxId = customerData.identification?.replace(/\D/g, '') || `NS_${customerData.id || order.id}`;
      
      let customerId;
      const { data: existingCust } = await supabaseAdmin.from('customers')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('tax_id', cleanTaxId)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust, error: custError } = await supabaseAdmin.from('customers').insert({
          user_id: integration.user_id,
          name: customerData.name || order.billing_name || 'Cliente Nuvemshop',
          email: customerData.email || order.contact_email || 'sem-email@nuvemshop.com',
          phone: customerData.phone || order.billing_phone || '',
          tax_id: cleanTaxId,
          status: 'em dia'
        }).select().single();

        if (custError) throw custError;
        customerId = newCust.id;
      }

      // 4. Processamento da Cobrança/Venda
      const correlationId = `nuvem_${order.id}`;
      const chargeStatus = order.payment_status === 'paid' ? 'pago' : 'pendente';

      const { data: existingCharge } = await supabaseAdmin.from('charges')
        .select('id')
        .eq('correlation_id', correlationId)
        .maybeSingle();

      if (existingCharge) {
        // Se a cobrança já existe (ex: criada no order/created e agora veio order/paid)
        await supabaseAdmin.from('charges').update({ status: chargeStatus }).eq('id', existingCharge.id);
      } else {
        // Se não existe, cria a cobrança
        const { data: charge, error: chargeError } = await supabaseAdmin.from('charges').insert({
          user_id: integration.user_id,
          customer_id: customerId,
          amount: parseFloat(order.total),
          description: `Pedido Nuvemshop #${order.number}`,
          status: chargeStatus,
          method: 'manual', // Entra como manual para não gerar QR Code da Woovi
          due_date: new Date().toISOString().split('T')[0],
          correlation_id: correlationId
        }).select().single();

        if (chargeError) throw chargeError;

        // Avisar o lojista no sistema
        await supabaseAdmin.from('notifications').insert({
          user_id: integration.user_id,
          title: 'Novo Pedido Nuvemshop',
          message: `Venda #${order.number} recebida no valor de R$ ${order.total}. Status: ${chargeStatus.toUpperCase()}.`,
          type: 'success'
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
  } catch (error: any) {
    console.error("[nuvemshop-webhook] Erro Crítico:", error.message);
    // Retornar 200 para a Nuvemshop não ficar tentando reenviar o webhook infinitamente em caso de falha de código
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders })
  }
})