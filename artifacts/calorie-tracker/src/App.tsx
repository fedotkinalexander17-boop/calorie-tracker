import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import AdminTokensPage from "@/pages/admin-tokens";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = ""; // Для Render не нужен префикс

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

function HomeRedirect() {
  const { isSignedIn } = useClerk();
  
  if (isSignedIn) {
    return <Redirect to="/dashboard" />;
  }
  return <Landing />;
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
  return <Redirect to="/" />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRouter() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/admin" component={AdminTokensPage} />
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/sign-up" component={SignUpPage} />
            <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
            <Route path="/log" component={() => <ProtectedRoute component={Log} />} />
            <Route path="/wellness" component={() => <ProtectedRoute component={Wellness} />} />
            <Route path="/foods" component={() => <ProtectedRoute component={Foods} />} />
            <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <WouterRouter base={basePath}>
        <ProAccessProvider>
          <AppRouter />
        </ProAccessProvider>
      </WouterRouter>
    </LanguageProvider>
  );
}

export default App;