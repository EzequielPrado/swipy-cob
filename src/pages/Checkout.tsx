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

  // Função para detectar dispositivo
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let device = "Desktop";
    if (/Android/i.test(ua)) device = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS (Apple)";
    else if (/Mobile/i.test(ua)) device = "Mobile (Outro)";

    const browser = /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : /Firefox/i.test(ua) ? "Firefox" : "Navegador";
    return `${device} via ${browser}`;
  };

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

        // Registrar visualização com DETALHES DO DISPOSITIVO (RASTREIO 3)
        if (!viewLogged && data.status !== 'pago') {
          const deviceInfo = getDeviceInfo();
          fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/log-charge-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chargeId: id,
              type: 'viewed',
              message: `Acessou a fatura usando ${deviceInfo}.`
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

  const copyPix = async () => {
    if (charge?.pix_qr_code) {
      navigator.clipboard.writeText(charge.pix_qr_code);
      showSuccess("Código PIX copiado!");

      // Registrar Cópia do PIX (Intenção)
      try {
        const deviceInfo = getDeviceInfo();
        await fetch(`https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/log-charge-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chargeId: id,
            type: 'interaction',
            message: `Copiou o PIX pelo ${deviceInfo}.`
          })
        });
      } catch (e) { console.error("Erro ao logar interação:", e); }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-apple-light flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-orange-500" size={40} />
        <p className="text-apple-muted text-sm animate-pulse">Carregando sua fatura...</p>
      </div>
    </div>
  );

  if (error || !charge) return (
    <div className="min-h-screen bg-apple-light flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
        <AlertTriangle size={32} className="text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-apple-black">Ops! Link Inválido</h1>
      <p className="text-apple-muted mt-2 max-w-xs">Não conseguimos localizar esta cobrança. Verifique o link ou entre em contato com o emissor.</p>
    </div>
  );

  const merchantName = charge.merchant?.company || charge.merchant?.full_name || "Estabelecimento";
  const primaryColor = charge.merchant?.primary_color || '#f97316';
  const logoUrl = charge.merchant?.logo_url;

  if (charge.status === 'pago') return (
    <div className="min-h-screen bg-apple-light flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100">
        <CheckCircle2 size={48} className="text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-apple-black">Pagamento Confirmado!</h1>
      <p className="text-apple-muted mt-2">Obrigado {charge.customers?.name}, seu pagamento para <strong>{merchantName}</strong> foi processado com sucesso.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-light text-apple-black flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={merchantName} className="h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-apple-white rounded-lg flex items-center justify-center font-bold text-apple-black border border-apple-border shadow-sm">
                  {merchantName.charAt(0)}
                </div>
                <span className="text-xl font-bold tracking-tight">{merchantName}</span>
              </>
            )}
          </div>
          <p className="text-apple-muted text-sm font-medium">Ambiente de Pagamento Seguro</p>
        </div>

        <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm relative">
          <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }}></div>

          <div className="p-8 border-b border-apple-border text-center bg-apple-offWhite">
            {charge.description && (
              <div className="mb-4 flex items-center justify-center gap-2 text-apple-muted text-sm italic font-medium">
                <FileText size={14} />
                {charge.description}
              </div>
            )}
            <p className="text-apple-muted text-xs font-bold uppercase tracking-widest mb-2">Total a pagar</p>
            <h2 className="text-4xl font-black text-apple-black">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
            </h2>
            <div className="mt-4 flex items-center justify-center gap-2 text-apple-muted text-[10px] font-bold uppercase">
              <span className="bg-apple-light px-3 py-1 rounded-full border border-apple-border">Vence em: {new Date(charge.due_date).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="p-8 flex flex-col items-center gap-8">
            <div className="bg-white p-4 rounded-3xl shadow-sm relative group border border-apple-border">
              {charge.pix_qr_image_base64 ? (
                <img 
                  src={charge.pix_qr_image_base64} 
                  alt="QR Code PIX" 
                  className="w-[200px] h-[200px]"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-apple-muted border border-dashed border-apple-border rounded-2xl">
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
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group active:scale-95 text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                <Copy size={18} />
                <span className="text-sm">Copiar código PIX</span>
              </button>
              
              <div className="flex items-start gap-3 p-4 bg-apple-offWhite rounded-2xl border border-apple-border text-left">
                <Landmark size={18} className="mt-0.5 shrink-0" style={{ color: primaryColor }} />
                <div className="text-xs text-apple-muted leading-relaxed font-medium">
                  <p className="font-bold text-apple-black mb-1 uppercase tracking-wider">Como pagar?</p>
                  Abra o app do seu banco e escolha a opção <strong>PIX Copia e Cola</strong> ou aponte a câmera para o QR Code acima.
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-apple-offWhite border-t border-apple-border">
            <p className="text-[10px] font-bold text-apple-muted uppercase tracking-widest mb-3">Dados do Pagador</p>
            <div className="flex items-center gap-3 text-sm text-apple-black font-semibold">
              <User size={14} className="text-apple-muted" />
              <span>{charge.customers?.name} • <span className="font-mono">{charge.customers?.tax_id}</span></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4 opacity-50">
          <div className="flex items-center justify-center gap-2 text-apple-muted text-[10px] font-bold uppercase tracking-[0.2em] text-center max-w-sm">
            <ShieldCheck size={16} className="shrink-0" /> Pagamento 100% seguro por Swipy e Woovi.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;