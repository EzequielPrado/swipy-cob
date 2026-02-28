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
    
    console.log(`[woovi-webhook] Processando evento: ${event}`);

    // Verifica se o evento contém a confirmação de pagamento (independente de ser PIX ou Boleto)
    const isPaymentDone = event.includes('CHARGE_COMPLETED') || 
                          event.includes('PAYMENT_CONFIRMED') || 
                          event.includes('BILL_COMPLETED');

    if (isPaymentDone) {
      const wooviId = payload.charge?.identifier;
      const correlationID = payload.charge?.correlationID;
      
      console.log(`[woovi-webhook] IDs encontrados - Woovi: ${wooviId}, Interno: ${correlationID}`);

      // Tenta atualizar a cobrança usando qualquer um dos IDs disponíveis
      const { data, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .or(`woovi_id.eq.${wooviId},correlation_id.eq.${correlationID}`)
        .select('id, amount, customers(name)')
        .single();

      if (error) {
        console.error(`[woovi-webhook] Erro ao atualizar no banco:`, error.message);
      } else if (data) {
        console.log(`[woovi-webhook] SUCESSO! Cobrança ${data.id} de ${data.customers.name} atualizada para PAGA.`);
      } else {
        console.warn(`[woovi-webhook] Cobrança não localizada no banco de dados.`);
      }
    } else {
      console.log(`[woovi-webhook] Evento ${event} ignorado.`);
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