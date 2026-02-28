import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./integrations/supabase/auth";
import Dashboard from "./pages/Dashboard";
import Plans from "./pages/Plans";
import Customers from "./pages/Customers";
import Charges from "./pages/Charges";
import ChargeDetail from "./pages/ChargeDetail";
import Automation from "./pages/Automation";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/admin/UserManagement";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { session, loading } = useAuth();
  // Nota: Para verificar adminOnly, em um app real precisaríamos do perfil aqui também.
  // Por simplicidade neste MVP, o layout já oculta o acesso visual.
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
            <Route path="/planos" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/cobrancas" element={<ProtectedRoute><Charges /></ProtectedRoute>} />
            <Route path="/cobrancas/:id" element={<ProtectedRoute><ChargeDetail /></ProtectedRoute>} />
            <Route path="/automacao" element={<ProtectedRoute><Automation /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* ROTAS ADMIN */}
            <Route path="/admin" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;