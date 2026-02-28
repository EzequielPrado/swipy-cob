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
    
    console.log(`[woovi-webhook] Evento recebido: ${event}`);
    console.log("[woovi-webhook] Payload completo:", JSON.stringify(payload));

    // Lista de eventos que indicam pagamento concluído na Woovi
    const paymentEvents = [
      'OPEN_PIX_CHARGE_COMPLETED', 
      'CHARGE_COMPLETED', 
      'PIX_CHARGE_COMPLETED',
      'BILL_COMPLETED'
    ];

    if (paymentEvents.includes(event)) {
      // Tentamos pegar o identificador único da Woovi ou o Correlation ID que nós geramos
      const wooviId = payload.charge?.identifier;
      const correlationID = payload.charge?.correlationID;
      
      console.log(`[woovi-webhook] Identificadores - Woovi ID: ${wooviId}, Correlation ID: ${correlationID}`);

      // Atualizamos a cobrança buscando por qualquer um dos dois IDs para garantir
      const { data, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .or(`woovi_id.eq.${wooviId},correlation_id.eq.${correlationID}`)
        .select('id, amount, customers(name)')
        .single();

      if (error) {
        console.error(`[woovi-webhook] Erro ao atualizar cobrança:`, error.message);
      } else if (data) {
        console.log(`[woovi-webhook] Sucesso! Cobrança ${data.id} de ${data.customers.name} (R$ ${data.amount}) marcada como PAGA.`);
      } else {
        console.warn(`[woovi-webhook] Nenhuma cobrança encontrada no banco para os IDs fornecidos.`);
      }
    } else {
      console.log(`[woovi-webhook] Evento ignorado (não é de pagamento concluído).`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("[woovi-webhook] Erro crítico no processamento:", error.message)
    return new Response(error.message, { status: 400 })
  }
})