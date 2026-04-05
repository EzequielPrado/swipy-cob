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

    const today = new Date();
    const currentDayOfMonth = today.getDate();
    const currentDayOfWeek = today.getDay(); // 0 (Dom) a 6 (Sáb)
    const todayISO = today.toISOString().split('T')[0];

    console.log(`[process-recurring-charges] Iniciando processamento. Hoje: ${todayISO} (Dia ${currentDayOfMonth}, Semanal ${currentDayOfWeek})`);

    // Busca contratos ativos que devem ser gerados hoje E que ainda não foram gerados hoje
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('*, customers (*)')
      .eq('status', 'active')
      // Filtro de recorrência (Mensal ou Semanal)
      .or(`and(frequency.eq.monthly,generation_day.eq.${currentDayOfMonth}),and(frequency.eq.weekly,generation_weekday.eq.${currentDayOfWeek})`)
      // TRAVA DE SEGURANÇA: Só processa se a última geração NÃO foi hoje
      .or(`last_generation_date.is.null,last_generation_date.neq.${todayISO}`);

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[process-recurring-charges] Nenhum contrato pendente para processar hoje.`);
      return new Response(JSON.stringify({ message: "Nenhum contrato pendente para hoje", processed: 0 }), { headers: corsHeaders });
    }

    console.log(`[process-recurring-charges] Encontrados ${subscriptions.length} contratos para processar.`);

    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, woovi_api_key, company, full_name')
      .in('id', userIds);

    let processedCount = 0;

    for (const sub of subscriptions) {
      try {
        const profile = profiles?.find(p => p.id === sub.user_id);
        if (!profile?.woovi_api_key) {
          console.warn(`[process-recurring-charges] Token Woovi ausente para o lojista ${sub.user_id}`);
          continue;
        }

        // Calcula data de vencimento
        let dueDateStr;
        if (sub.frequency === 'weekly') {
          const dueDate = new Date(today);
          dueDate.setDate(today.getDate() + 3);
          dueDateStr = dueDate.toISOString().split('T')[0];
        } else {
          let dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day || currentDayOfMonth);
          if (sub.due_day < sub.generation_day) dueDate.setMonth(dueDate.getMonth() + 1);
          dueDateStr = dueDate.toISOString().split('T')[0];
        }

        const correlationID = crypto.randomUUID();
        const description = sub.description || `Fatura Contrato ${sub.contract_number || ''} - ${sub.frequency === 'weekly' ? 'Semanal' : 'Mensal'}`;

        console.log(`[process-recurring-charges] Gerando cobrança para ${sub.customers.name} (${sub.id})`);

        const wooviRes = await fetch('https://api.woovi.com/api/v1/charge', {
          method: 'POST',
          headers: { 'Authorization': profile.woovi_api_key.trim(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correlationID,
            value: Math.round(sub.amount * 100),
            comment: description,
            customer: { name: sub.customers.name, email: sub.customers.email, taxID: sub.customers.tax_id }
          })
        });

        const wooviData = await wooviRes.json();
        if (!wooviRes.ok) throw new Error(wooviData.error || "Erro Woovi");

        const { data: charge } = await supabaseClient.from('charges').insert({
          user_id: sub.user_id,
          customer_id: sub.customer_id,
          subscription_id: sub.id, // Vínculo para auditoria
          amount: sub.amount,
          description: description,
          method: 'pix',
          due_date: dueDateStr,
          woovi_id: wooviData.charge.identifier,
          correlation_id: correlationID,
          payment_link: wooviData.charge.paymentLinkUrl,
          pix_qr_code: wooviData.charge.brCode, 
          pix_qr_image_base64: wooviData.charge.qrCodeImage, 
          status: 'pendente'
        }).select().single();

        if (charge) {
          // MARCA O CONTRATO COMO PROCESSADO HOJE
          await supabaseClient
            .from('subscriptions')
            .update({ last_generation_date: todayISO })
            .eq('id', sub.id);

          processedCount++;
          
          await supabaseClient.from('notification_logs').insert({
            charge_id: charge.id,
            type: 'system',
            status: 'success',
            message: `Assinatura gerada. Trava anti-duplicidade ativada para ${todayISO}.`
          });
        }

      } catch (err: any) { 
        console.error(`[process-recurring-charges] Erro no contrato ${sub.id}:`, err.message); 
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[process-recurring-charges] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})