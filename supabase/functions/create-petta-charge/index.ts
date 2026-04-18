import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const PETTA_BASE_URL = 'https://api.petta.me'

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
    if (!authHeader) throw new Error("Autorização ausente")
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error("Não autorizado")

    const body = await req.json();
    const { customerId, amount, description, method, dueDate } = body;

    // Buscar credenciais Petta
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('petta_api_key, company, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.petta_api_key) throw new Error("Configuração Petta ausente")

    // Buscar dados do cliente para enviar à Petta
    let customerData: any = {};
    if (customerId) {
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('name, email, phone, tax_id')
        .eq('id', customerId)
        .single();
      if (customer) customerData = customer;
    }

    // Criar cobrança na Petta API
    const pettaPayload: any = {
      amount: Math.round(amount * 100), // Converter para centavos
      method: 'PIX',
      customer: {
        name: customerData.name || 'Cliente',
        email: customerData.email || '',
        phone: customerData.phone || '',
        documentType: (customerData.tax_id?.length || 0) > 11 ? 'CNPJ' : 'CPF',
        document: customerData.tax_id || ''
      },
      items: [{
        title: description || 'Cobrança PIX',
        amount: Math.round(amount * 100),
        quantity: 1,
        tangible: true,
        externalRef: ''
      }]
    };

    const pettaRes = await fetch(`${PETTA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 
        'x-api-key': profile.petta_api_key, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(pettaPayload)
    });

    const pettaData = await pettaRes.json();
    
    if (!pettaRes.ok || !pettaData.status) {
      throw new Error(pettaData.message || pettaData.error || "Erro ao criar cobrança na Petta")
    }

    const pettaCharge = pettaData.data;

    // Salvar no banco local
    const { data: charge, error: dbError } = await supabaseClient
      .from('charges')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        amount,
        description: description || 'Cobrança PIX',
        status: 'pendente', // Mantendo 'pendente' como em woovi
        method: method || 'pix',
        due_date: dueDate,
        petta_id: pettaCharge.id,
        correlation_id: pettaCharge.id,
        payment_link: '', 
        pix_qr_code: pettaCharge.pix?.qrcode || pettaCharge.pix?.qrcodeUrl || '',
        pix_qr_image_base64: '', 
        provider: 'petta'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      ...charge,
      pettaTransaction: pettaCharge
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
