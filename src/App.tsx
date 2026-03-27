import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./integrations/supabase/auth";

// Visão Geral e Placeholders
import OverviewDashboard from "./pages/OverviewDashboard";
import ComingSoon from "./pages/ComingSoon";

// Vendas / Orçamentos / PDV / Gestão
import Quotes from "./pages/sales/Quotes";
import QuoteBuilder from "./pages/sales/QuoteBuilder";
import QuotePublicView from "./pages/QuotePublicView";
import POS from "./pages/sales/POS";
import SalesList from "./pages/sales/SalesList";
import SalesDashboard from "./pages/sales/SalesDashboard";

// Estoque
import Products from "./pages/inventory/Products";
import Movements from "./pages/inventory/Movements";

// Indústria
import Production from "./pages/industry/Production";

// Financeiro e Conta Digital
import Dashboard from "./pages/Dashboard";
import Subscriptions from "./pages/Subscriptions";
import Charges from "./pages/Charges";
import ChargeDetail from "./pages/ChargeDetail";
import BankAccounts from "./pages/financial/BankAccounts";
import Expenses from "./pages/financial/Expenses";
import SwipyAccount from "./pages/financial/SwipyAccount";
import Fiscal from "./pages/financial/Fiscal";

// RH / Gente e Gestão
import Employees from "./pages/hr/Employees";
import Payroll from "./pages/hr/Payroll";

// Cadastros e Configurações
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Suppliers from "./pages/Suppliers";
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
            
            {/* PÚBLICAS */}
            <Route path="/pagar/:id" element={<Checkout />} />
            <Route path="/meu-painel" element={<ClientPortal />} />
            <Route path="/orcamento/:id" element={<QuotePublicView />} />
            
            {/* VISÃO GERAL */}
            <Route path="/" element={<ProtectedRoute><OverviewDashboard /></ProtectedRoute>} />
            
            {/* VENDAS */}
            <Route path="/vendas/orcamentos" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
            <Route path="/vendas/orcamentos/novo" element={<ProtectedRoute><QuoteBuilder /></ProtectedRoute>} />
            <Route path="/vendas/orcamentos/:id/editar" element={<ProtectedRoute><QuoteBuilder /></ProtectedRoute>} />
            
            <Route path="/vendas/dashboard" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            <Route path="/vendas/lista" element={<ProtectedRoute><SalesList /></ProtectedRoute>} />
            <Route path="/vendas/pdv" element={<ProtectedRoute><POS /></ProtectedRoute>} />

            {/* ESTOQUE E PRODUTOS */}
            <Route path="/estoque/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/estoque/movimentacoes" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
            
            {/* INDÚSTRIA */}
            <Route path="/industria/producao" element={<ProtectedRoute><Production /></ProtectedRoute>} />

            {/* RH */}
            <Route path="/rh/metas" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="/rh/colaboradores" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/rh/folha" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />

            {/* FINANCEIRO E CONTA DIGITAL */}
            <Route path="/financeiro/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/financeiro/cobrancas" element={<ProtectedRoute><Charges /></ProtectedRoute>} />
            <Route path="/financeiro/cobrancas/:id" element={<ProtectedRoute><ChargeDetail /></ProtectedRoute>} />
            <Route path="/financeiro/assinaturas" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
            <Route path="/financeiro/bancos" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
            <Route path="/financeiro/pagar" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/financeiro/fiscal" element={<ProtectedRoute><Fiscal /></ProtectedRoute>} />
            
            <Route path="/conta-swipy" element={<ProtectedRoute><SwipyAccount /></ProtectedRoute>} />
            
            {/* CADASTROS E CONFIG */}
            <Route path="/clientes" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
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