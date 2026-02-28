import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./integrations/supabase/auth";
import Dashboard from "./pages/Dashboard";
import Subscriptions from "./pages/Subscriptions";
import Customers from "./pages/Customers";
import Charges from "./pages/Charges";
import ChargeDetail from "./pages/ChargeDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
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
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/assinaturas" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/cobrancas" element={<ProtectedRoute><Charges /></ProtectedRoute>} />
            <Route path="/cobrancas/:id" element={<ProtectedRoute><ChargeDetail /></ProtectedRoute>} />
            
            {/* ROTAS ADMIN */}
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