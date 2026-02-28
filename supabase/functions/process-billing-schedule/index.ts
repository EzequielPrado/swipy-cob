import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: rules } = await supabaseClient.from('billing_rules').select('*').eq('is_active', true);
    if (!rules) return new Response("Sem regras");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const rule of rules) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - rule.day_offset);
      const dateStr = targetDate.toISOString().split('T')[0];

      const { data: charges } = await supabaseClient
        .from('charges')
        .select('*, customers(*), profiles:user_id(company, full_name)')
        .eq('status', 'pendente')
        .eq('due_date', dateStr);

      if (charges) {
        for (const charge of charges) {
          try {
            const merchantName = charge.profiles?.company || charge.profiles?.full_name || "Nossa Empresa";
            const variables = rule.mapping.map((key: string) => {
              if (key === 'customer_name') return charge.customers.name;
              if (key === 'merchant_name') return merchantName;
              if (key === 'amount') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(charge.amount);
              if (key === 'due_date') return new Date(charge.due_date).toLocaleDateString('pt-BR');
              if (key === 'payment_link') return `${Deno.env.get('APP_URL')}/pagar/${charge.id}`;
              return '---';
            });

            const waRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
              body: JSON.stringify({
                to: charge.customers.phone,
                templateName: rule.name,
                language: rule.language,
                imageUrl: rule.image_url,
                variables: variables,
                buttonVariable: charge.id // ID para o link
              })
            });

            // Log da régua
            await supabaseClient.from('notification_logs').insert({
              charge_id: charge.id,
              type: 'whatsapp',
              status: waRes.ok ? 'success' : 'error',
              message: waRes.ok ? `Lembrete ${rule.label} enviado` : `Falha no lembrete ${rule.label}`
            });

          } catch (err) { console.error("Erro log régua:", err); }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})