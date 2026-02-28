"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Send, AlertCircle, RefreshCcw, Landmark, CreditCard as CardIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

const timeline = [
  { status: 'Cobrança Criada', date: '10 Out, 2023 - 09:15', icon: CheckCircle2, active: true },
  { status: 'Enviada por E-mail', date: '10 Out, 2023 - 09:16', icon: Send, active: true },
  { status: 'Lembrete D-2 Enviado (WhatsApp)', date: '11 Out, 2023 - 10:00', icon: Send, active: true },
  { status: 'Atraso Identificado', date: '13 Out, 2023 - 00:01', icon: AlertCircle, active: true, color: 'text-red-400' },
  { status: 'Tentativa de Renegociação', date: '14 Out, 2023 - 14:30', icon: RefreshCcw, active: false },
];

const ChargeDetail = () => {
  const { id } = useParams();

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Link to="/cobrancas" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Detalhes da Fatura {id}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-zinc-500 text-sm">Cliente: <span className="text-zinc-300 font-medium">Ana Paula Silva</span></span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
              <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Atrasado</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <div className="flex justify-between border-b border-zinc-800 pb-8 mb-8">
                <div>
                  <p className="text-zinc-500 text-sm mb-1">Valor da Fatura</p>
                  <h3 className="text-4xl font-bold text-emerald-400">R$ 450,00</h3>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-sm mb-1">Vencimento Original</p>
                  <p className="text-xl font-semibold text-zinc-100">12 de Outubro, 2023</p>
                  <p className="text-red-400 text-xs mt-1">Atrasado há 3 dias</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">Informações de Pagamento</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Landmark size={18}/></div>
                      <div>
                        <p className="text-sm font-medium">Boleto Bancário</p>
                        <p className="text-xs text-zinc-500">Banco Inter (077)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><CardIcon size={18}/></div>
                      <div>
                        <p className="text-sm font-medium">Assinatura Vinculada</p>
                        <p className="text-xs text-zinc-500">Plano Starter Mensal</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">Ações Administrativas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bg-emerald-500 text-zinc-950 text-xs font-bold py-2 rounded hover:bg-emerald-600 transition-all">Baixar PDF</button>
                    <button className="bg-zinc-700 text-zinc-200 text-xs font-bold py-2 rounded hover:bg-zinc-600 transition-all">Reenviar E-mail</button>
                    <button className="col-span-2 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2 rounded hover:bg-emerald-500/10 transition-all">Marcar como Pago Manual</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                <RefreshCcw size={18} className="text-emerald-500" /> Histórico de Tentativas de Débito
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-sm text-zinc-300">Cartão Final 4432 (Recusado)</span>
                  </div>
                  <span className="text-xs text-zinc-500">12/10/2023 - 09:00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-800/30 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-zinc-500" />
                    <span className="text-sm text-zinc-300">Boleto Gerado</span>
                  </div>
                  <span className="text-xs text-zinc-500">13/10/2023 - 10:45</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 h-fit">
            <h3 className="font-semibold text-zinc-200 mb-8">Linha do Tempo</h3>
            <div className="relative space-y-8">
              {timeline.map((item, index) => (
                <div key={index} className="flex gap-4 relative">
                  {index !== timeline.length - 1 && (
                    <div className={cn(
                      "absolute left-[11px] top-6 w-0.5 h-12",
                      item.active ? "bg-emerald-500/30" : "bg-zinc-800"
                    )} />
                  )}
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10",
                    item.active ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                  )}>
                    <item.icon size={14} className={item.color} />
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      item.active ? "text-zinc-200" : "text-zinc-500",
                      item.color
                    )}>{item.status}</p>
                    <p className="text-xs text-zinc-600 mt-1">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-10 bg-orange-500/10 border border-orange-500/30 text-orange-400 py-3 rounded-xl font-semibold hover:bg-orange-500/20 transition-all">
              Abrir Negociação
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChargeDetail;