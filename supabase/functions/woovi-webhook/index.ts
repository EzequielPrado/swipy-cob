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
    
    // Verificamos se o evento é de pagamento concluído
    if ((event === 'CHARGE_COMPLETED' || event === 'PAYMENT_CONFIRMED') && correlationID) {
      
      // 1. Atualizar o status da cobrança para PAGO
      const { data: charge } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select()
        .single();

      if (charge && charge.quote_id) {
        // 2. Localizar o Orçamento vinculado
        const { data: quote } = await supabaseClient
          .from('quotes')
          .select('*, quote_items(*, products(*))')
          .eq('id', charge.quote_id)
          .single();

        if (quote) {
          // 3. Decidir destino: Indústria ou Expedição?
          const hasItemsToProduce = quote.quote_items.some((i: any) => i.products?.is_produced);
          const nextStatus = hasItemsToProduce ? 'production' : 'picking';

          // 4. Atualizar Orçamento
          await supabaseClient.from('quotes').update({ status: nextStatus }).eq('id', quote.id);

          // 5. Se for produção, criar as ordens
          if (hasItemsToProduce) {
            const prodEntries = quote.quote_items
              .filter((i: any) => i.products?.is_produced)
              .map((i: any) => ({
                user_id: quote.user_id,
                product_id: i.product_id,
                quote_id: quote.id,
                quantity: i.quantity,
                status: 'pending'
              }));
            
            await supabaseClient.from('production_orders').insert(prodEntries);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})