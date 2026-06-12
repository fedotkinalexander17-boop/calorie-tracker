import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "./pages/dashboard";
import Landing from "./pages/landing";

const clerkPubKey = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';
const queryClient = new QueryClient();

function AppContent() {
  const { isSignedIn } = useClerk();
  console.log('isSignedIn:', isSignedIn);
  
  return (
    <div>
      {!isSignedIn ? <Landing /> : <Dashboard />}
    </div>
  );
}

function App() {
  console.log('App rendering with ClerkProvider and QueryClientProvider');
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;