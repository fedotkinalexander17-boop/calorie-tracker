console.log('=== main.tsx loaded ===');

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

// ПРАВИЛЬНЫЙ КЛЮЧ ИЗ CLERK DASHBOARD
const PUBLISHABLE_KEY = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';

console.log('PUBLISHABLE_KEY exists:', !!PUBLISHABLE_KEY);
console.log('PUBLISHABLE_KEY value:', PUBLISHABLE_KEY);

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