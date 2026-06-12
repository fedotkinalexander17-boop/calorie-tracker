import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const queryClient = new QueryClient();

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn } = useClerk();
  
  if (isSignedIn) {
    return (
      <Layout>
        <Component />
      </Layout>
    );
  }
  window.location.href = "/";
  return null;
}

function AppRouter() {
  const { isSignedIn } = useClerk();
  
  // Простая маршрутизация на основе состояния авторизации
  const path = window.location.pathname;
  
  if (!isSignedIn) {
    if (path === "/sign-in") return <SignInPage />;
    if (path === "/sign-up") return <SignUpPage />;
    return <Landing />;
  }
  
  // Авторизован
  if (path === "/dashboard") return <ProtectedRoute component={Dashboard} />;
  if (path === "/log") return <ProtectedRoute component={Log} />;
  if (path === "/wellness") return <ProtectedRoute component={Wellness} />;
  if (path === "/foods") return <ProtectedRoute component={Foods} />;
  if (path === "/goals") return <ProtectedRoute component={Goals} />;
  return <ProtectedRoute component={Dashboard} />;
}

function App() {
  return (
    <LanguageProvider>
      <ClerkProvider publishableKey={clerkPubKey}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ProAccessProvider>
              <AppRouter />
              <Toaster />
            </ProAccessProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </LanguageProvider>
  );
}

export default App;