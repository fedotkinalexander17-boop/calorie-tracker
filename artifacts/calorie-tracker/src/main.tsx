console.log('=== main.tsx loaded ===');

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY = 'pk_test_c6x1YXNhbQtc25ha2UtNjIuY2x1cmuYjNj3bVudHMuZGV2Y3A';

console.log('PUBLISHABLE_KEY exists:', !!PUBLISHABLE_KEY);

const rootElement = document.getElementById('root');
console.log('root element found:', !!rootElement);

if (rootElement) {
  console.log('Rendering app...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
} else {
  console.error('root element not found!');
}