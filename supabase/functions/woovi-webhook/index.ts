import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const event = payload.event
    
    const correlationID = payload.charge?.correlationID;
    const wooviId = payload.charge?.identifier;
    
    console.log(`[woovi-webhook] Evento: ${event} | ID Interno: ${correlationID}`);

    const isPaymentDone = event.includes('CHARGE_COMPLETED') || 
                          event.includes('PAYMENT_CONFIRMED') || 
                          event.includes('BILL_COMPLETED');

    if (isPaymentDone && correlationID) {
      // 1. Atualizar status da cobrança
      const { data, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select('id, customers(name)')
        .single();

      if (!error && data) {
        console.log(`[woovi-webhook] SUCESSO! Pagamento de ${data.customers?.name} confirmado.`);
        
        // 2. Registrar na Timeline
        await supabaseClient.from('notification_logs').insert({
          charge_id: data.id,
          type: 'payment',
          status: 'success',
          message: 'Pagamento confirmado via Pix e conciliado automaticamente pela Woovi.'
        });
      } else {
        console.error(`[woovi-webhook] Erro ao atualizar:`, error?.message);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("[woovi-webhook] Erro crítico:", error.message)
    return new Response(error.message, { status: 400 })
  }
})