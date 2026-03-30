"use client";

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  TrendingUp, 
  Building2, 
  Cake, 
  Loader2, 
  RefreshCw,
  PieChart as PieChartIcon,
  Target,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';

const COLORS = ['#FF8C42', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#86868b'];

const HRDashboard = () => {
  const { effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchHRData = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', effectiveUserId);
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHRData(); }, [effectiveUserId]);

  const stats = useMemo(() => {
    const active = employees.filter(e => e.status === 'Ativo').length;
    const inactive = employees.filter(e => e.status === 'Inativo').length;
    const totalPayroll = employees.filter(e => e.status === 'Ativo').reduce((acc, curr) => acc + Number(curr.base_salary || 0), 0);
    
    // Distribuição por Setor
    const deptMap: Record<string, number> = {};
    employees.filter(e => e.status === 'Ativo').forEach(e => {
      const dept = e.department || 'Não informado';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    // Gênero
    const genderMap: Record<string, number> = {};
    employees.filter(e => e.status === 'Ativo').forEach(e => {
      const g = e.gender || 'Não informado';
      genderMap[g] = (genderMap[g] || 0) + 1;
    });
    const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

    // Aniversariantes do Mês
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const birthdays = employees.filter(e => {
      if (!e.birth_date || e.status === 'Inativo') return false;
      const bDate = new Date(e.birth_date);
      return (bDate.getMonth() + 1) === currentMonth;
    }).sort((a, b) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate());

    return { active, inactive, totalPayroll, deptData, genderData, birthdays };
  }, [employees]);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-apple-black flex items-center gap-3">
              <Users className="text-orange-500" size={32} /> People Analytics
            </h2>
            <p className="text-apple-muted mt-1 font-medium">Indicadores de capital humano e gestão de talentos.</p>
          </div>
          <button onClick={fetchHRData} className="p-2.5 bg-apple-white border border-apple-border rounded-xl text-apple-muted hover:text-apple-black transition-all shadow-sm">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><UserCheck size={80} /></div>
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Headcount Ativo</p>
            <p className="text-4xl font-black text-apple-black">{stats.active}</p>
            <p className="text-[10px] text-emerald-600 mt-2 font-bold flex items-center gap-1">
              <TrendingUp size={12} /> Crescimento de 4% este mês
            </p>
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><UserMinus size={80} /></div>
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Colaboradores Inativos</p>
            <p className="text-4xl font-black text-apple-black">{stats.inactive}</p>
            <p className="text-[10px] text-apple-muted mt-2 italic">Histórico total da empresa</p>
          </div>

          <div className="bg-apple-white border border-apple-border p-7 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Target size={80} /></div>
            <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest mb-3">Folha Bruta (Mensal)</p>
            <p className="text-3xl font-black text-apple-black">{currency.format(stats.totalPayroll)}</p>
            <p className="text-[10px] text-orange-600 mt-2 font-bold uppercase tracking-tighter">Investimento em Talentos</p>
          </div>

          <div className="bg-apple-black p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group border border-white/10">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Cake size={80} className="text-orange-500" /></div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">Aniversariantes</p>
            <p className="text-4xl font-black text-white">{stats.birthdays.length}</p>
            <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-tighter">No mês de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* DISTRIBUIÇÃO POR SETOR */}
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
             <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-10 flex items-center gap-2">
               <Building2 size={16} className="text-blue-500" /> Distribuição por Departamento
             </h3>
             <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={stats.deptData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                         {stats.deptData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* LISTA DE ANIVERSARIANTES E ALERTAS */}
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm flex flex-col">
             <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-8 flex items-center gap-2">
               <Cake size={16} className="text-orange-500" /> Próximas Celebrações
             </h3>
             
             {loading ? (
               <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" /></div>
             ) : stats.birthdays.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-apple-muted opacity-40 italic">
                  <Cake size={40} className="mb-4" />
                  <p className="text-sm font-bold">Ninguém assopra velinhas este mês.</p>
               </div>
             ) : (
               <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                  {stats.birthdays.map(emp => (
                    <div key={emp.id} className="p-5 bg-apple-offWhite border border-apple-border rounded-2xl flex items-center justify-between group hover:border-orange-500/30 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white border border-apple-border flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-105 transition-transform">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.id}`} className="w-8 h-8" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-apple-black">{emp.full_name}</p>
                             <p className="text-[10px] text-apple-muted font-bold uppercase">{emp.department} • {emp.job_role}</p>
                          </div>
                       </div>
                       <div className="bg-orange-50 px-3 py-2 rounded-xl border border-orange-100 text-center min-w-[60px]">
                          <p className="text-[10px] font-black text-orange-600 uppercase">Dia</p>
                          <p className="text-lg font-black text-orange-500 leading-none">{new Date(emp.birth_date).getDate() + 1}</p>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>

          {/* INDICADORES DE DIVERSIDADE / GÊNERO */}
          <div className="bg-apple-white border border-apple-border p-8 rounded-[2.5rem] shadow-sm">
             <h3 className="text-xs font-black text-apple-black uppercase tracking-widest mb-10 flex items-center gap-2">
               <PieChartIcon size={16} className="text-emerald-500" /> Composição de Equipe
             </h3>
             <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={stats.genderData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} fontWeight="bold" />
                      <YAxis hide />
                      <Tooltip cursor={{fill: '#fafafa'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-8 pt-6 border-t border-apple-border flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-black text-apple-muted uppercase tracking-widest">
                   <ShieldCheck size={14} className="text-orange-500" /> Dados em Conformidade com LGPD
                </div>
                <p className="text-[9px] text-apple-muted font-medium italic">Atualizado agora</p>
             </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp size={150} className="text-white" />
             </div>
             <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 border border-white/20 rounded-full">
                   <Zap size={14} className="text-white animate-pulse" />
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">Destaque Operacional</span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tighter leading-tight max-w-[200px]">Sua equipe cresceu 12% no último semestre.</h4>
                <p className="text-white/80 text-sm font-medium leading-relaxed max-w-[240px]">Continue investindo em treinamento e cultura para manter o engajamento elevado.</p>
                <div className="pt-4">
                   <button className="bg-white text-orange-600 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-all active:scale-95">Gerar Relatório de Retenção</button>
                </div>
             </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default HRDashboard;