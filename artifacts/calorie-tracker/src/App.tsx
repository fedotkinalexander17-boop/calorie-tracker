import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

function App() {
  console.log('App rendered');
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Трекер здоровья 360</h1>
      
      <SignedOut>
        <p>Вы не авторизованы</p>
        <SignInButton mode="modal">
          <button style={{ padding: '10px 20px', fontSize: '16px' }}>Войти</button>
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        <p>Добро пожаловать!</p>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}

export default App;