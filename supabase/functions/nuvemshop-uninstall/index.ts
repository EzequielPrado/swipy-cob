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

    console.log(`[nuvemshop-uninstall] Iniciando remoção para o usuário ${user.id}`);

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'nuvemshop')
      .single()

    if (integration) {
      const { access_token, store_id, settings } = integration;
      const webhookId = settings?.webhook_id;

      if (webhookId && access_token && store_id) {
        try {
          console.log(`[nuvemshop-uninstall] Removendo Webhook ${webhookId} na Nuvemshop...`);
          await fetch(`https://api.tiendanube.com/v1/${store_id}/webhooks/${webhookId}`, {
            method: 'DELETE',
            headers: { 
              'Authentication': `bearer ${access_token}`, 
              'User-Agent': 'Swipy ERP (suporte@swipy.com)' 
            }
          });
        } catch (e) {
          console.error("[nuvemshop-uninstall] Erro ao remover webhook remoto:", e.message);
        }
      }

      const { error: dbError } = await supabaseAdmin
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (dbError) throw dbError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[nuvemshop-uninstall] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})