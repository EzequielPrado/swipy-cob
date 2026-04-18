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
    
    // Log the request to see its headers (sometimes there's a signature, but Petta doesn't always strictly require it yet here)
    const payload = await req.json()
    const event = payload.event || payload.type
    
    // Extrair ID da transação
    // Petta pode enviar o ID de várias formas dependo da estrutura
    const transactionId = payload.data?.id || payload.transaction?.id || payload.id;
    
    console.log(`[petta-webhook] Evento recebido: ${event}, transactionId: ${transactionId}`);
    console.log(`[petta-webhook] Payload completo: ${JSON.stringify(payload)}`);

    // Validar se é evento de cobrança paga
    // Na Petta, as transações costumam retornar evento "TRANSACTION_PAID" ou algo similar
    const isPaidEvent = (
      event === 'TRANSACTION_PAID' ||
      event === 'CHARGE_PAID' || 
      event === 'transaction.paid' ||
      event === 'charge.paid' ||
      (typeof event === 'string' && event.toLowerCase().includes('paid')) ||
      payload.data?.status === 'PAID' ||
      payload.transaction?.status === 'PAID'
    );

    if (isPaidEvent && transactionId) {
      
      // 1. Atualizar o status da cobrança para PAGO
      const { data: charge, error: chargeError } = await supabaseClient
        .from('charges')
        .update({ status: 'pago' })
        .eq('petta_id', transactionId)
        .select()
        .single();

      if (chargeError) {
        // Fallback: tentar por correlation_id se petta_id não pegou (apesar de guardarmos igual)
        const { data: chargeFallback, error: chargeErrorFallback } = await supabaseClient
          .from('charges')
          .update({ status: 'pago' })
          .eq('correlation_id', transactionId)
          .select()
          .single();
          
        if (chargeErrorFallback) {
          console.error(`[petta-webhook] Erro ao atualizar charge com id=${transactionId}:`, chargeErrorFallback.message);
        } else if (chargeFallback) {
          await processPayment(chargeFallback, supabaseClient, event);
        }
      } else if (charge) {
        await processPayment(charge, supabaseClient, event);
      }

    } else if (!isPaidEvent) {
      console.log(`[petta-webhook] Evento ignorado: ${event} (não é evento de pagamento válido ou já tratado)`);
    } else if (!transactionId) {
      console.warn(`[petta-webhook] ⚠️ Evento de pagamento recebido mas sem transactionId identificável!`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    console.error(`[petta-webhook] ❌ Erro fatal:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})

async function processPayment(charge: any, supabaseClient: any, event: string) {
  if (charge && charge.quote_id) {
    // Buscar itens do pedido para saber o destino (Produção ou Separação)
    const { data: items } = await supabaseClient
      .from('quote_items')
      .select('*, products(is_produced)')
      .eq('quote_id', charge.quote_id);

    const hasProduction = items?.some((i: any) => i.products?.is_produced);
    const nextStatus = hasProduction ? 'production' : 'picking';

    // Atualizar status do Orçamento
    await supabaseClient
      .from('quotes')
      .update({ status: nextStatus })
      .eq('id', charge.quote_id);
      
    // Se for produção, criar as ordens industriais
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

    // Registrar log de auditoria para o pagamento confirmado
    await supabaseClient.from('notification_logs').insert({
      charge_id: charge.id,
      type: 'payment',
      status: 'success',
      message: `Pagamento PIX confirmado via Petta (evento: ${event})`
    });

    // Notificar o merchant sobre o pagamento recebido
    await supabaseClient.from('notifications').insert({
      user_id: charge.user_id,
      title: 'Pagamento PIX Recebido! 💰',
      message: `Pagamento de R$ ${charge.amount?.toFixed(2)} foi confirmado via Petta.`,
      type: 'success'
    });

    console.log(`[petta-webhook] ✅ Pedido ${charge.quote_id} movido para ${nextStatus} e processado.`);
  } else if (charge && !charge.quote_id) {
    // Cobrança avulsa (sem orçamento vinculado)
    await supabaseClient.from('notification_logs').insert({
      charge_id: charge.id,
      type: 'payment',
      status: 'success',
      message: `Pagamento PIX avulso confirmado via Petta (evento: ${event})`
    });

    await supabaseClient.from('notifications').insert({
      user_id: charge.user_id,
      title: 'Pagamento PIX Recebido! 💰',
      message: `Cobrança avulsa de R$ ${charge.amount?.toFixed(2)} foi paga via Petta.`,
      type: 'success'
    });

    console.log(`[petta-webhook] ✅ Cobrança avulsa ${charge.id} marcada como paga.`);
  }
}
