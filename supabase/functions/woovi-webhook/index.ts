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
    
    console.log(`[woovi-webhook] Evento Recebido: ${event} | ID: ${correlationID}`);

    const isPaymentDone = event.includes('CHARGE_COMPLETED') || 
                          event.includes('PAYMENT_CONFIRMED') || 
                          event.includes('BILL_COMPLETED');

    if (isPaymentDone && correlationID) {
      // 1. Atualizar status da cobrança e pegar dados necessários
      const { data: charge, error } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select('id, amount, user_id, customers(name)')
        .single();

      if (error || !charge) {
        console.error(`[woovi-webhook] Cobrança não localizada ou erro:`, error?.message);
        return new Response("Charge not found", { status: 200 }); // Retornamos 200 para a Woovi não re-enviar
      }

      console.log(`[woovi-webhook] Pagamento de ${charge.customers?.name} confirmado. Valor: ${charge.amount}`);
      
      // 2. Registrar na Timeline (Auditoria)
      await supabaseClient.from('notification_logs').insert({
        charge_id: charge.id,
        type: 'payment',
        status: 'success',
        message: `Pagamento de R$ ${charge.amount} confirmado via Pix.`
      });

      // 3. BUSCAR PERFIL DO LOJISTA PARA NOTIFICAÇÃO (ITEM 4)
      const { data: merchant } = await supabaseClient
        .from('profiles')
        .select('phone, company, full_name')
        .eq('id', charge.user_id)
        .single();

      if (merchant?.phone) {
        console.log(`[woovi-webhook] Notificando lojista: ${merchant.company || merchant.full_name} no tel ${merchant.phone}`);
        
        const merchantName = merchant.company || merchant.full_name || "Lojista";
        const valorFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(charge.amount);

        // Disparar WhatsApp para o Dono da Loja
        // Nota: Você deve ter o template 'notifica_venda' aprovado na Meta
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` 
          },
          body: JSON.stringify({
            to: merchant.phone,
            templateName: 'notifica_venda', // Sugestão de nome de template
            variables: [
              merchantName,
              charge.customers?.name || 'Cliente Pix',
              valorFormatado
            ]
          })
        }).catch(err => console.error("[woovi-webhook] Falha ao enviar zap para lojista:", err));
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("[woovi-webhook] Erro crítico:", error.message)
    return new Response(error.message, { status: 400 })
  }
})