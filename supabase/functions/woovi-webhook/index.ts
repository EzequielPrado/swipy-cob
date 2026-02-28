import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log("[woovi-webhook] Evento recebido:", payload.event)

    // Eventos de sucesso da Woovi: CHARGE_COMPLETED (Cobrança paga)
    // O identificador da Woovi vem em payload.charge.identifier
    if (payload.event === 'OPEN_PIX_CHARGE_COMPLETED' || payload.event === 'CHARGE_COMPLETED') {
      const wooviId = payload.charge.identifier
      
      console.log(`[woovi-webhook] Processando pagamento para Woovi ID: ${wooviId}`);

      // Atualizar status da cobrança no banco de dados
      const { data, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('woovi_id', wooviId)
        .select('*, customers(name, email)')
        .single()

      if (error) {
        console.error(`[woovi-webhook] Erro ao atualizar cobrança ${wooviId}:`, error.message);
      } else if (data) {
        console.log(`[woovi-webhook] Cobrança ${wooviId} de ${data.customers.name} marcada como PAGA com sucesso.`);
        
        // Opcional: Aqui você poderia disparar um e-mail de confirmação usando a função send-email
        /*
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            to: data.customers.email,
            subject: 'Pagamento Confirmado - Swipy Cob',
            html: `<h1>Olá, ${data.customers.name}!</h1><p>Recebemos seu pagamento de R$ ${data.amount.toFixed(2)}. Obrigado!</p>`
          })
        });
        */
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