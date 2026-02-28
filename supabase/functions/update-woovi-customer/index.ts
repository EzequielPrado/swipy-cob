import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const WOOVI_API_KEY = Deno.env.get('WOOVI_API_KEY');
    if (!WOOVI_API_KEY) {
      throw new Error("WOOVI_API_KEY not configured");
    }

    const { wooviId, ...customerData } = await req.json();
    
    if (!wooviId) {
      throw new Error("wooviId is required");
    }

    console.log("[update-woovi-customer] Atualizando cliente na Woovi:", wooviId);

    const response = await fetch(`https://api.woovi.com/api/v1/customer/${wooviId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': WOOVI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } catch (error) {
    console.error("[update-woovi-customer] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})