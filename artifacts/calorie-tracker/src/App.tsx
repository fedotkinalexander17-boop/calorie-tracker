import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Трекер здоровья 360</h1>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Войти
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <SignedIn>
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Добро пожаловать в Трекер здоровья 360!
            </h2>
            <p className="text-gray-600">
              Здесь будут отображаться ваши ежедневные логи, аналитика и рекомендации.
            </p>
          </div>
        </SignedIn>
        
        <SignedOut>
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ваш персональный трекер здоровья
            </h2>
            <p className="text-gray-600 mb-8">
              Войдите или зарегистрируйтесь, чтобы начать отслеживать своё здоровье.
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg">
                Начать
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}

export default App;