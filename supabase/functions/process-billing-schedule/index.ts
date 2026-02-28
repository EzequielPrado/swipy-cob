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

    console.log("[process-billing-schedule] Iniciando verificação diária...");

    // 1. Buscar todas as regras ativas
    const { data: rules, error: rulesErr } = await supabaseClient
      .from('billing_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesErr) throw rulesErr;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const rule of rules) {
      // Calcular a data alvo: Hoje - Offset (ex: Hoje - 3 dias = cobranças que venceram há 3 dias)
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - rule.day_offset);
      const dateStr = targetDate.toISOString().split('T')[0];

      console.log(`[process-billing-schedule] Processando regra ${rule.label} para vencimento em ${dateStr}`);

      // 2. Buscar cobranças pendentes que venceram nessa data
      const { data: charges, error: chargesErr } = await supabaseClient
        .from('charges')
        .select('*, customers(*), profiles:user_id(company, full_name)')
        .eq('status', 'pendente')
        .eq('due_date', dateStr);

      if (chargesErr) {
        console.error(`[process-billing-schedule] Erro ao buscar cobranças para regra ${rule.id}:`, chargesErr);
        continue;
      }

      console.log(`[process-billing-schedule] Encontradas ${charges.length} cobranças.`);

      // 3. Enviar notificações para cada cobrança
      for (const charge of charges) {
        try {
          const merchantName = charge.profiles?.company || charge.profiles?.full_name || "Nossa Empresa";
          
          // Mapeamento dinâmico de variáveis
          const variables = rule.mapping.map((key: string) => {
            if (key === 'customer_name') return charge.customers.name;
            if (key === 'merchant_name') return merchantName;
            if (key === 'amount') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(charge.amount);
            if (key === 'due_date') return new Date(charge.due_date).toLocaleDateString('pt-BR');
            if (key === 'payment_link') return `${Deno.env.get('APP_URL')}/pagar/${charge.id}`;
            return '---';
          });

          const buttonLink = `${Deno.env.get('APP_URL')}/pagar/${charge.id}`;

          // Disparar WhatsApp
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              to: charge.customers.phone,
              templateName: rule.name,
              language: rule.language,
              imageUrl: rule.image_url,
              variables: variables,
              buttonVariable: buttonLink.split('/').pop() // Geralmente apenas o ID se for link dinâmico na Meta
            })
          });

          console.log(`[process-billing-schedule] Notificação enviada para ${charge.customers.name} (Regra: ${rule.label})`);

        } catch (err) {
          console.error(`[process-billing-schedule] Erro ao notificar cobrança ${charge.id}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[process-billing-schedule] Erro crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})