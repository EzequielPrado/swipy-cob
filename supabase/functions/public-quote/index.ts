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
      const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .select('*, customers(name, email, phone, tax_id)')
        .eq('id', quoteId)
        .single()

      if (quoteError || !quote) throw new Error("Orçamento não encontrado");

      const { data: profile } = await supabaseAdmin.from('profiles').select('company, full_name, logo_url, primary_color').eq('id', quote.user_id).single()
      quote.profiles = profile;

      const { data: items } = await supabaseAdmin.from('quote_items').select('*, products(name, description, sku, is_produced)').eq('quote_id', quoteId)

      return new Response(JSON.stringify({ quote, items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (req.method === 'POST') {
      const { action } = await req.json()
      
      if (action === 'approve') {
        // 1. Buscar os itens para saber se precisa de produção
        const { data: items } = await supabaseAdmin.from('quote_items').select('*, products(is_produced)').eq('quote_id', quoteId)
        
        const hasProduction = items?.some(item => item.products?.is_produced === true);
        const nextStatus = hasProduction ? 'production' : 'approved';

        // 2. Atualizar status do Orçamento
        const { data: quote, error } = await supabaseAdmin
          .from('quotes')
          .update({ status: nextStatus })
          .eq('id', quoteId)
          .select()
          .single()

        if (error) throw error

        // 3. Se houver itens de produção, criar as Ordens de Produção
        if (hasProduction && items) {
          const productionEntries = items
            .filter(i => i.products?.is_produced === true)
            .map(i => ({
              user_id: quote.user_id,
              product_id: i.product_id,
              quote_id: quoteId,
              quantity: i.quantity,
              status: 'pending'
            }));
          
          if (productionEntries.length > 0) {
            await supabaseAdmin.from('production_orders').insert(productionEntries);
          }
        }

        // NOTA: A baixa do estoque NÃO acontece aqui mais. 
        // Ela acontecerá apenas no módulo de EXPEDIÇÃO ao confirmar a saída.

        return new Response(JSON.stringify({ success: true, quote, redirectedToProduction: hasProduction }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    throw new Error("Método não suportado")
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})