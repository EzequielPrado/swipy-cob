"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, TrendingUp, Package, Wallet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';

const SUGGESTIONS = [
  { id: 'balance', label: 'Qual meu saldo real?', icon: Wallet },
  { id: 'sales', label: 'Resumo de vendas hoje', icon: TrendingUp },
  { id: 'stock', label: 'Alertas de estoque baixo', icon: Package },
  { id: 'help', label: 'Como emitir uma NFe?', icon: AlertCircle },
];

export default function SwipyAIAssistant() {
  const { profile, effectiveUserId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: `Olá, ${profile?.company || 'Lojista'}! Sou a Swipy AI, seu braço direito na gestão. O que vamos analisar hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  // Função para a IA "pensar" e buscar dados reais no banco
  const processQuery = async (query: string) => {
    setIsTyping(true);
    const lowercaseQuery = query.toLowerCase();
    let responseText = "";

    try {
      if (lowercaseQuery.includes('saldo')) {
        const { data: accounts } = await supabase.from('bank_accounts').select('balance').eq('user_id', effectiveUserId);
        const total = accounts?.reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0;
        responseText = `Seu saldo consolidado em contas cadastradas é de R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Note que este valor não inclui sua conta digital Swipy em tempo real ainda.`;
      } 
      else if (lowercaseQuery.includes('venda') || lowercaseQuery.includes('faturamento')) {
        const today = new Date().toISOString().split('T')[0];
        const { data: sales } = await supabase.from('quotes').select('total_amount').eq('user_id', effectiveUserId).gte('created_at', today);
        const total = sales?.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) || 0;
        responseText = `Hoje você já realizou ${sales?.length || 0} vendas, totalizando R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em faturamento bruto.`;
      }
      else if (lowercaseQuery.includes('estoque') || lowercaseQuery.includes('produto')) {
        const { data: lowStock } = await supabase.from('products').select('name, stock_quantity').eq('user_id', effectiveUserId).lte('stock_quantity', 5);
        if (lowStock && lowStock.length > 0) {
          responseText = `Atenção! Identifiquei ${lowStock.length} itens com estoque crítico: ${lowStock.map(p => `${p.name} (${p.stock_quantity} un)`).join(', ')}. Sugiro repor o quanto antes.`;
        } else {
          responseText = "Seu estoque parece estar em dia! Não identifiquei nenhum produto abaixo do nível de segurança de 5 unidades.";
        }
      }
      else {
        responseText = "Entendi sua pergunta. No momento, estou aprendendo a cruzar dados complexos, mas posso te informar sobre seu saldo, faturamento do dia e alertas de estoque. Qual desses você prefere ver?";
      }
    } catch (err) {
      responseText = "Ops, tive um probleminha para consultar seus dados agora. Pode repetir a pergunta?";
    }

    // Delay para simular naturalidade
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSend = (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const finalMsg = textOverride || input.trim();
    if (!finalMsg) return;

    setMessages(prev => [...prev, { role: 'user', text: finalMsg }]);
    setInput('');
    processQuery(finalMsg);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="bg-apple-white border border-apple-border shadow-2xl rounded-[2.5rem] w-[360px] sm:w-[420px] h-[580px] max-h-[80vh] mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-apple-black p-6 flex items-center justify-between shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60} className="text-orange-500" /></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Bot size={28} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg leading-tight">Swipy AI</h3>
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" /> Analista de Negócios
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-2 bg-white/10 rounded-full relative z-10">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-apple-light/30">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3 max-w-[88%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm border", 
                  msg.role === 'user' ? "bg-white border-apple-border text-apple-dark" : "bg-orange-500 border-orange-600 text-white"
                )}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={cn(
                  "p-4 text-sm font-medium leading-relaxed shadow-sm", 
                  msg.role === 'user' 
                    ? "bg-apple-black text-white rounded-3xl rounded-tr-sm" 
                    : "bg-white border border-apple-border text-apple-black rounded-3xl rounded-tl-sm"
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm"><Bot size={14} /></div>
                <div className="px-5 py-4 bg-white border border-apple-border rounded-3xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {!isTyping && messages.length === 1 && (
               <div className="grid grid-cols-1 gap-2 pt-4">
                  <p className="text-[10px] font-black text-apple-muted uppercase tracking-widest ml-1 mb-1">Perguntas Sugeridas</p>
                  {SUGGESTIONS.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => handleSend(undefined, s.label)}
                      className="flex items-center gap-3 p-3 bg-white border border-apple-border rounded-2xl text-left text-xs font-bold text-apple-dark hover:border-orange-500 hover:bg-orange-50 transition-all shadow-sm"
                    >
                      <s.icon size={14} className="text-orange-500" />
                      {s.label}
                    </button>
                  ))}
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-5 bg-apple-white border-t border-apple-border shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre seus dados..." 
                className="w-full bg-apple-offWhite border border-apple-border rounded-[1.5rem] pl-5 pr-14 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-apple-black"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="absolute right-2 w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-all disabled:opacity-50 shadow-md active:scale-95"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-apple-black hover:bg-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-4 border-apple-light relative group"
        >
          <Sparkles size={24} className="text-orange-500" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-apple-light"></span>
          </span>
        </button>
      )}
    </div>
  );
}