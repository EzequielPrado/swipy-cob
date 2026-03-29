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
    const event = req.headers.get('x-linkedstore-event') // 'order/created'

    console.log(`[nuvemshop-webhook] Evento: ${event} | Loja: ${storeId}`);

    // 1. Localizar qual usuário do ERP é dono desta loja
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('user_id, access_token')
      .eq('store_id', storeId)
      .eq('provider', 'nuvemshop')
      .single()

    if (!integration) throw new Error("Integração não localizada para esta loja.")

    // 2. Se for criação de pedido, buscar os detalhes completos na API da Nuvemshop
    if (event === 'order/created') {
      const orderId = payload.id
      
      const orderRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`, {
        headers: { 'Authorization': `bearer ${integration.access_token}`, 'User-Agent': 'Swipy ERP (suporte@swipy.com)' }
      })
      const order = await orderRes.json()

      // 3. Cadastrar/Atualizar Cliente
      const { data: customer } = await supabaseAdmin.from('customers').upsert({
        user_id: integration.user_id,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone || order.customer.mobile,
        tax_id: order.customer.identification?.replace(/\D/g, ''),
        status: 'em dia'
      }, { onConflict: 'user_id,tax_id' }).select().single()

      // 4. Criar Cobrança no ERP
      const { data: charge } = await supabaseAdmin.from('charges').insert({
        user_id: integration.user_id,
        customer_id: customer.id,
        amount: parseFloat(order.total),
        description: `Pedido Nuvemshop #${order.number}`,
        status: order.payment_status === 'paid' ? 'pago' : 'pendente',
        method: order.payment_details?.method === 'pix' ? 'pix' : 'manual',
        due_date: new Date().toISOString().split('T')[0],
        correlation_id: `nuvem_${order.id}`
      }).select().single()

      // 5. Criar Itens do Pedido (para controle de estoque)
      const items = order.products.map((p: any) => ({
        quote_id: charge.id, // Reutilizamos a tabela de orçamentos/pedidos se necessário
        product_id: null, // Aqui faríamos o match pelo SKU no futuro
        quantity: p.quantity,
        unit_price: parseFloat(p.price),
        total_price: parseFloat(p.price) * p.quantity
      }))
      
      // 6. Notificar o Lojista
      await supabaseAdmin.from('notifications').insert({
        user_id: integration.user_id,
        title: 'Novo Pedido Nuvemshop',
        message: `O cliente ${customer.name} acabou de comprar R$ ${order.total}.`,
        type: 'success'
      })

      console.log(`[nuvemshop-webhook] Pedido #${order.number} processado com sucesso.`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error: any) {
    console.error("[nuvemshop-webhook] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})