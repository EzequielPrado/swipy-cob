import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log de entrada para auditoria
    const payload = await req.json()
    const storeId = payload.store_id?.toString()
    
    // Captura o evento de múltiplas fontes (Header ou Body)
    const event = req.headers.get('x-linkedstore-event') || payload.event;

    console.log(`[nuvemshop-webhook] Recebido evento: ${event} para a loja: ${storeId}`, { payload });

    if (!storeId) {
      console.error("[nuvemshop-webhook] Payload inválido: store_id ausente.");
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
    }

    // 1. Localizar integração
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('user_id, access_token')
      .eq('store_id', storeId)
      .eq('provider', 'nuvemshop')
      .single()

    if (!integration) {
      console.warn(`[nuvemshop-webhook] Nenhuma integração encontrada para a loja ${storeId}`);
      return new Response(JSON.stringify({ error: "Integration not found" }), { status: 200, headers: corsHeaders });
    }

    // 2. Processar criação de pedido
    if (event === 'order/created') {
      const orderId = payload.id
      console.log(`[nuvemshop-webhook] Buscando detalhes do pedido ${orderId} na Nuvemshop...`);
      
      const orderRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`, {
        headers: { 
          'Authorization': `bearer ${integration.access_token}`, 
          'User-Agent': 'Swipy ERP (suporte@swipy.com)' 
        }
      })
      
      if (!orderRes.ok) {
        throw new Error(`Erro ao buscar pedido na Nuvemshop: ${orderRes.status}`);
      }

      const order = await orderRes.json()

      // 3. Upsert Cliente (Prevenir duplicidade e atualizar dados)
      const cleanTaxId = order.customer.identification?.replace(/\D/g, '') || `NS_${order.customer.id}`;
      
      const { data: customer, error: custError } = await supabaseAdmin.from('customers').upsert({
        user_id: integration.user_id,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone || order.customer.mobile,
        tax_id: cleanTaxId,
        status: 'em dia'
      }, { onConflict: 'user_id,tax_id' }).select().single()

      if (custError) throw custError;

      // 4. Criar Cobrança/Pedido no ERP
      const { data: charge, error: chargeError } = await supabaseAdmin.from('charges').insert({
        user_id: integration.user_id,
        customer_id: customer.id,
        amount: parseFloat(order.total),
        description: `Pedido Nuvemshop #${order.number}`,
        status: order.payment_status === 'paid' ? 'pago' : 'pendente',
        method: 'manual',
        due_date: new Date().toISOString().split('T')[0],
        correlation_id: `nuvem_${order.id}`
      }).select().single()

      if (chargeError) throw chargeError;

      // 5. Notificar
      await supabaseAdmin.from('notifications').insert({
        user_id: integration.user_id,
        title: 'Novo Pedido Nuvemshop',
        message: `Venda #${order.number} de ${customer.name} no valor de R$ ${order.total}.`,
        type: 'success'
      })

      console.log(`[nuvemshop-webhook] Pedido #${order.number} processado com sucesso.`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    console.error("[nuvemshop-webhook] Erro Crítico:", error.message);
    // Retornamos 200 mesmo no erro para evitar que a Nuvemshop desative o webhook por falhas repetidas
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders })
  }
})