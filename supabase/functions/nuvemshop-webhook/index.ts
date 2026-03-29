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

      // 3. Processamento de Cliente Seguro
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

      // Definir status lógicos
      const correlationId = `nuvem_${order.id}`;
      const isPaid = order.payment_status === 'paid';
      const chargeStatus = isPaid ? 'pago' : 'pendente';
      // Se pago, já move para a Logística (picking). Se não, fica como aprovado.
      const quoteStatus = isPaid ? 'picking' : 'approved';

      // 4. Verifica se a venda já existe no sistema
      const { data: existingCharge } = await supabaseAdmin.from('charges')
        .select('id, quote_id')
        .eq('correlation_id', correlationId)
        .maybeSingle();

      if (existingCharge) {
        // ATUALIZAÇÃO: O pedido já existe, vamos atualizar o status de pagamento e da venda
        await supabaseAdmin.from('charges').update({ status: chargeStatus }).eq('id', existingCharge.id);
        if (existingCharge.quote_id) {
           await supabaseAdmin.from('quotes').update({ status: quoteStatus }).eq('id', existingCharge.quote_id);
        }
      } else {
        // NOVO PEDIDO: Fluxo completo de Inserção ERP
        
        // A. Cria o Pedido de Venda (Quote)
        const { data: quote, error: quoteErr } = await supabaseAdmin.from('quotes').insert({
          user_id: integration.user_id,
          customer_id: customerId,
          total_amount: parseFloat(order.total),
          status: quoteStatus
        }).select().single();

        if (quoteErr) throw quoteErr;

        // B. Processa e vincula os Produtos (Itens da Venda)
        if (order.products && Array.isArray(order.products)) {
          for (const item of order.products) {
            let localProductId = null;
            const itemSku = item.sku || `NS_${item.product_id}`;
            
            // Busca produto pelo SKU na base do ERP
            const { data: existingProd } = await supabaseAdmin.from('products')
              .select('id')
              .eq('user_id', integration.user_id)
              .eq('sku', itemSku)
              .maybeSingle();
            
            if (existingProd) {
              localProductId = existingProd.id;
            } else {
              // Produto não existe no ERP? Cadastra automaticamente!
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

            // Insere o item na Venda
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

        // C. Cria a Cobrança vinculada ao Pedido (Financeiro)
        const { error: chargeError } = await supabaseAdmin.from('charges').insert({
          user_id: integration.user_id,
          customer_id: customerId,
          quote_id: quote.id, // Vínculo com a Gestão de Vendas
          amount: parseFloat(order.total),
          description: `Pedido E-commerce #${order.number}`,
          status: chargeStatus,
          method: 'manual', 
          due_date: new Date().toISOString().split('T')[0],
          correlation_id: correlationId
        });

        if (chargeError) throw chargeError;

        // D. Avisa no Dashboard
        await supabaseAdmin.from('notifications').insert({
          user_id: integration.user_id,
          title: 'Nova Venda E-commerce',
          message: `Pedido #${order.number} importado para a Gestão de Vendas. Valor: R$ ${order.total}.`,
          type: 'success'
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
  } catch (error: any) {
    console.error("[nuvemshop-webhook] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders })
  }
})