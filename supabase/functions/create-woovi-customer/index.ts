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

    const authHeader = req.headers.get('Authorization')
    let user = null;
    if (authHeader) {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
      if (!authError && authUser) user = authUser;
    }

    const body = await req.json();
    const { name, email, phone, taxID, address, correlationID, merchantId } = body;
    const cleanTaxID = taxID.replace(/\D/g, '');

    // Se merchantId foi fornecido (ex: via portal público), usamos ele, senão usamos o user.id
    const targetUserId = merchantId || user?.id;
    if (!targetUserId) throw new Error("Lojista não identificado ou não autorizado");

    const { data: existing } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('tax_id', cleanTaxID)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key')
      .eq('id', targetUserId)
      .single()

    if (!profile?.woovi_api_key) {
      const { data: localCustomer, error: localError } = await supabaseClient
        .from('customers')
        .insert({
          user_id: targetUserId,
          name,
          email,
          phone,
          tax_id: cleanTaxID,
          correlation_id: correlationID,
          woovi_id: null,
          address
        })
        .select()
        .single();

      if (localError) throw localError;

      return new Response(JSON.stringify(localCustomer), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Se for PJ (CNPJ), registra na Woovi como Partner Company antes do cliente
    if (cleanTaxID.length > 11) {
      try {
        console.log(`[create-woovi-customer] Detectado PJ (${cleanTaxID}). Onboarding Partner Company...`);
        
        const rawWooviKey = Deno.env.get('WOOVI_API_KEY') || '';
        const wooviApiKey = rawWooviKey.startsWith('Bearer ') ? rawWooviKey : `Bearer ${rawWooviKey}`;

        if (wooviApiKey) {
          const [firstName, ...lastNameParts] = (name || '').split(' ');
          const lastName = lastNameParts.join(' ') || firstName;

          const partnerPayload = {
            preRegistration: {
              name: name,
              website: 'https://swipy.com',
              taxID: {
                taxID: cleanTaxID,
                type: 'BR:CNPJ'
              }
            },
            user: {
              firstName,
              lastName,
              email: email,
              phone: (() => {
                const digits = (phone || '').replace(/\D/g, '');
                const finalPhone = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
                console.log(`[create-woovi-customer] Enviando telefone para Woovi: ${finalPhone}`);
                return finalPhone;
              })(),
              taxID: {
                taxID: cleanTaxID,
                type: 'BR:CNPJ' // Idealmente seria um CPF, mas usamos o CNPJ como fallback se não houver outro
              }
            }
          };

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
            console.error(`[create-woovi-customer] Falha ao criar Partner. Status: ${partnerRes.status}. Resposta:`, partnerError);
          } else {
            console.log(`[create-woovi-customer] Partner Company enviado.`);
          }

          // NOVO: Chama a API de KYC Onboarding
          const kycRes = await fetch('https://api.woovi.com/api/v1/kyc/onboarding', {
            method: 'POST',
            headers: { 
              'Authorization': wooviApiKey, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              taxID: cleanTaxID,
              type: 'COMPANY'
            })
          });
          
          if (!kycRes.ok) {
            const kycError = await kycRes.text();
            console.error(`[create-woovi-customer] Falha no KYC. Status: ${kycRes.status}. Resposta:`, kycError);
          } else {
            console.log(`[create-woovi-customer] KYC Onboarding enviado.`);
          }
        }
      } catch (e) {
        console.error(`[create-woovi-customer] Erro ao criar Partner Company:`, e.message);
      }
    }

    const response = await fetch('https://api.woovi.com/api/v1/customer', {
      method: 'POST',
      headers: { 'Authorization': profile.woovi_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, taxID: cleanTaxID, correlationID, address })
    });

    const wooviResult = await response.json();
    if (!response.ok) throw new Error(wooviResult.error || "Erro retornado pela Woovi");

    const wooviId = wooviResult.customer?.identifier || wooviResult.customer?.id;

    const { data: newCustomer, error: dbError } = await supabaseClient
      .from('customers')
      .insert({
        user_id: targetUserId,
        name,
        email,
        phone,
        tax_id: cleanTaxID,
        correlation_id: correlationID,
        woovi_id: wooviId,
        address
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify(newCustomer), {
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