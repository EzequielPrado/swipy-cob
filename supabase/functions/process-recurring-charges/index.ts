import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Usamos a Service Role Key para ter acesso total ao banco (bypass RLS)
    // pois essa função roda em background, sem usuário logado.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date();
    const currentDay = today.getDate(); // 1 a 31
    
    console.log(`[process-recurring-charges] Iniciando processamento do dia ${currentDay}...`);

    // 1. Buscar assinaturas ativas programadas para hoje
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('subscriptions')
      .select(`
        *,
        customers (*),
        profiles:user_id (woovi_api_key, company, full_name)
      `)
      .eq('status', 'active')
      .eq('generation_day', currentDay);

    if (subError) throw new Error(`Erro ao buscar assinaturas: ${subError.message}`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[process-recurring-charges] Nenhuma assinatura agendada para hoje.");
      return new Response(JSON.stringify({ message: "Nenhuma assinatura para processar hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[process-recurring-charges] Encontradas ${subscriptions.length} assinaturas.`);

    const results = [];

    // 2. Processar cada assinatura
    for (const sub of subscriptions) {
      try {
        if (!sub.profiles?.woovi_api_key) {
          console.error(`[Erro] Assinatura ${sub.id}: Lojista sem API Key configurada.`);
          results.push({ id: sub.id, status: 'error', reason: 'Missing API Key' });
          continue;
        }

        // Calcular Vencimento
        // Se o dia de vencimento for menor que o dia de geração, assume-se que é no próximo mês
        // Ex: Gera dia 25, Vence dia 05 (do mês seguinte)
        let dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day);
        if (sub.due_day < sub.generation_day) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const correlationID = crypto.randomUUID();
        const description = `Assinatura Recorrente - Mês ${today.getMonth() + 1}`;

        // Chamar Woovi
        const wooviRes = await fetch('https://api.woovi.com/api/v1/charge', {
          method: 'POST',
          headers: {
            'Authorization': sub.profiles.woovi_api_key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            correlationID,
            value: Math.round(sub.amount * 100), // Centavos
            comment: description,
            customer: {
              name: sub.customers.name,
              email: sub.customers.email,
              taxID: sub.customers.tax_id
            }
          })
        });

        const wooviData = await wooviRes.json();
        
        if (!wooviRes.ok) {
          console.error(`[Erro Woovi] Assinatura ${sub.id}:`, wooviData.error);
          results.push({ id: sub.id, status: 'error', reason: wooviData.error });
          continue;
        }

        // Salvar Cobrança no Banco
        const { error: chargeError } = await supabaseClient
          .from('charges')
          .insert({
            user_id: sub.user_id,
            customer_id: sub.customer_id,
            amount: sub.amount,
            description: description,
            method: 'pix',
            due_date: dueDateStr,
            woovi_id: wooviData.charge.identifier,
            correlation_id: correlationID,
            payment_link: wooviData.charge.paymentLinkUrl,
            pix_qr_code: wooviData.charge.brCode, 
            pix_qr_image_base64: wooviData.charge.qrCodeImage || null, 
            status: 'pendente'
          });

        if (chargeError) {
          console.error(`[Erro DB] Assinatura ${sub.id}:`, chargeError.message);
          results.push({ id: sub.id, status: 'error', reason: chargeError.message });
          continue;
        }

        // Disparo WhatsApp (Opcional, mas recomendado para manter a experiência)
        // Reutilizamos a lógica chamando a function via fetch interno ou implementando aqui.
        // Implementando envio simples aqui para garantir robustez
        try {
           const merchantName = sub.profiles.company || sub.profiles.full_name || "Nossa Empresa";
           // URL hardcoded para garantir funcionamento no cron
           const systemCheckoutUrl = `https://preview--dyad-generated-app.lovable.app/pagar/${wooviData.charge.correlationID}`; // Nota: Ajustar domínio em prod
           const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(wooviData.charge.brCode)}&.png`;

           // Chama a função de envio de whats existente
           await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
              },
              body: JSON.stringify({
                to: sub.customers.phone,
                templateName: 'boleto1',
                language: 'en',
                imageUrl: qrImageUrl,
                variables: [
                  sub.customers.name,
                  merchantName,
                  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(sub.amount)
                ],
                buttonVariable: wooviData.charge.paymentLinkUrl // Mandando link direto da Woovi por segurança no Cron
              })
           });
        } catch (waErr) {
           console.error("Erro envio WA no cron:", waErr);
        }

        results.push({ id: sub.id, status: 'success', chargeId: correlationID });

      } catch (innerError) {
        console.error(`[Erro Interno Loop] Assinatura ${sub.id}:`, innerError);
        results.push({ id: sub.id, status: 'error', reason: innerError.message });
      }
    }

    return new Response(JSON.stringify({ processed: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[process-recurring-charges] Erro fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})