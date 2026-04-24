import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`[onboard-merchant] Recebendo nova requisição: ${req.method}`);
  
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, planId, cnpj: bodyCnpj } = await req.json()

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

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = authData?.user?.email || `${merchant.cpf || userId}@swipy.com`;

    if (!admin?.woovi_api_key) {
      console.log(`[onboard-merchant] Admin sem Woovi configurada. Onboarding local para ${merchant.full_name}.`);

      return new Response(JSON.stringify({ success: true, chargeId: null, mode: 'local_only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`[onboard-merchant] Cadastrando ${merchant.full_name} como cliente de ${admin.company}`);

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

      const today = new Date();
      let dueDay = today.getDate() + 3;
      if (dueDay > 28) dueDay = 28;

      await supabaseAdmin.from('subscriptions').insert({
        user_id: admin.id,
        customer_id: dbCustomer.id,
        amount: plan.price,
        description: `Assinatura Plano ${plan.name} - Swipy`,
        generation_day: today.getDate(),
        due_day: dueDay,
        status: 'active'
      });
    }

    try {
      const cleanCpf = merchant.cpf?.replace(/\D/g, '') || '';
      const cleanCnpj = (bodyCnpj || merchant.cnpj)?.replace(/\D/g, '') || cleanCpf; // Prioriza o CNPJ vindo do body
      const taxType = cleanCnpj.length > 11 ? 'BR:CNPJ' : 'BR:CPF';

      const [firstName, ...lastNameParts] = (merchant.full_name || '').split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const partnerPayload = {
        preRegistration: {
          name: merchant.company || merchant.full_name,
          website: merchant.website || 'https://swipy.com',
          taxID: {
            taxID: cleanCnpj,
            type: taxType
          }
        },
        user: {
          firstName: firstName || 'Admin',
          lastName: lastName || 'Swipy',
          email: userEmail,
          phone: (() => {
            const digits = (merchant.phone || '').replace(/\D/g, '');
            const finalPhone = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
            console.log(`[onboard-merchant] Enviando telefone para Woovi: ${finalPhone}`);
            return finalPhone;
          })(),
          taxID: {
            taxID: cleanCpf,
            type: cleanCpf.length > 11 ? 'BR:CNPJ' : 'BR:CPF'
          }
        }
      };

      console.log(`[onboard-merchant] Payload completo para Woovi:`, JSON.stringify(partnerPayload));

      const rawWooviKey = (Deno.env.get('WOOVI_API_KEY') || '').trim();
      console.log(`[onboard-merchant] Verificando chave: Presente=${!!rawWooviKey}, Tamanho=${rawWooviKey.length}, Início=${rawWooviKey.substring(0, 8)}...`);
      
      const wooviApiKey = rawWooviKey.startsWith('Bearer ') ? rawWooviKey : `Bearer ${rawWooviKey}`;
      
      console.log(`[onboard-merchant] Chamando API Partner Woovi para registrar empresa...`);
      const partnerRes = await fetch('https://api.woovi.com/api/v1/partner/company', {
        method: 'POST',
        headers: { 
          'Authorization': wooviApiKey, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(partnerPayload)
      });

      if (!partnerRes.ok) {
        const partnerError = await partnerRes.text();
        console.error(`[onboard-merchant] Falha ao criar Partner na Woovi. Status: ${partnerRes.status}. Resposta:`, partnerError);
      } else {
        await partnerRes.json();
        console.log(`[onboard-merchant] Conta Partner criada com sucesso na Woovi.`);

        // NOVO: Chama a API de KYC Onboarding
        await fetch('https://api.woovi.com/api/v1/kyc/onboarding', {
          method: 'POST',
          headers: { 
            'Authorization': wooviApiKey, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            taxID: cleanCnpj,
            type: taxType === 'BR:CNPJ' ? 'COMPANY' : 'INDIVIDUAL'
          })
        });
        console.log(`[onboard-merchant] KYC Onboarding enviado.`);
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