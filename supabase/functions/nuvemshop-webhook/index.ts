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

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('user_id, access_token')
      .eq('store_id', storeId)
      .eq('provider', 'nuvemshop')
      .single()

    if (!integration) {
      return new Response(JSON.stringify({ error: "Integração não encontrada" }), { status: 200, headers: corsHeaders });
    }

    if (event === 'order/created' || event === 'order/paid') {
      const orderId = payload.id;
      
      const orderRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`, {
        headers: { 
          'Authentication': `bearer ${integration.access_token}`, 
          'User-Agent': 'Swipy ERP (suporte@swipy.com)' 
        }
      })
      
      if (!orderRes.ok) throw new Error(`Erro ao buscar pedido: ${orderRes.status}`);

      const order = await orderRes.json();
      const customerData = order.customer || {};
      const cleanTaxId = customerData.identification?.replace(/\D/g, '');
      const customerEmail = customerData.email || order.contact_email;
      
      let customerId;

      if (cleanTaxId) {
        const { data: existingCustByTax } = await supabaseAdmin.from('customers')
          .select('id')
          .eq('user_id', integration.user_id)
          .eq('tax_id', cleanTaxId)
          .maybeSingle();
        
        if (existingCustByTax) customerId = existingCustByTax.id;
      }

      if (!customerId && customerEmail) {
        const { data: existingCustByEmail } = await supabaseAdmin.from('customers')
          .select('id')
          .eq('user_id', integration.user_id)
          .eq('email', customerEmail)
          .maybeSingle();

        if (existingCustByEmail) customerId = existingCustByEmail.id;
      }

      if (!customerId) {
        const { data: newCust, error: custError } = await supabaseAdmin.from('customers').insert({
          user_id: integration.user_id,
          name: customerData.name || order.billing_name || 'Cliente Nuvemshop',
          email: customerEmail || 'sem-email@nuvemshop.com',
          phone: customerData.phone || order.billing_phone || '',
          tax_id: cleanTaxId || `NS_${customerData.id || order.id}`,
          status: 'em dia'
        }).select().single();

        if (custError) throw custError;
        customerId = newCust.id;
      }

      const correlationId = `nuvem_${order.id}`;
      const isPaid = order.payment_status === 'paid';
      const chargeStatus = isPaid ? 'pago' : 'pendente';
      const quoteStatus = isPaid ? 'picking' : 'approved';

      const { data: existingCharge } = await supabaseAdmin.from('charges')
        .select('id, quote_id')
        .eq('correlation_id', correlationId)
        .maybeSingle();

      if (existingCharge) {
        await supabaseAdmin.from('charges').update({ status: chargeStatus }).eq('id', existingCharge.id);
        if (existingCharge.quote_id) {
           await supabaseAdmin.from('quotes').update({ status: quoteStatus }).eq('id', existingCharge.quote_id);
        }
        
        // LOG DE ATUALIZAÇÃO PARA AUDITORIA
        await supabaseAdmin.from('notification_logs').insert({
          charge_id: existingCharge.id,
          type: 'integration',
          status: 'success',
          message: `Pedido #${order.number} atualizado para ${chargeStatus} (Nuvemshop)`
        });

      } else {
        const { data: quote, error: quoteErr } = await supabaseAdmin.from('quotes').insert({
          user_id: integration.user_id,
          customer_id: customerId,
          total_amount: parseFloat(order.total),
          status: quoteStatus
        }).select().single();

        if (quoteErr) throw quoteErr;

        if (order.products && Array.isArray(order.products)) {
          for (const item of order.products) {
            let localProductId = null;
            const itemSku = item.sku || `NS_${item.product_id}`;
            const { data: existingProd } = await supabaseAdmin.from('products').select('id').eq('user_id', integration.user_id).eq('sku', itemSku).maybeSingle();
            if (existingProd) localProductId = existingProd.id;
            else {
              const { data: newProd } = await supabaseAdmin.from('products').insert({
                user_id: integration.user_id,
                name: item.name,
                sku: itemSku,
                price: parseFloat(item.price),
                stock_quantity: 0,
                category: 'E-commerce'
              }).select().single();
              if (newProd) localProductId = newProd.id;
            }
            if (localProductId) {
              await supabaseAdmin.from('quote_items').insert({
                quote_id: quote.id,
                product_id: localProductId,
                quantity: parseInt(item.quantity),
                unit_price: parseFloat(item.price),
                total_price: parseFloat(item.price) * parseInt(item.quantity)
              });
            }
          }
        }

        const { data: newCharge, error: chargeError } = await supabaseAdmin.from('charges').insert({
          user_id: integration.user_id,
          customer_id: customerId,
          quote_id: quote.id,
          amount: parseFloat(order.total),
          description: `Pedido E-commerce #${order.number}`,
          status: chargeStatus,
          method: 'manual', 
          due_date: new Date().toISOString().split('T')[0],
          correlation_id: correlationId
        }).select().single();

        if (chargeError) throw chargeError;

        // LOG DE CRIAÇÃO PARA AUDITORIA (MASTER FEED)
        await supabaseAdmin.from('notification_logs').insert({
          charge_id: newCharge.id,
          type: 'integration',
          status: 'success',
          message: `Nova venda importada: Pedido #${order.number} (Nuvemshop)`
        });

        await supabaseAdmin.from('notifications').insert({
          user_id: integration.user_id,
          title: 'Nova Venda E-commerce',
          message: `Pedido #${order.number} importado com sucesso.`,
          type: 'success'
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
  } catch (error: any) {
    console.error("[nuvemshop-webhook] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders })
  }
})