import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Usamos a chave de serviço (Service Role) para ignorar o RLS de usuários não logados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const quoteId = url.searchParams.get('id')

    if (!quoteId) throw new Error("ID do orçamento não informado")

    if (req.method === 'GET') {
      // 1. Busca Orçamento e Cliente
      const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .select('*, customers(name, email, phone, tax_id)')
        .eq('id', quoteId)
        .single()

      if (quoteError) {
        console.error("[public-quote] Erro ao buscar orçamento:", quoteError.message);
        throw new Error("Erro ao consultar o banco de dados.");
      }
      
      if (!quote) throw new Error("Orçamento não encontrado ou expirado");

      // 2. Busca o Perfil do Lojista separadamente (resolve o problema de Join)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company, full_name, logo_url, primary_color')
        .eq('id', quote.user_id)
        .single()

      quote.profiles = profile;

      // 3. Busca os Itens do Orçamento
      const { data: items } = await supabaseAdmin
        .from('quote_items')
        .select('*, products(name, description, sku)')
        .eq('quote_id', quoteId)

      return new Response(JSON.stringify({ quote, items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const { action } = await req.json()
      
      if (action === 'approve') {
        // 1. Marca o orçamento como aprovado
        const { data: quote, error } = await supabaseAdmin
          .from('quotes')
          .update({ status: 'approved' })
          .eq('id', quoteId)
          .select()
          .single()

        if (error) throw error

        // 2. Dá baixa no estoque dos produtos do orçamento
        const { data: items } = await supabaseAdmin.from('quote_items').select('*').eq('quote_id', quoteId)
        if (items) {
          for (const item of items) {
            if (!item.product_id) continue;
            const { data: p } = await supabaseAdmin.from('products').select('stock_quantity').eq('id', item.product_id).single()
            if (p) {
              await supabaseAdmin
                .from('products')
                .update({ stock_quantity: Math.max(0, p.stock_quantity - item.quantity) })
                .eq('id', item.product_id)
            }
          }
        }

        return new Response(JSON.stringify({ success: true, quote }), {
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