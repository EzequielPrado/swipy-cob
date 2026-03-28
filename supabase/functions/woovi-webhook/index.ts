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
    
    console.log(`[woovi-webhook] Evento: ${event} | ID: ${correlationID}`);

    const isPaymentDone = event.includes('CHARGE_COMPLETED') || event.includes('PAYMENT_CONFIRMED');

    if (isPaymentDone && correlationID) {
      const { data: charge, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select('id, amount, user_id, customers(name)')
        .single();

      if (!error && charge) {
        // 1. Notificação In-App (Sininho)
        await supabaseClient.from('notifications').insert({
          user_id: charge.user_id,
          title: 'Pagamento Recebido! 💰',
          message: `O cliente ${charge.customers?.name} acabou de pagar R$ ${charge.amount} via Pix.`,
          type: 'success'
        });

        // 2. Notificação WhatsApp (já implementado)
        const { data: merchant } = await supabaseClient.from('profiles').select('phone').eq('id', charge.user_id).single();
        if (merchant?.phone) {
           await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
            body: JSON.stringify({
              to: merchant.phone,
              templateName: 'notifica_venda',
              variables: [charge.customers?.name, charge.amount.toString()]
            })
          }).catch(e => console.error(e));
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    return new Response(error.message, { status: 400 });
  }
})