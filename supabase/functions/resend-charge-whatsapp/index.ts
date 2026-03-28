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

    const { chargeId, origin, overridePhone, ruleId } = await req.json()

    // Busca a cobrança
    const { data: charge, error: chargeError } = await supabaseClient
      .from('charges')
      .select('*, customers(*), profiles:user_id(company, full_name)')
      .eq('id', chargeId)
      .single()

    if (chargeError || !charge) throw new Error("Cobrança não encontrada")

    // Busca a regra: Se enviou ruleId usa ela, senão pega a de criação (day_offset -1)
    let query = supabaseClient.from('billing_rules').select('*').eq('is_active', true);
    
    if (ruleId) {
      query = query.eq('id', ruleId);
    } else {
      query = query.eq('day_offset', -1);
    }

    const { data: rule } = await query.single();

    if (!rule) throw new Error("Regra de automação não encontrada.");

    const merchantName = charge.profiles?.company || charge.profiles?.full_name || "Nossa Empresa";
    const systemCheckoutUrl = `${origin || 'https://swipy.com'}/pagar/${charge.id}`;
    const targetPhone = overridePhone || charge.customers.phone;

    // Mapeamento dinâmico
    const variables = rule.mapping.map((key: string) => {
      if (key === 'customer_name') return charge.customers.name;
      if (key === 'merchant_name') return merchantName;
      if (key === 'amount') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(charge.amount);
      if (key === 'due_date') return new Date(charge.due_date).toLocaleDateString('pt-BR');
      if (key === 'payment_id') return charge.id;
      if (key === 'payment_link') return systemCheckoutUrl;
      return '---';
    });

    // Imagem/QR
    let qrImageUrl = null;
    if (rule.image_url === '{{qr_code}}' && charge.pix_qr_code) {
      qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(charge.pix_qr_code)}&format=png&.png`;
    } else if (rule.image_url && rule.image_url !== '{{qr_code}}') {
      qrImageUrl = rule.image_url;
    }

    // Botão
    let buttonVariable = null;
    if (rule.button_link_variable === 'payment_id') {
      buttonVariable = charge.id;
    } else if (rule.button_link_variable === 'payment_link') {
      buttonVariable = systemCheckoutUrl;
    }

    const waRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.get('Authorization') || '' },
      body: JSON.stringify({
        to: targetPhone,
        templateName: rule.name,
        language: rule.language || 'pt_BR',
        imageUrl: qrImageUrl,
        variables: variables,
        buttonVariable: buttonVariable
      })
    });

    const waData = await waRes.json();
    
    await supabaseClient.from('notification_logs').insert({
      charge_id: charge.id,
      type: 'whatsapp',
      status: waRes.ok ? 'success' : 'error',
      message: waRes.ok ? `TESTE REGUA (${rule.label}) enviado para ${targetPhone}` : `Erro Meta: ${waData.error}`
    });

    if (!waRes.ok) throw new Error(waData.error || "Erro na Meta API");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})