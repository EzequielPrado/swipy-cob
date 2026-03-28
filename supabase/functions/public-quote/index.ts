Gera Cobrança -> Status 'waiting_payment'">
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

    const url = new URL(req.url)
    const quoteId = url.searchParams.get('id')
    if (!quoteId) throw new Error("ID do orçamento não informado")

    if (req.method === 'GET') {
      const { data: quote } = await supabaseAdmin.from('quotes').select('*, customers(*)').eq('id', quoteId).single()
      const { data: profile } = await supabaseAdmin.from('profiles').select('company, logo_url, primary_color').eq('id', quote.user_id).single()
      const { data: items } = await supabaseAdmin.from('quote_items').select('*, products(*)').eq('quote_id', quoteId)
      return new Response(JSON.stringify({ quote: { ...quote, profiles: profile }, items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (req.method === 'POST') {
      const { action } = await req.json()
      if (action === 'approve') {
        // Marcamos como 'approved' (aceito pelo cliente), mas aguardando PIX
        const { data: quote } = await supabaseAdmin.from('quotes').update({ status: 'approved' }).eq('id', quoteId).select().single();
        return new Response(JSON.stringify({ success: true, quote }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})