import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Usamos o Service Role para ter permissão de gravar dados na conta do Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, planId } = await req.json()

    // Busca os dados do lojista recém-criado e o plano que ele escolheu
    const { data: merchant } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
    const { data: plan } = await supabaseAdmin.from('system_plans').select('*').eq('id', planId).single()
    
    if (!merchant || !plan) throw new Error("Dados insuficientes para onboarding")

    // Busca o Administrador Master do Sistema (Dono da Swipy)
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

    // ETAPA 1: Cadastrar o lojista como Cliente na Woovi do Admin
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

    // ETAPA 2: Cadastrar o lojista na base de Clientes do Admin (tabela customers)
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

    // Se o plano não for gratuito
    if (plan.price > 0 && dbCustomer) {
      
      // ETAPA 3: Criar a cobrança da primeira mensalidade
      const chargeRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-woovi-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          customerId: dbCustomer.id,
          amount: plan.price,
          method: 'pix',
          dueDate: new Date().toISOString().split('T')[0], // Vence hoje
          userId: admin.id,
          description: `Assinatura Plano ${plan.name} - Swipy`,
          origin: "https://swipy.com" 
        })
      })
      const chargeData = await chargeRes.json()
      chargeId = chargeData.id

      // ETAPA 4: Criar a Assinatura Recorrente para o Admin cobrar os próximos meses
      const today = new Date();
      let dueDay = today.getDate() + 3;
      if (dueDay > 28) dueDay = 28; // Limita o vencimento ao dia 28 para evitar problemas de meses curtos

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

    // ETAPA 5: Registrar a empresa na Partner API da Woovi
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