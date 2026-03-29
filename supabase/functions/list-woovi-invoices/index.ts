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
    if (!authHeader) throw new Error("Não autorizado")
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) throw new Error("Usuário não encontrado")

    const { data: profile } = await supabaseClient.from('profiles').select('woovi_api_key').eq('id', user.id).single()
    if (!profile?.woovi_api_key) throw new Error("Token Woovi não configurado.")

    const url = new URL(req.url)
    const start = url.searchParams.get('start') || '2024-01-01'
    const end = url.searchParams.get('end') || new Date().toISOString().split('T')[0]

    console.log(`[list-woovi-invoices] Buscando notas de ${start} até ${end}`);

    const response = await fetch(`https://api.woovi.com/api/v1/invoice?start=${start}&end=${end}&skip=0&limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': profile.woovi_api_key,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})