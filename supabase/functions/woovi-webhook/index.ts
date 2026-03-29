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
    
    const payload = await req.json()
    const event = payload.event
    const correlationID = payload.charge?.correlationID;
    
    if ((event === 'CHARGE_COMPLETED' || event === 'PAYMENT_CONFIRMED') && correlationID) {
      
      // 1. Atualizar o status da cobrança para PAGO
      const { data: charge } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select()
        .single();

      if (charge && charge.quote_id) {
        // 2. Buscar itens do pedido para saber o destino (Produção ou Separação)
        const { data: items } = await supabaseClient
          .from('quote_items')
          .select('*, products(is_produced)')
          .eq('quote_id', charge.quote_id);

        const hasProduction = items?.some((i: any) => i.products?.is_produced);
        const nextStatus = hasProduction ? 'production' : 'picking';

        // 3. Atualizar status do Orçamento
        await supabaseClient
          .from('quotes')
          .update({ status: nextStatus })
          .eq('id', charge.quote_id);
          
        // 4. Se for produção, criar as ordens industriais
        if (hasProduction && items) {
          const prodEntries = items
            .filter((i: any) => i.products?.is_produced)
            .map((i: any) => ({
              user_id: charge.user_id,
              product_id: i.product_id,
              quote_id: charge.quote_id,
              quantity: i.quantity,
              status: 'pending'
            }));
          
          if (prodEntries.length > 0) {
            await supabaseClient.from('production_orders').insert(prodEntries);
          }
        }

        console.log(`[webhook] Pedido ${charge.quote_id} movido para ${nextStatus} e processado.`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})