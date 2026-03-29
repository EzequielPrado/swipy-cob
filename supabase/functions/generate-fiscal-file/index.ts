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
    const fileExt = type === 'sintegra' ? 'txt' : 'csv';
    const { data: exportRecord, error: insertError } = await supabaseAdmin.from('fiscal_exports').insert({
      user_id: user.id,
      file_name: `${type.toUpperCase()}_${period.replace('-', '_')}.${fileExt}`,
      file_type: type,
      period: period,
      status: 'processing'
    }).select().single()

    if (insertError) throw insertError;

    // 2. Buscar dados do Lojista
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
    
    let content = "";
    let contentType = "text/plain; charset=utf-8";

    if (type === 'consolidated') {
      // GERAR CSV PARA O CONTADOR
      contentType = "text/csv; charset=utf-8";
      
      // UTF-8 BOM para o Excel abrir com acentuação correta
      content = "\uFEFF";
      
      // Cabeçalho do CSV
      content += "Data;Tipo;Entidade;Documento;Descricao;Categoria;Valor;Status\r\n";

      // 1. Buscar Receitas (Cobranças)
      const { data: revenues } = await supabaseAdmin.from('charges')
        .select('*, customers(name, tax_id), chart_of_accounts(name)')
        .eq('user_id', user.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      revenues?.forEach(r => {
        const date = new Date(r.due_date).toLocaleDateString('pt-BR');
        const amount = r.amount.toString().replace('.', ',');
        content += `${date};RECEITA;${r.customers?.name || 'Venda PDV'};${r.customers?.tax_id || ''};${r.description || ''};${r.chart_of_accounts?.name || 'Venda'};${amount};${r.status}\r\n`;
      });

      // 2. Buscar Despesas
      const { data: expenses } = await supabaseAdmin.from('expenses')
        .select('*, suppliers(name, tax_id), chart_of_accounts(name)')
        .eq('user_id', user.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      expenses?.forEach(e => {
        const date = new Date(e.due_date).toLocaleDateString('pt-BR');
        const amount = e.amount.toString().replace('.', ',');
        content += `${date};DESPESA;${e.suppliers?.name || 'Diverso'};${e.suppliers?.tax_id || ''};${e.description};${e.chart_of_accounts?.name || 'Geral'};${amount};${e.status}\r\n`;
      });

    } else if (type === 'sintegra') {
      // Lógica Sintegra (Simplificada)
      const cnpj = (profile?.cpf || '00000000000000').replace(/\D/g, '').padEnd(14, '0')
      const ie = 'ISENTO'.padEnd(14, ' ')
      const razao = (profile?.company || 'EMPRESA SEM RAZAO').padEnd(35, ' ').substring(0, 35)
      const cidade = (profile?.trade_name || 'CIDADE').padEnd(30, ' ').substring(0, 30)
      
      content += `10${cnpj}${ie}${razao}${cidade}SP211\r\n`
      content += `11${' '.padEnd(124, ' ')}\r\n`

      const { data: sales } = await supabaseAdmin.from('charges')
        .select('*, customers(*)')
        .eq('user_id', user.id)
        .eq('status', 'pago')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      sales?.forEach(sale => {
        const doc = sale.customers?.tax_id?.replace(/\D/g, '').padStart(14, '0') || '00000000000000'
        const data = sale.due_date.replace(/-/g, '')
        const valor = Math.round(sale.amount * 100).toString().padStart(13, '0')
        content += `50${doc}${ie}${data}SP551000001000${valor}0000000000000000\r\n`
      })

      const totalCount = (sales?.length || 0) + 3
      content += `90${cnpj}${ie}99${totalCount.toString().padStart(8, '0')}000\r\n`
    } else {
      content = "Tipo de exportação não suportado nesta versão enxuta.";
    }

    // 3. Salvar no Storage
    const fileName = `${user.id}/${exportRecord.id}.${fileExt}`
    const { error: uploadError } = await supabaseAdmin.storage.from('fiscal_files').upload(fileName, content, {
      contentType: contentType,
      upsert: true
    })

    if (uploadError) throw new Error("Falha ao salvar no Storage: " + uploadError.message);

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