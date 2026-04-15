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

    // Extrair correlationID: pode vir em payload.charge ou payload.pix.charge
    const correlationID = payload.charge?.correlationID 
      || payload.pix?.charge?.correlationID;
    
    console.log(`[woovi-webhook] Evento recebido: ${event}, correlationID: ${correlationID}`);
    console.log(`[woovi-webhook] Payload completo: ${JSON.stringify(payload)}`);

    // FIX: A Woovi/OpenPix envia "OPENPIX:CHARGE_COMPLETED" quando um PIX é confirmado.
    // Cobrimos todas as variações conhecidas do evento.
    const isPaidEvent = (
      event === 'OPENPIX:CHARGE_COMPLETED' ||
      event === 'OPENPIX_TRANSACTION_RECEIVED' ||
      event === 'CHARGE_COMPLETED' || 
      event === 'PAYMENT_CONFIRMED' ||
      (typeof event === 'string' && event.startsWith('OPENPIX') && event.includes('COMPLETED'))
    );

    if (isPaidEvent && correlationID) {
      
      // 1. Atualizar o status da cobrança para PAGO
      const { data: charge, error: chargeError } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('correlation_id', correlationID)
        .select()
        .single();

      if (chargeError) {
        console.error(`[woovi-webhook] Erro ao atualizar charge com correlation_id=${correlationID}:`, chargeError.message);
      }

      if (charge && charge.quote_id) {
        // 2. Buscar itens do pedido para saber o destino (Produção ou Separação)
        const { data: items } = await supabaseClient
          .from('quote_items')
          .select('*, products(is_produced)')
          .eq('quote_id', charge.quote_id);

        const hasProduction = items?.some((i: any) => i.products?.is_produced);
        const nextStatus = hasProduction ? 'production' : 'picking';

        // 3. Atualizar status do Orçamento
        await supabaseClient
          .from('quotes')
          .update({ status: nextStatus })
          .eq('id', charge.quote_id);
          
        // 4. Se for produção, criar as ordens industriais
        if (hasProduction && items) {
          const prodEntries = items
            .filter((i: any) => i.products?.is_produced)
            .map((i: any) => ({
              user_id: charge.user_id,
              product_id: i.product_id,
              quote_id: charge.quote_id,
              quantity: i.quantity,
              status: 'pending'
            }));
          
          if (prodEntries.length > 0) {
            await supabaseClient.from('production_orders').insert(prodEntries);
          }
        }

        // 5. Registrar log de auditoria para o pagamento confirmado
        await supabaseClient.from('notification_logs').insert({
          charge_id: charge.id,
          type: 'payment',
          status: 'success',
          message: `Pagamento PIX confirmado via Woovi (evento: ${event})`
        });

        // 6. Notificar o merchant sobre o pagamento recebido
        await supabaseClient.from('notifications').insert({
          user_id: charge.user_id,
          title: 'Pagamento PIX Recebido! 💰',
          message: `Pagamento de R$ ${charge.amount?.toFixed(2)} foi confirmado.`,
          type: 'success'
        });

        console.log(`[woovi-webhook] ✅ Pedido ${charge.quote_id} movido para ${nextStatus} e processado.`);
      } else if (charge && !charge.quote_id) {
        // Cobrança avulsa (sem orçamento vinculado) — apenas registra o log
        await supabaseClient.from('notification_logs').insert({
          charge_id: charge.id,
          type: 'payment',
          status: 'success',
          message: `Pagamento PIX avulso confirmado via Woovi (evento: ${event})`
        });

        await supabaseClient.from('notifications').insert({
          user_id: charge.user_id,
          title: 'Pagamento PIX Recebido! 💰',
          message: `Cobrança avulsa de R$ ${charge.amount?.toFixed(2)} foi paga.`,
          type: 'success'
        });

        console.log(`[woovi-webhook] ✅ Cobrança avulsa ${charge.id} marcada como paga.`);
      }
    } else if (!isPaidEvent) {
      console.log(`[woovi-webhook] Evento ignorado: ${event} (não é evento de pagamento)`);
    } else if (!correlationID) {
      console.warn(`[woovi-webhook] ⚠️ Evento de pagamento recebido mas sem correlationID!`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    console.error(`[woovi-webhook] ❌ Erro fatal:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})