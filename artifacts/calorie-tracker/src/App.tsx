import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const clerkPubKey = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';
const queryClient = new QueryClient();

function SimpleDashboard() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Трекер здоровья 360</h1>
      <p>Вы успешно авторизованы через Clerk!</p>
      <p>Сейчас мы видим упрощённую версию. Полный интерфейс будет восстановлен позже.</p>
      <button 
        onClick={() => window.location.href = '/'}
        style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
      >
        Выйти
      </button>
    </div>
  );
}

function SimpleLanding() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Трекер здоровья 360</h1>
      <p>Пожалуйста, войдите в систему</p>
      <button 
        onClick={() => window.location.href = '/sign-in'}
        style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
      >
        Войти
      </button>
    </div>
  );
}

function AppContent() {
  const { isSignedIn } = useClerk();
  console.log('isSignedIn:', isSignedIn);
  
  return (
    <div>
      {!isSignedIn ? <SimpleLanding /> : <SimpleDashboard />}
    </div>
  );
}

function App() {
  console.log('App rendering');
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;