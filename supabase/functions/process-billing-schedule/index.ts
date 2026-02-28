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

    // Buscamos as regras D0, D+3, etc
    const { data: rules } = await supabaseClient
      .from('billing_rules')
      .select('*')
      .eq('is_active', true)
      .neq('day_offset', -1); 

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma regra ativa encontrada." }), { headers: corsHeaders });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalProcessed = 0;
    console.log(`[billing-schedule] Iniciando processamento para ${today.toISOString()}`);

    for (const rule of rules) {
      // Data alvo baseada no offset (ex: se venceu há 3 dias)
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - rule.day_offset);
      const dateStr = targetDate.toISOString().split('T')[0];

      console.log(`[billing-schedule] Verificando regra '${rule.label}' para vencimento em ${dateStr}`);

      const { data: charges } = await supabaseClient
        .from('charges')
        .select('*, customers(*), profiles:user_id(company, full_name)')
        .eq('status', 'pendente')
        .eq('due_date', dateStr);

      if (charges && charges.length > 0) {
        for (const charge of charges) {
          try {
            const merchantName = charge.profiles?.company || charge.profiles?.full_name || "Nossa Empresa";
            // Em background, usamos a URL configurada ou um padrão. Ideal configurar APP_URL no Supabase.
            const appUrl = Deno.env.get('APP_URL') || 'https://seu-app.vercel.app';
            const internalCheckoutUrl = `${appUrl}/pagar/${charge.id}`;

            const variables = rule.mapping.map((key: string) => {
              if (key === 'customer_name') return charge.customers.name;
              if (key === 'merchant_name') return merchantName;
              if (key === 'amount') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(charge.amount);
              if (key === 'due_date') return new Date(charge.due_date).toLocaleDateString('pt-BR');
              if (key === 'payment_id') return charge.id;
              if (key === 'payment_link') return internalCheckoutUrl;
              return '---';
            });

            // Lógica do Botão: Se for link dinâmico, enviamos apenas o sufixo (ID) ou a URL completa dependendo da config
            const buttonVariable = rule.button_link_variable === 'payment_link' ? internalCheckoutUrl : charge.id;

            const waRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` 
              },
              body: JSON.stringify({
                to: charge.customers.phone,
                templateName: rule.name,
                language: rule.language || 'en',
                imageUrl: rule.image_url,
                variables: variables,
                buttonVariable: buttonVariable
              })
            });

            await supabaseClient.from('notification_logs').insert({
              charge_id: charge.id,
              type: 'whatsapp',
              status: waRes.ok ? 'success' : 'error',
              message: waRes.ok ? `Régua Automática: ${rule.label} enviada` : `Falha no envio da régua: ${rule.label}`
            });

            totalProcessed++;
          } catch (err: any) {
            console.error(`[billing-schedule] Erro na cobrança ${charge.id}:`, err.message);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})