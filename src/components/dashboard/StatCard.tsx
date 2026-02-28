"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: number;
  label?: string;
  icon?: React.ReactNode;
}

const StatCard = ({ title, value, trend, label, icon }: StatCardProps) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-zinc-400 text-sm font-medium">{title}</span>
        <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {trend !== undefined && (
          <span className={cn(
            "text-xs font-medium flex items-center gap-0.5 mb-1",
            trend > 0 ? "text-emerald-400" : "text-orange-400"
          )}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {label && <p className="text-zinc-500 text-xs mt-2">{label}</p>}
    </div>
  );
};

export default StatCard;