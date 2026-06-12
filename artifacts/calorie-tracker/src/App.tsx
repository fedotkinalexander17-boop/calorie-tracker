import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import Dashboard from "./pages/dashboard";
import Landing from "./pages/landing";

const clerkPubKey = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';

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
  console.log('App rendering with ClerkProvider');
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AppContent />
    </ClerkProvider>
  );
}

export default App;