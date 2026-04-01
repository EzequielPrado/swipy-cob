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

    const { correlationID, format } = await req.json()
    if (!correlationID || !format) throw new Error("ID da nota ou formato ausente.")

    console.log(`[download-woovi-invoice] Baixando ${format.toUpperCase()} para a nota ID: ${correlationID}`);

    const response = await fetch(`https://api.woovi.com/api/v1/invoice/${correlationID}/${format}`, {
      method: 'GET',
      headers: {
        'Authorization': profile.woovi_api_key.trim()
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[download-woovi-invoice] Erro da Woovi:`, errorText);
      return new Response(JSON.stringify({ error: `Erro na Woovi: ${errorText}` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const blob = await response.blob();
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';

    return new Response(blob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="nota_fiscal_${correlationID}.${format}"`
      },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})