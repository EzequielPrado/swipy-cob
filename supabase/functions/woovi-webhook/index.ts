Move Orçamento para Produção ou Picking">
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const payload = await req.json()
    const event = payload.event
    const correlationID = payload.charge?.correlationID;
    
    if ((event.includes('CHARGE_COMPLETED') || event.includes('PAYMENT_CONFIRMED')) && correlationID) {
      // 1. Marcar cobrança como paga
      const { data: charge } = await supabaseClient.from('charges').update({ status: 'pago' }).eq('correlation_id', correlationID).select().single();

      if (charge) {
        // 2. Tentar localizar o Orçamento vinculado (usamos a descrição ou uma busca por valor/cliente)
        // Aqui assumimos que no create-woovi-charge enviamos o quoteId no correlationID ou metadata
        // Para simplificar, buscamos orçamentos 'approved' do mesmo cliente e valor
        const { data: quote } = await supabaseClient
          .from('quotes')
          .select('*, quote_items(*, products(*))')
          .eq('customer_id', charge.customer_id)
          .eq('status', 'approved')
          .eq('total_amount', charge.amount)
          .order('created_at', { ascending: false })
          .limit(1).single();

        if (quote) {
          const hasProduction = quote.quote_items.some((i: any) => i.products?.is_produced);
          const nextStatus = hasProduction ? 'production' : 'picking';

          await supabaseClient.from('quotes').update({ status: nextStatus }).eq('id', quote.id);

          if (hasProduction) {
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
    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(error.message, { status: 400 });
  }
})