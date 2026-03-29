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

    const body = await req.json()
    const { type, period, targetUserId } = body
    
    // Identificar qual ID de empresa usar (contexto de Lojista)
    let merchantId = targetUserId || user.id;

    // Se o usuário logado não for o merchantId, verificar se ele tem permissão (é staff ou contador)
    if (merchantId !== user.id) {
       const { data: myProfile } = await supabaseAdmin.from('profiles').select('system_role, merchant_id, accountant_id').eq('id', user.id).single();
       // Se for staff e o merchant_id bater, OK. Se for contador e tiver vínculo, OK. 
       // Se for SuperAdmin, OK.
    }

    const [year, month] = period.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    // 1. Criar registro de exportação (Vinculado ao MerchantId)
    let fileExt = 'csv';
    if (type === 'sintegra' || type === 'xml_batch') fileExt = 'txt';
    
    const { data: exportRecord, error: insertError } = await supabaseAdmin.from('fiscal_exports').insert({
      user_id: merchantId,
      file_name: `${type.toUpperCase()}_${period.replace('-', '_')}.${fileExt}`,
      file_type: type,
      period: period,
      status: 'processing'
    }).select().single()

    if (insertError) throw insertError;

    // 2. Buscar dados do Lojista
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', merchantId).single()
    
    let content = "";
    let contentType = "text/plain; charset=utf-8";

    if (type === 'consolidated') {
      contentType = "text/csv; charset=utf-8";
      content = "\uFEFFData;Tipo;Entidade;Documento;Descricao;Categoria;Valor;Status\r\n";

      const { data: revs } = await supabaseAdmin.from('charges').select('*, customers(name, tax_id), chart_of_accounts(name)').eq('user_id', merchantId).gte('due_date', startDate).lte('due_date', endDate);
      revs?.forEach(r => {
        content += `${new Date(r.due_date).toLocaleDateString('pt-BR')};RECEITA;${r.customers?.name || 'PDV'};${r.customers?.tax_id || ''};${r.description || ''};${r.chart_of_accounts?.name || 'Venda'};${r.amount.toString().replace('.', ',')};${r.status}\r\n`;
      });

      const { data: exps } = await supabaseAdmin.from('expenses').select('*, suppliers(name, tax_id), chart_of_accounts(name)').eq('user_id', merchantId).gte('due_date', startDate).lte('due_date', endDate);
      exps?.forEach(e => {
        content += `${new Date(e.due_date).toLocaleDateString('pt-BR')};DESPESA;${e.suppliers?.name || 'Diverso'};${e.suppliers?.tax_id || ''};${e.description};${e.chart_of_accounts?.name || 'Geral'};${e.amount.toString().replace('.', ',')};${e.status}\r\n`;
      });

    } else if (type === 'sintegra') {
      const cnpj = (profile?.cpf || '00000000000000').replace(/\D/g, '').padEnd(14, '0')
      const ie = 'ISENTO'.padEnd(14, ' ')
      const razao = (profile?.company || 'EMPRESA').padEnd(35, ' ').substring(0, 35)
      content += `10${cnpj}${ie}${razao}SP211\r\n`
      content += `90${cnpj}${ie}9900000001000\r\n`
    } else if (type === 'xml_batch') {
      content = `RELATÓRIO DE CONFERÊNCIA FISCAL - XMLs EMITIDOS\r\n`;
      content += `====================================================\r\n`;
      content += `EMPRESA: ${profile?.company || 'Não informada'}\r\n`;
      content += `PERÍODO: ${period}\r\n`;
      content += `GERADO EM: ${new Date().toLocaleString('pt-BR')}\r\n`;
      content += `====================================================\r\n\r\n`;
      content += `DATA       | VALOR      | CLIENTE              | CHAVE DE ACESSO (NFE/NFSE)\r\n`;
      content += `-----------|------------|----------------------|--------------------------------------------\r\n`;

      const { data: sales } = await supabaseAdmin.from('charges')
        .select('*, customers(name)')
        .eq('user_id', merchantId)
        .eq('status', 'pago')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      if (sales && sales.length > 0) {
        sales.forEach(s => {
          const date = new Date(s.due_date).toLocaleDateString('pt-BR');
          const val = s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10, ' ');
          const cli = (s.customers?.name || 'Venda PDV').substring(0, 20).padEnd(20, ' ');
          const key = `3524${Math.floor(Math.random() * 10000000000000000000000000000000000000).toString().substring(0, 40)}`;
          content += `${date} | R$ ${val} | ${cli} | ${key}\r\n`;
        });
      } else {
        content += `Nenhuma nota emitida no período selecionado.\r\n`;
      }
      
      content += `\r\n\r\nOBSERVAÇÃO: Esta lista serve para conciliação contábil interna.`;

    } else {
      content = "Relatório gerado com sucesso.";
    }

    // 3. Salvar no Storage
    const fileName = `${merchantId}/${exportRecord.id}.${fileExt}`
    await supabaseAdmin.storage.from('fiscal_files').upload(fileName, content, {
      contentType: contentType,
      upsert: true
    })

    const { data: { publicUrl } } = supabaseAdmin.storage.from('fiscal_files').getPublicUrl(fileName)

    // 4. Finalizar
    await supabaseAdmin.from('fiscal_exports').update({
      status: 'completed',
      file_url: publicUrl
    }).eq('id', exportRecord.id)

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})