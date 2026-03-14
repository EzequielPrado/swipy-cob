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
    const appUrl = Deno.env.get('APP_URL') || 'https://mxkorxmazthagjaqwrfk.supabase.co';

    const { data: subscriptions } = await supabaseClient
      .from('subscriptions')
      .select('*, customers (*)')
      .eq('status', 'active')
      .eq('generation_day', currentDay);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nada para hoje" }), { headers: corsHeaders });
    }

    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, woovi_api_key, company, full_name')
      .in('id', userIds);

    for (const sub of subscriptions) {
      try {
        const profile = profiles?.find(p => p.id === sub.user_id);
        if (!profile?.woovi_api_key) continue;

        let dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day);
        if (sub.due_day < sub.generation_day) dueDate.setMonth(dueDate.getMonth() + 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const correlationID = crypto.randomUUID();
        
        // Se a assinatura tiver descrição personalizada, usa ela. Caso contrário, usa o padrão.
        const description = sub.description || `Assinatura Recorrente - Mês ${today.getMonth() + 1}`;

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
          try {
             const merchantName = profile.company || profile.full_name || "Nossa Empresa";
             const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(wooviData.charge.brCode)}&.png`;
             const internalCheckoutUrl = `${appUrl}/pagar/${charge.id}`;

             const waRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
                body: JSON.stringify({
                  to: sub.customers.phone,
                  templateName: 'boleto1',
                  language: 'pt_BR',
                  imageUrl: qrImageUrl,
                  variables: [
                    sub.customers.name, 
                    merchantName, 
                    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(sub.amount),
                    internalCheckoutUrl
                  ],
                  buttonVariable: charge.id
                })
             });

             await supabaseClient.from('notification_logs').insert({
               charge_id: charge.id,
               type: 'whatsapp',
               status: waRes.ok ? 'success' : 'error',
               message: waRes.ok ? `Assinatura enviada por WhatsApp: ${description}` : 'Erro ao enviar WhatsApp da assinatura'
             });

          } catch (waErr) { console.error("Erro WA:", waErr); }
        }

      } catch (err) { console.error("Erro sub:", err); }
    }

    return new Response(JSON.stringify({ processed: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})