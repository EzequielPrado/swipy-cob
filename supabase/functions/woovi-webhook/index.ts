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
        // 2. Marcar o Orçamento como PAGO (Nova etapa intermediária)
        await supabaseClient
          .from('quotes')
          .update({ status: 'paid' })
          .eq('id', charge.quote_id);
          
        console.log(`[webhook] Pedido ${charge.quote_id} marcado como PAGO.`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})