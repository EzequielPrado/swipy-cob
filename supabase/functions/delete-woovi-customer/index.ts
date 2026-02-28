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

    const { wooviId } = await req.json();
    
    if (!wooviId) {
      throw new Error("wooviId is required");
    }

    console.log("[delete-woovi-customer] Removendo cliente na Woovi:", wooviId);

    // Nota: Algumas APIs podem não permitir DELETE físico se houver cobranças.
    // Usamos o endpoint de exclusão da Woovi.
    const response = await fetch(`https://api.woovi.com/api/v1/customer/${wooviId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': WOOVI_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } catch (error) {
    console.error("[delete-woovi-customer] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})