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

    // 1. Identificar o usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Autorização ausente")
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error("Não autorizado")

    // 2. Buscar a Woovi API Key
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('woovi_api_key')
      .eq('id', user.id)
      .single()

    if (!profile?.woovi_api_key) throw new Error("Token Woovi não configurado.")

    const body = await req.json();
    const { name, email, phone, taxID, address, correlationID } = body;

    console.log(`[create-woovi-customer] Criando cliente na Woovi: ${name}`);

    // 3. Chamar API da Woovi
    const response = await fetch('https://api.woovi.com/api/v1/customer', {
      method: 'POST',
      headers: {
        'Authorization': profile.woovi_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        taxID,
        correlationID,
        address
      })
    });

    const wooviResult = await response.json();
    
    if (!response.ok) {
      throw new Error(wooviResult.error || "Erro retornado pela Woovi");
    }

    // 4. Se deu certo na Woovi, gravar no nosso banco IMEDIATAMENTE
    // Usamos o identifier retornado pela Woovi
    const wooviId = wooviResult.customer?.identifier || wooviResult.customer?.id;

    console.log(`[create-woovi-customer] Sucesso na Woovi (${wooviId}). Gravando no sistema...`);

    const { data: newCustomer, error: dbError } = await supabaseClient
      .from('customers')
      .insert({
        user_id: user.id,
        name,
        email,
        phone,
        tax_id: taxID,
        correlation_id: correlationID,
        woovi_id: wooviId,
        address
      })
      .select()
      .single();

    if (dbError) {
      console.error("[create-woovi-customer] Erro ao gravar no banco:", dbError.message);
      throw new Error("Cliente criado na Woovi, mas falhou ao salvar no sistema: " + dbError.message);
    }

    return new Response(JSON.stringify(newCustomer), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[create-woovi-customer] Erro Crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})