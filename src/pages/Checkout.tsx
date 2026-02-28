"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { Copy, CheckCircle2, Loader2, ShieldCheck, Landmark } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const Checkout = () => {
  const { id } = useParams();
  const [charge, setCharge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharge = async () => {
      // Busca pública (sem necessidade de login)
      const { data, error } = await supabase
        .from('charges')
        .select('*, customers(name, email, tax_id)')
        .eq('id', id)
        .single();

      if (!error && data) {
        setCharge(data);
      }
      setLoading(false);
    };

    fetchCharge();
    
    // Opcional: Escutar mudanças no banco via Realtime para atualizar se foi pago
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'charges', filter: `id=eq.${id}` }, 
        (payload) => {
          if (payload.new.status === 'pago') {
            setCharge(prev => ({ ...prev, status: 'pago' }));
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const copyPix = () => {
    if (charge?.pix_qr_code) {
      navigator.clipboard.writeText(charge.pix_qr_code);
      showSuccess("Código PIX copiado!");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  if (!charge) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      Cobrança não encontrada ou expirada.
    </div>
  );

  if (charge.status === 'pago') return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={48} className="text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Pagamento Confirmado!</h1>
      <p className="text-zinc-400 mt-2">Obrigado, seu pagamento foi processado com sucesso.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header da Empresa */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-950">S</div>
            <span className="text-xl font-bold tracking-tight">swipy <span className="text-orange-500">cob</span></span>
          </div>
          <p className="text-zinc-500 text-sm">Checkout Seguro</p>
        </div>

        {/* Card de Pagamento */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800 text-center">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total a pagar</p>
            <h2 className="text-4xl font-bold text-zinc-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.amount)}
            </h2>
          </div>

          <div className="p-8 flex flex-col items-center gap-8">
            <div className="bg-white p-4 rounded-2xl shadow-inner">
              {charge.pix_qr_code ? (
                <QRCodeSVG value={charge.pix_qr_code} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <Loader2 className="animate-spin" />
                </div>
              )}
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={copyPix}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 text-zinc-300 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group"
              >
                <Copy size={18} className="group-hover:text-orange-500" />
                <span className="text-sm font-semibold">Copiar código PIX</span>
              </button>
              
              <div className="flex items-start gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <Landmark size={18} className="text-orange-500 mt-0.5" />
                <div className="text-xs text-zinc-500 leading-relaxed">
                  <p className="font-bold text-zinc-300 mb-1 uppercase tracking-wider">Como pagar?</p>
                  1. Abra o app do seu banco.<br />
                  2. Escolha pagar via PIX (QR Code ou Copia e Cola).<br />
                  3. A confirmação é instantânea.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Seguro */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
            <ShieldCheck size={14} /> Ambiente Seguro & Criptografado
          </div>
          <div className="text-zinc-700 text-[10px]">
            Pagamento processado por Swipy Cob Tecnologia
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;