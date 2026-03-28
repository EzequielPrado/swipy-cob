"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Copy, CheckCircle2, Loader2, ShieldCheck, Landmark, Building2, User, FileText, AlertTriangle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charge, setCharge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewLogged, setViewLogged] = useState(false);

  useEffect(() => {
    const fetchCharge = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('charges')
          .select(`
            *, 
            customers(name, email, tax_id)
          `)
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Cobrança não encontrada");

        setCharge(data);

        // Buscar dados de branding do vendedor
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company, full_name, logo_url, primary_color')
          .eq('id', data.user_id)
          .single();
        
        if (profileData) {
          setCharge((prev: any) => ({ ...prev, merchant: profileData }));
        }

        // Registrar visualização (apenas uma vez por carregamento de página)
        if (!viewLogged && data.status !== 'pago') {
          fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/log-charge-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chargeId: id,
              type: 'viewed',
              message: 'O cliente visualizou a fatura no navegador.'
            })
          });
          setViewLogged(true);
        }

      } catch (err: any) {
        console.error("Erro ao carregar checkout:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCharge();
    
    const channel = supabase
      .channel(`checkout-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'charges', 
        filter: `id=eq.${id}` 
      }, 
        (payload) => {
          if (payload.new.status === 'pago') {
            setCharge((prev: any) => ({ ...prev, status: 'pago' }));
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, viewLogged]);

  const copyPix = () => {
    if (charge?.pix_qr_code) {
      navigator.clipboard.writeText(charge.pix_qr_code);
      showSuccess("Código PIX copiado!");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-orange-500" size={40} />
        <p className="text-zinc-500 text-sm animate-pulse">Carregando sua fatura...</p>
      </div>
    </div>
  );

  if (error || !charge) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <AlertTriangle size={32} className="text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-zinc-100">Ops! Link Inválido</h1>
      <p className="text-zinc-400 mt-2 max-w-xs">Não conseguimos localizar esta cobrança. Verifique o link ou entre em contato com o emissor.</p>
    </div>
  );

  const merchantName = charge.merchant?.company || charge.merchant?.full_name || "Estabelecimento";
  const primaryColor = charge.merchant?.primary_color || '#f97316';
  const logoUrl = charge.merchant?.logo_url;

  if (charge.status === 'pago') return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
        <CheckCircle2 size={48} className="text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Pagamento Confirmado!</h1>
      <p className="text-zinc-400 mt-2">Obrigado {charge.customers?.name}, seu pagamento para <strong>{merchantName}</strong> foi processado com sucesso.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={merchantName} className="h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-100 border border-zinc-700" style={{ borderColor: primaryColor }}>
                  {merchantName.charAt(0)}
                </div>
                <span className="text-xl font-bold tracking-tight">{merchantName}</span>
              </>
            )}
          </div>
          <p className="text-zinc-500 text-sm">Ambiente de Pagamento Seguro</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }}></div>

          <div className="p-8 border-b border-zinc-800 text-center bg-zinc-900/50">
            {charge.description && (
              <div className="mb-4 flex items-center justify-center gap-2 text-zinc-400 text-sm italic">
                <FileText size={14} />
                {charge.description}
              </div>
            )}
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total a pagar</p>
            <h2 className="text-4xl font-bold text-zinc-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
            </h2>
            <div className="mt-4 flex items-center justify-center gap-2 text-zinc-500 text-xs">
              <span className="bg-zinc-800 px-2 py-0.5 rounded">Vence em: {new Date(charge.due_date).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="p-8 flex flex-col items-center gap-8">
            <div className="bg-white p-4 rounded-2xl shadow-inner relative group border-4 border-zinc-950">
              {charge.pix_qr_image_base64 ? (
                <img 
                  src={charge.pix_qr_image_base64} 
                  alt="QR Code PIX" 
                  className="w-[200px] h-[200px]"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-zinc-400 border border-dashed border-zinc-300 rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-[10px]">Gerando QR Code...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={copyPix}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group active:scale-95 text-zinc-950 font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                <Copy size={18} />
                <span className="text-sm">Copiar código PIX</span>
              </button>
              
              <div className="flex items-start gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 text-left">
                <Landmark size={18} className="mt-0.5 shrink-0" style={{ color: primaryColor }} />
                <div className="text-xs text-zinc-500 leading-relaxed">
                  <p className="font-bold text-zinc-300 mb-1 uppercase tracking-wider">Como pagar?</p>
                  Abra o app do seu banco e escolha a opção <strong>PIX Copia e Cola</strong> ou aponte a câmera para o QR Code acima.
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-950/30 border-t border-zinc-800">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Dados do Pagador</p>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <User size={14} className="text-zinc-600" />
              <span>{charge.customers?.name} • {charge.customers?.tax_id}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4 opacity-50">
          <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em] text-center max-w-xs">
            <ShieldCheck size={14} className="shrink-0" /> Pagamento Protegido por Swipy Fintech LTDA com apoio da Woovi Instituição de Pagamento LTDA
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;