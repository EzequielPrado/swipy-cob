import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./integrations/supabase/auth";
import { ThemeProvider } from "./components/ThemeProvider";

import OverviewDashboard from "./pages/OverviewDashboard";
import AccountantDashboard from "./pages/AccountantDashboard"; 
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Checkout from "./pages/Checkout";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";

// Vendas
import Quotes from "./pages/sales/Quotes";
import QuoteBuilder from "./pages/sales/QuoteBuilder";
import QuotePublicView from "./pages/QuotePublicView";
import POS from "./pages/sales/POS";
import SalesList from "./pages/sales/SalesList";
import SalesDashboard from "./pages/sales/SalesDashboard";
import ServiceOrders from "./pages/sales/ServiceOrders";

// Estoque
import Products from "./pages/inventory/Products";
import Movements from "./pages/inventory/Movements";
import Shipping from "./pages/inventory/Shipping";

// Indústria
import Production from "./pages/industry/Production";

// Financeiro
import Dashboard from "./pages/Dashboard";
import Subscriptions from "./pages/Subscriptions";
import Charges from "./pages/Charges";
import ChargeDetail from "./pages/ChargeDetail";
import BankAccounts from "./pages/financial/BankAccounts";
import Expenses from "./pages/financial/Expenses";
import SwipyAccount from "./pages/financial/SwipyAccount";
import Fiscal from "./pages/financial/Fiscal";
import DRE from "./pages/financial/DRE";
import FinancialCalendar from "./pages/financial/FinancialCalendar";
import PerformanceReport from "./pages/financial/PerformanceReport";

// RH
import Employees from "./pages/hr/Employees";
import Payroll from "./pages/hr/Payroll";

// Cadastros
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Settings from "./pages/Settings";

// Admin
import UserManagement from "./pages/admin/UserManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import GlobalAutomation from "./pages/admin/GlobalAutomation";
import PlanManagement from "./pages/admin/PlanManagement";
import GlobalCRM from "./pages/admin/GlobalCRM";
import AuditLogs from "./pages/admin/AuditLogs";
import Benchmarks from "./pages/admin/Benchmarks";
import BroadcastCenter from "./pages/admin/BroadcastCenter";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Register />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/resetar-senha" element={<ResetPassword />} />
              
              <Route path="/pagar/:id" element={<Checkout />} />
              <Route path="/regularizar" element={<ClientPortal />} />
              <Route path="/orcamento/:id" element={<QuotePublicView />} />
              
              <Route path="/" element={<ProtectedRoute><OverviewDashboard /></ProtectedRoute>} />
              <Route path="/contador" element={<ProtectedRoute><AccountantDashboard /></ProtectedRoute>} />

              {/* VENDAS */}
              <Route path="/vendas/orcamentos" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
              <Route path="/vendas/orcamentos/novo" element={<ProtectedRoute><QuoteBuilder /></ProtectedRoute>} />
              <Route path="/vendas/orcamentos/:id/editar" element={<ProtectedRoute><QuoteBuilder /></ProtectedRoute>} />
              <Route path="/vendas/ordens-servico" element={<ProtectedRoute><ServiceOrders /></ProtectedRoute>} />
              <Route path="/vendas/dashboard" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
              <Route path="/vendas/lista" element={<ProtectedRoute><SalesList /></ProtectedRoute>} />
              <Route path="/vendas/pdv" element={<ProtectedRoute><POS /></ProtectedRoute>} />

              {/* ESTOQUE */}
              <Route path="/estoque/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/estoque/movimentacoes" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
              <Route path="/estoque/expedicao" element={<ProtectedRoute><Shipping /></ProtectedRoute>} />
              <Route path="/industria/producao" element={<ProtectedRoute><Production /></ProtectedRoute>} />

              {/* FINANCEIRO */}
              <Route path="/financeiro/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/financeiro/calendario" element={<ProtectedRoute><FinancialCalendar /></ProtectedRoute>} />
              <Route path="/financeiro/performance" element={<ProtectedRoute><PerformanceReport /></ProtectedRoute>} />
              <Route path="/financeiro/cobrancas" element={<ProtectedRoute><Charges /></ProtectedRoute>} />
              <Route path="/financeiro/cobrancas/:id" element={<ProtectedRoute><ChargeDetail /></ProtectedRoute>} />
              <Route path="/financeiro/assinaturas" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
              <Route path="/financeiro/bancos" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
              <Route path="/financeiro/pagar" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/financeiro/fiscal" element={<ProtectedRoute><Fiscal /></ProtectedRoute>} />
              <Route path="/financeiro/dre" element={<ProtectedRoute><DRE /></ProtectedRoute>} />
              <Route path="/conta-swipy" element={<ProtectedRoute><SwipyAccount /></ProtectedRoute>} />

              {/* RH */}
              <Route path="/rh/colaboradores" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
              <Route path="/rh/folha" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />

              {/* CADASTROS */}
              <Route path="/clientes" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/clientes/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/fornecedores/:id" element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* ADMIN */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/admin/automacao" element={<ProtectedRoute><GlobalAutomation /></ProtectedRoute>} />
              <Route path="/admin/planos" element={<ProtectedRoute><PlanManagement /></ProtectedRoute>} />
              <Route path="/admin/crm" element={<ProtectedRoute><GlobalCRM /></ProtectedRoute>} />
              <Route path="/admin/comunicacao" element={<ProtectedRoute><BroadcastCenter /></ProtectedRoute>} />
              <Route path="/admin/auditoria" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
              <Route path="/admin/benchmarks" element={<ProtectedRoute><Benchmarks /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;