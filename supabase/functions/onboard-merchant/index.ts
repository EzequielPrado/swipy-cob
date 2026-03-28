import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, planId } = await req.json()

    const { data: merchant } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
    const { data: plan } = await supabaseAdmin.from('system_plans').select('*').eq('id', planId).single()
    
    if (!merchant || !plan) throw new Error("Dados insuficientes para onboarding")

    const { data: admin } = await supabaseAdmin
      .from('profiles')
      .select('id, woovi_api_key, company')
      .eq('is_admin', true)
      .order('updated_at', { ascending: true })
      .limit(1)
      .single()

    if (!admin?.woovi_api_key) throw new Error("Administrador do sistema não configurado.")

    console.log(`[onboard-merchant] Cadastrando ${merchant.full_name} como cliente de ${admin.company}`);

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = authData?.user?.email || merchant.email || `${merchant.cpf || userId}@swipy.com`;

    const customerRes = await fetch('https://api.woovi.com/api/v1/customer', {
      method: 'POST',
      headers: { 'Authorization': admin.woovi_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: merchant.company || merchant.full_name,
        email: userEmail,
        taxID: merchant.cpf?.replace(/\D/g, ''),
        phone: merchant.phone,
        correlationID: `cust_${userId}`
      })
    })
    
    const customerData = await customerRes.json()
    const wooviCustomerId = customerData.customer?.identifier

    const { data: dbCustomer } = await supabaseAdmin.from('customers').insert({
      user_id: admin.id,
      name: merchant.company || merchant.full_name,
      email: userEmail,
      tax_id: merchant.cpf,
      phone: merchant.phone,
      woovi_id: wooviCustomerId,
      status: 'em dia'
    }).select().single()

    let chargeId = null;
    if (plan.price > 0 && dbCustomer) {
      const chargeRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          customerId: dbCustomer.id,
          amount: plan.price,
          method: 'pix',
          dueDate: new Date().toISOString().split('T')[0],
          userId: admin.id,
          description: `Assinatura Plano ${plan.name} - Swipy`,
          origin: "https://swipy.com" 
        })
      })
      const chargeData = await chargeRes.json()
      chargeId = chargeData.id
    }

    try {
      const cleanTaxId = merchant.cpf?.replace(/\D/g, '') || '';
      const taxType = cleanTaxId.length > 11 ? 'BR:CNPJ' : 'BR:CPF';

      const [firstName, ...lastNameParts] = (merchant.full_name || '').split(' ');
      const lastName = lastNameParts.join(' ') || firstName; 

      const partnerPayload = {
        preRegistration: {
          name: merchant.company || merchant.full_name,
          website: merchant.website || 'https://swipy.com',
          taxID: {
            taxID: cleanTaxId,
            type: taxType
          }
        },
        user: {
          firstName: firstName || 'Admin',
          lastName: lastName || 'Swipy',
          email: userEmail,
          phone: merchant.phone?.replace(/\D/g, '') || '',
          taxID: {
            taxID: cleanTaxId,
            type: taxType
          }
        }
      };

      console.log(`[onboard-merchant] Chamando API Partner Woovi para registrar empresa...`);
      const partnerRes = await fetch('https://api.woovi.com/api/v1/partner/company', {
        method: 'POST',
        headers: { 
          'Authorization': admin.woovi_api_key, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(partnerPayload)
      });

      if (!partnerRes.ok) {
        const partnerError = await partnerRes.text();
        console.error(`[onboard-merchant] Falha ao criar Partner na Woovi:`, partnerError);
      } else {
        const partnerData = await partnerRes.json();
        console.log(`[onboard-merchant] Conta Partner criada com sucesso na Woovi.`);
      }
    } catch (partnerErr: any) {
      console.error(`[onboard-merchant] Erro ao executar API Partner:`, partnerErr.message);
    }

    return new Response(JSON.stringify({ success: true, chargeId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[onboard-error]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})