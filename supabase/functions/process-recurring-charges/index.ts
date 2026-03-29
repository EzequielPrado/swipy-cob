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
    const appUrl = Deno.env.get('APP_URL') || 'https://mxkorxmazthagjaqwrfk.supabase.co';

    console.log(`[process-recurring-charges] Iniciando processamento. Hoje: Dia ${currentDayOfMonth}, Dia da Semana ${currentDayOfWeek}`);

    // Busca contratos ativos que devem ser gerados hoje
    // Lógica: (Mensal AND dia do mês) OR (Semanal AND dia da semana)
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('*, customers (*)')
      .eq('status', 'active')
      .or(`and(frequency.eq.monthly,generation_day.eq.${currentDayOfMonth}),and(frequency.eq.weekly,generation_weekday.eq.${currentDayOfWeek})`);

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum contrato para processar hoje" }), { headers: corsHeaders });
    }

    console.log(`[process-recurring-charges] Encontrados ${subscriptions.length} contratos para hoje.`);

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

        // Calcula data de vencimento (Padrão: 3 dias após a geração se não definido, ou usa o due_day para mensais)
        let dueDateStr;
        if (sub.frequency === 'weekly') {
          const dueDate = new Date(today);
          dueDate.setDate(today.getDate() + 3); // Vence em 3 dias
          dueDateStr = dueDate.toISOString().split('T')[0];
        } else {
          let dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day);
          if (sub.due_day < sub.generation_day) dueDate.setMonth(dueDate.getMonth() + 1);
          dueDateStr = dueDate.toISOString().split('T')[0];
        }

        const correlationID = crypto.randomUUID();
        const description = sub.description || `Fatura Contrato ${sub.contract_number || ''} - ${sub.frequency === 'weekly' ? 'Semanal' : 'Mensal'}`;

        console.log(`[process-recurring-charges] Gerando cobrança para ${sub.customers.name} no valor de ${sub.amount}`);

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
          processedCount++;
          // Registro de Log de Notificação (Simples)
          await supabaseClient.from('notification_logs').insert({
            charge_id: charge.id,
            type: 'system',
            status: 'success',
            message: `Cobrança recorrente gerada automaticamente via contrato ${sub.contract_number || '---'}`
          });
        }

      } catch (err) { 
        console.error(`[process-recurring-charges] Erro no contrato ${sub.id}:`, err.message); 
      }
    }

    return new Response(JSON.stringify({ processed: true, count: processedCount }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[process-recurring-charges] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})