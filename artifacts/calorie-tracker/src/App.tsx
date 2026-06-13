import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { LanguageProvider } from "@/lib/i18n";
import { ProAccessProvider } from "@/lib/pro-access";
import Dashboard from "@/pages/dashboard";
import Foods from "@/pages/foods";
import Log from "@/pages/log";
import Goals from "@/pages/goals";
import Wellness from "@/pages/wellness";
import Landing from "@/pages/landing";

const clerkPubKey = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useClerk();
  
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isSignedIn } = useClerk();
  
  return (
    <Routes>
      <Route path="/" element={!isSignedIn ? <Landing /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/log" element={<ProtectedRoute><Log /></ProtectedRoute>} />
      <Route path="/foods" element={<ProtectedRoute><Foods /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/wellness" element={<ProtectedRoute><Wellness /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  console.log('App rendering with full interface');
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <ProAccessProvider>
              <BrowserRouter>
                <AppRoutes />
                <Toaster />
              </BrowserRouter>
            </ProAccessProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;