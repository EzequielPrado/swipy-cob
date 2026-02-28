"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Copy, CheckCircle2, Loader2, ShieldCheck, Landmark, Building2, User, FileText } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const Checkout = () => {
  const { id } = useParams();
  const [charge, setCharge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharge = async () => {
      const { data, error } = await supabase
        .from('charges')
        .select(`
          *, 
          customers(name, email, tax_id),
          profiles:user_id(company, full_name)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        setCharge(data);
      }
      setLoading(false);
    };

    fetchCharge();
    
    const channel = supabase
      .channel(`checkout-${id}`)
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
      Cobrança não encontrada.
    </div>
  );

  const merchantName = charge.profiles?.company || charge.profiles?.full_name || "Estabelecimento";

  if (charge.status === 'pago') return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
        <CheckCircle2 size={48} className="text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Pagamento Confirmado!</h1>
      <p className="text-zinc-400 mt-2">Obrigado {charge.customers.name}, seu pagamento para <strong>{merchantName}</strong> foi processado.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-950">S</div>
            <span className="text-xl font-bold tracking-tight">Swipy <span className="text-orange-500">Cob</span></span>
          </div>
          <p className="text-zinc-500 text-sm">Ambiente de Pagamento Seguro</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-orange-500">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Você está pagando a:</p>
            <p className="text-sm font-bold text-zinc-100">{merchantName}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
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
            <div className="bg-white p-4 rounded-2xl shadow-inner relative group">
              {charge.pix_qr_image_base64 ? (
                <img 
                  src={charge.pix_qr_image_base64} 
                  alt="QR Code PIX" 
                  className="w-[200px] h-[200px]"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-zinc-400">
                  <Loader2 className="animate-spin" />
                </div>
              )}
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={copyPix}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 text-zinc-300 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group active:scale-95"
              >
                <Copy size={18} className="group-hover:text-orange-500 transition-colors" />
                <span className="text-sm font-semibold">Copiar código PIX</span>
              </button>
              
              <div className="flex items-start gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-left">
                <Landmark size={18} className="text-orange-500 mt-0.5 shrink-0" />
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
              <span>{charge.customers.name} • {charge.customers.tax_id}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4 opacity-50">
          <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
            <ShieldCheck size={14} /> Pagamento Protegido por Swipy Cob
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;