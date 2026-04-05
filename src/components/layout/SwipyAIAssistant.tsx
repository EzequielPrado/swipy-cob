"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/integrations/supabase/auth';

export default function SwipyAIAssistant() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: `Olá, ${profile?.company || 'Lojista'}! Sou a Swipy AI, sua assistente de inteligência de negócios. Como posso te ajudar a gerenciar sua empresa hoje?` }
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Simulando a resposta da IA (Em uma implementação futura, aqui chamaremos uma Edge Function com LangChain/OpenAI)
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Ainda estou em fase de treinamento e integração com o seu banco de dados (DRE, Caixa, Estoque e RH). Em breve, poderei cruzar seus dados para entregar insights, gerar relatórios automáticos e responder perguntas complexas sobre sua operação em tempo real!' 
      }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="bg-apple-white border border-apple-border shadow-2xl rounded-[2.5rem] w-[350px] sm:w-[400px] h-[500px] max-h-[70vh] mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-apple-black p-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg leading-tight">Swipy AI</h3>
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" /> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-2 bg-white/10 rounded-full">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-apple-light/50">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm", 
                  msg.role === 'user' ? "bg-apple-white border border-apple-border text-apple-dark" : "bg-orange-500 text-white"
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
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={14} />
                </div>
                <div className="px-5 py-4 bg-white border border-apple-border rounded-3xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
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
          
          <div className="absolute right-20 top-1/2 -translate-y-1/2 bg-apple-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none shadow-lg">
            Swipy AI Copilot
          </div>
        </button>
      )}
    </div>
  );
}