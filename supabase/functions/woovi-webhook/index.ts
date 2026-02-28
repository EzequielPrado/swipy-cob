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
    
    // O correlationID é o ID que nós geramos internamente
    const correlationID = payload.charge?.correlationID;
    const wooviId = payload.charge?.identifier;
    
    console.log(`[woovi-webhook] Evento: ${event} | ID Interno: ${correlationID}`);

    const isPaymentDone = event.includes('CHARGE_COMPLETED') || 
                          event.includes('PAYMENT_CONFIRMED') || 
                          event.includes('BILL_COMPLETED');

    if (isPaymentDone && correlationID) {
      // 1. Primeiro tentamos atualizar pelo correlation_id que é o mais seguro
      const { data, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select('id, customers(name)')
        .single();

      if (error) {
        console.error(`[woovi-webhook] Erro ao atualizar por correlation_id:`, error.message);
        
        // 2. Se falhar e tivermos o wooviId, tentamos por ele (caso a coluna exista)
        if (wooviId) {
          const { error: error2 } = await supabaseClient
            .from('charges')
            .update({ status: 'pago' })
            .eq('woovi_id', wooviId);
          
          if (error2) console.error(`[woovi-webhook] Erro ao atualizar por woovi_id:`, error2.message);
        }
      } else if (data) {
        console.log(`[woovi-webhook] SUCESSO! Pagamento de ${data.customers?.name} confirmado.`);
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