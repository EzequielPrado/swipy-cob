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

    const authHeader = req.headers.get('Authorization')
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    if (!user) throw new Error("Não autorizado")

    const secretId = Deno.env.get('BELVO_SECRET_ID');
    const secretPassword = Deno.env.get('BELVO_SECRET_PASSWORD');

    if (!secretId || !secretPassword) {
      throw new Error("As credenciais do Belvo (BELVO_SECRET_ID e BELVO_SECRET_PASSWORD) não estão configuradas nas Secrets do Supabase.");
    }

    console.log("[belvo-auth] Solicitando token de acesso para o widget...");

    const response = await fetch('https://sandbox.belvo.com/api/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: secretId,
        password: secretPassword,
        scopes: 'read_institutions,write_links,read_links'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("[belvo-auth] Falha na API do Belvo:", data);
      throw new Error(data.detail || "Erro ao obter token do Belvo");
    }

    return new Response(JSON.stringify({ access_token: data.access }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("[belvo-auth] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})