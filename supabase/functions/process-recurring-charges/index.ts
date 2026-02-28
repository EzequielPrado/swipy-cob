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
    const currentDay = today.getDate();
    
    console.log(`[process-recurring-charges] Iniciando processamento do dia ${currentDay}...`);

    // 1. Buscar assinaturas e dados dos clientes
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*, customers (*)')
      .eq('status', 'active')
      .eq('generation_day', currentDay);

    if (subError) throw new Error(`Erro ao buscar assinaturas: ${subError.message}`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma assinatura para hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Buscar Perfis dos Lojistas manualmente para evitar erro de join
    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    const { data: profiles, error: profError } = await supabaseClient
      .from('profiles')
      .select('id, woovi_api_key, company, full_name')
      .in('id', userIds);

    if (profError) throw new Error(`Erro ao buscar perfis: ${profError.message}`);

    console.log(`[process-recurring-charges] Processando ${subscriptions.length} assinaturas.`);
    const results = [];

    for (const sub of subscriptions) {
      try {
        const profile = profiles?.find(p => p.id === sub.user_id);
        
        if (!profile?.woovi_api_key) {
          results.push({ id: sub.id, status: 'error', reason: 'Lojista sem Token Woovi' });
          continue;
        }

        // Calcular Vencimento
        let dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day);
        if (sub.due_day < sub.generation_day) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const correlationID = crypto.randomUUID();
        const description = `Assinatura Recorrente - Mês ${today.getMonth() + 1}`;

        // Criar na Woovi
        const wooviRes = await fetch('https://api.woovi.com/api/v1/charge', {
          method: 'POST',
          headers: {
            'Authorization': profile.woovi_api_key.trim(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            correlationID,
            value: Math.round(sub.amount * 100),
            comment: description,
            customer: {
              name: sub.customers.name,
              email: sub.customers.email,
              taxID: sub.customers.tax_id
            }
          })
        });

        const wooviData = await wooviRes.json();
        if (!wooviRes.ok) throw new Error(wooviData.error || "Erro Woovi");

        // Salvar Cobrança
        await supabaseClient.from('charges').insert({
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
        });

        // WhatsApp
        try {
           const merchantName = profile.company || profile.full_name || "Nossa Empresa";
           const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(wooviData.charge.brCode)}&.png`;

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
                variables: [sub.customers.name, merchantName, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(sub.amount)],
                buttonVariable: wooviData.charge.paymentLinkUrl
              })
           });
        } catch (waErr) { console.error("Erro WA:", waErr); }

        results.push({ id: sub.id, status: 'success' });

      } catch (err) {
        results.push({ id: sub.id, status: 'error', reason: err.message });
      }
    }

    return new Response(JSON.stringify({ processed: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})