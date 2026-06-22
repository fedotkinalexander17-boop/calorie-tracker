console.log('=== main.tsx loaded ===');

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { setBaseUrl } from "@workspace/api-client-react";
import App from './App';
import './index.css';

// Устанавливаем базовый URL для API
const API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL) {
  setBaseUrl(API_URL);
  console.log('✅ API base URL set to:', API_URL);
} else {
  console.warn('⚠️ VITE_API_URL not set, using relative paths');
}

const PUBLISHABLE_KEY = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';

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