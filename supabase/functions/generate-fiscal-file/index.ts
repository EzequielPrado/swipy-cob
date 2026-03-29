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

    const { type, period } = await req.json()
    const [year, month] = period.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    // 1. Criar registro de exportação
    const { data: exportRecord, error: insertError } = await supabaseAdmin.from('fiscal_exports').insert({
      user_id: user.id,
      file_name: `${type.toUpperCase()}_${period.replace('-', '_')}.txt`,
      file_type: type,
      period: period,
      status: 'processing'
    }).select().single()

    if (insertError) throw insertError;

    // 2. Buscar dados do Lojista
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
    
    // Buscar vendas (cobranças pagas)
    const { data: sales } = await supabaseAdmin.from('charges')
      .select('*, customers(*)')
      .eq('user_id', user.id)
      .eq('status', 'pago')
      .gte('due_date', startDate)
      .lte('due_date', endDate)

    let content = "";

    if (type === 'sintegra') {
      // REGISTRO 10 - Mestre
      const cnpj = (profile?.cpf || '00000000000000').replace(/\D/g, '').padEnd(14, '0')
      const ie = 'ISENTO'.padEnd(14, ' ')
      const razao = (profile?.company || 'EMPRESA SEM RAZAO').padEnd(35, ' ').substring(0, 35)
      const cidade = (profile?.trade_name || 'CIDADE').padEnd(30, ' ').substring(0, 30)
      const uf = 'SP'
      
      content += `10${cnpj}${ie}${razao}${cidade}${uf}211\r\n`

      // REGISTRO 11 - Complementar
      content += `11${' '.padEnd(124, ' ')}\r\n`

      // REGISTRO 50 - Notas (Simuladas)
      sales?.forEach(sale => {
        const doc = sale.customers?.tax_id?.replace(/\D/g, '').padStart(14, '0') || '00000000000000'
        const data = sale.due_date.replace(/-/g, '')
        const valor = Math.round(sale.amount * 100).toString().padStart(13, '0')
        content += `50${doc}${ie}${data}${uf}551000001000${valor}0000000000000000\r\n`
      })

      // REGISTRO 90 - Totalizador
      const totalCount = (sales?.length || 0) + 3
      content += `90${cnpj}${ie}99${totalCount.toString().padStart(8, '0')}000\r\n`
    } else {
      content = "Relatório de Inventário - Dados de estoque em processamento.";
    }

    // 3. Salvar no Storage
    const fileName = `${user.id}/${exportRecord.id}.txt`
    const { error: uploadError } = await supabaseAdmin.storage.from('fiscal_files').upload(fileName, content, {
      contentType: 'text/plain; charset=utf-8',
      upsert: true
    })

    if (uploadError) throw new Error("Falha ao salvar arquivo no Storage: " + uploadError.message);

    const { data: { publicUrl } } = supabaseAdmin.storage.from('fiscal_files').getPublicUrl(fileName)

    // 4. Atualizar registro para finalizado
    await supabaseAdmin.from('fiscal_exports').update({
      status: 'completed',
      file_url: publicUrl
    }).eq('id', exportRecord.id)

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[generate-fiscal-file] Erro:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})