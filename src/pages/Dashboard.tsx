"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import { DollarSign, UserCheck, AlertCircle, BarChart3, TrendingUp } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const data = [
  { name: 'Jan', value: 45000 },
  { name: 'Fev', value: 52000 },
  { name: 'Mar', value: 48000 },
  { name: 'Abr', value: 61000 },
  { name: 'Mai', value: 55000 },
  { name: 'Jun', value: 67000 },
];

const recentCharges = [
  { id: '1', client: 'Tech Solutions LTDA', value: 'R$ 1.250,00', status: 'pago', date: 'Hoje' },
  { id: '2', client: 'Ana Paula Silva', value: 'R$ 450,00', status: 'atrasado', date: 'Há 2 dias' },
  { id: '3', client: 'Global Connect', value: 'R$ 8.900,00', status: 'pendente', date: 'Amanhã' },
  { id: '4', client: 'Studio Design', value: 'R$ 320,00', status: 'pago', date: 'Ontem' },
];

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-zinc-400 mt-1">Bem-vindo de volta! Aqui está o resumo da sua operação hoje.</p>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <TrendingUp size={18} />
            Ver Relatório Completo
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Receita Mensal (MRR)" 
            value="R$ 67.450,00" 
            trend={12.5} 
            icon={<DollarSign className="text-emerald-500" size={18} />} 
          />
          <StatCard 
            title="Assinaturas Ativas" 
            value="1.284" 
            trend={4.2} 
            icon={<UserCheck className="text-blue-500" size={18} />} 
          />
          <StatCard 
            title="Em Aberto" 
            value="R$ 12.310,00" 
            label="14 faturas pendentes"
            icon={<BarChart3 className="text-orange-500" size={18} />} 
          />
          <StatCard 
            title="Inadimplência" 
            value="3.2%" 
            trend={-1.5} 
            icon={<AlertCircle className="text-red-500" size={18} />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-semibold text-zinc-200">Evolução de Faturamento</h3>
              <select className="bg-zinc-800 border-none text-xs rounded-md px-2 py-1 outline-none text-zinc-400">
                <option>Últimos 6 meses</option>
                <option>Último ano</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-zinc-200 mb-6">Últimas Atividades</h3>
            <div className="space-y-6">
              {recentCharges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      charge.status === 'pago' ? "bg-emerald-500/10 text-emerald-500" : 
                      charge.status === 'atrasado' ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {charge.status === 'pago' ? <DollarSign size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-zinc-200 truncate">{charge.client}</p>
                      <p className="text-xs text-zinc-500">{charge.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-100">{charge.value}</p>
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-bold",
                      charge.status === 'pago' ? "text-emerald-500" : 
                      charge.status === 'atrasado' ? "text-red-500" : "text-orange-500"
                    )}>
                      {charge.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-colors">
              Ver todas
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;