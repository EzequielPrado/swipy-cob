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

    // Eventos comuns da Woovi: CHARGE_COMPLETED, CHARGE_EXPIRED
    if (payload.event === 'OPEN_PIX_CHARGE_COMPLETED' || payload.event === 'CHARGE_COMPLETED') {
      const wooviId = payload.charge.identifier
      
      // Atualizar status da cobrança
      const { data, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('woovi_id', wooviId)
        .select('*, customers(name, email)')
        .single()

      if (!error && data) {
        console.log(`[woovi-webhook] Cobrança ${wooviId} marcada como PAGA.`);
        
        // AQUI: Você pode disparar o e-mail de confirmação automaticamente
        // fazendo um fetch interno para a sua função send-email
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("[woovi-webhook] Erro:", error.message)
    return new Response(error.message, { status: 400 })
  }
})