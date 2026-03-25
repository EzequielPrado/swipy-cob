import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./integrations/supabase/auth";

// Novas Páginas e Placeholders
import OverviewDashboard from "./pages/OverviewDashboard";
import ComingSoon from "./pages/ComingSoon";

// Módulos ERP (Fase 2)
import Products from "./pages/inventory/Products";

// Módulos Antigos (Agora em Financeiro/Cadastros)
import Dashboard from "./pages/Dashboard";
import Subscriptions from "./pages/Subscriptions";
import Customers from "./pages/Customers";
import Charges from "./pages/Charges";
import ChargeDetail from "./pages/ChargeDetail";
import Settings from "./pages/Settings";

// Auth e Públicos
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";

// Admin
import UserManagement from "./pages/admin/UserManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import GlobalAutomation from "./pages/admin/GlobalAutomation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            
            <Route path="/pagar/:id" element={<Checkout />} />
            <Route path="/meu-painel" element={<ClientPortal />} />
            
            {/* VISÃO GERAL (NOVO HOME) */}
            <Route path="/" element={<ProtectedRoute><OverviewDashboard /></ProtectedRoute>} />
            
            {/* ESTOQUE E PRODUTOS */}
            <Route path="/estoque/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            
            {/* MÓDULOS EM BREVE */}
            <Route path="/vendas/*" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="/estoque/movimentacoes" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="/rh/*" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="/financeiro/pagar" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="/financeiro/bancos" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="/financeiro/fiscal" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />

            {/* FINANCEIRO (ANTIGO HOME) */}
            <Route path="/financeiro/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/financeiro/cobrancas" element={<ProtectedRoute><Charges /></ProtectedRoute>} />
            <Route path="/financeiro/cobrancas/:id" element={<ProtectedRoute><ChargeDetail /></ProtectedRoute>} />
            <Route path="/financeiro/assinaturas" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
            
            {/* CADASTROS E CONFIG */}
            <Route path="/clientes" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* ADMIN */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/automacao" element={<ProtectedRoute><GlobalAutomation /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;