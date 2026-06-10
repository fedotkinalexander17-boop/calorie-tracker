import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

// ВРЕМЕННО: ключ прямо в коде (только для теста!)
const PUBLISHABLE_KEY = 'pk_test_c6x1YXNhbQtc25ha2UtNjIuY2x1cmuYjNj3bVudHMuZGV2Y3A';

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);