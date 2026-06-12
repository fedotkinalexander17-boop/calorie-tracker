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

function HomeRedirect() {
  const { isSignedIn } = useClerk();
  
  if (isSignedIn) {
    window.location.href = "/dashboard";
    return null;
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
  window.location.href = "/";
  return null;
}

function AppRouter() {
  const { isSignedIn } = useClerk();
  
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div>
            {!isSignedIn && <Landing />}
            {isSignedIn && <Dashboard />}
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ProAccessProvider>
        <AppRouter />
      </ProAccessProvider>
    </LanguageProvider>
  );
}

export default App;