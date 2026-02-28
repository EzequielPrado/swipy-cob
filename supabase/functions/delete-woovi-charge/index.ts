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

    console.log("[delete-woovi-charge] Removendo cobrança na Woovi:", wooviId);

    // Na Woovi, deletar uma cobrança cancela o PIX/Boleto gerado
    const response = await fetch(`https://api.woovi.com/api/v1/charge/${wooviId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': WOOVI_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    // Mesmo que a Woovi retorne erro (ex: cobrança já paga), 
    // permitimos que o fluxo continue ou tratamos especificamente
    const result = await response.json().catch(() => ({}));

    return new Response(JSON.stringify({ success: true, details: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } catch (error) {
    console.error("[delete-woovi-charge] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})