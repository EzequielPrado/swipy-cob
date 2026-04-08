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
    if (!authHeader) throw new Error("Autorização ausente")
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error("Não autorizado")

    const body = await req.json();
    const { name, email, phone, taxID, address, correlationID } = body;
    const cleanTaxID = taxID.replace(/\D/g, '');

    const { data: existing } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
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
      .eq('id', user.id)
      .single()

    if (!profile?.woovi_api_key) {
      const { data: localCustomer, error: localError } = await supabaseClient
        .from('customers')
        .insert({
          user_id: user.id,
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
        user_id: user.id,
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