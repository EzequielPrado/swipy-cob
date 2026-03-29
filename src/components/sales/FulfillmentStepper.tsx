"use client";

import React from 'react';
import { CheckCircle2, Banknote, Wrench, PackageSearch, Receipt, Truck } from 'lucide-react';
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 'approved', label: 'Aprovado', icon: CheckCircle2 },
  { id: 'paid', label: 'Pago', icon: Banknote },
  { id: 'production', label: 'Produção', icon: Wrench },
  { id: 'picking', label: 'Separação', icon: PackageSearch },
  { id: 'invoiced', label: 'Faturado', icon: Receipt },
  { id: 'shipped', label: 'Enviado', icon: Truck },
];

interface FulfillmentStepperProps {
  currentStatus: string;
}

const FulfillmentStepper = ({ currentStatus }: FulfillmentStepperProps) => {
  // Encontrar o índice do status atual para saber até onde pintar de laranja
  const currentIndex = STAGES.findIndex(s => s.id === currentStatus);
  // Casos especiais de status que não estão no fluxo padrão (ex: draft, completed)
  const isCompleted = currentStatus === 'completed' || currentStatus === 'shipped';
  const displayIndex = currentStatus === 'completed' ? 1 : currentIndex;

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Linha de fundo */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-0.5 bg-apple-border -z-10" />
        
        {STAGES.map((stage, idx) => {
          const isActive = idx <= displayIndex || (isCompleted && idx <= STAGES.length - 1);
          const isCurrent = idx === displayIndex;
          
          return (
            <div key={stage.id} className="flex flex-col items-center gap-2 bg-apple-white px-2">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm",
                isActive ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-apple-border text-apple-muted",
                isCurrent && "ring-4 ring-orange-500/20 animate-pulse"
              )}>
                <stage.icon size={18} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter",
                isActive ? "text-orange-600" : "text-apple-muted"
              )}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FulfillmentStepper;