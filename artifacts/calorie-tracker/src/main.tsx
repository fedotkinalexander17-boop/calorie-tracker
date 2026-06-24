console.log('=== main.tsx loaded ===');

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { setBaseUrl } from "@workspace/api-client-react";
import App from './App';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL) {
  setBaseUrl(API_URL);
  console.log('✅ API base URL set to:', API_URL);
}

const PUBLISHABLE_KEY = 'pk_test_cGxlYXNhbnQtc25ha2UtNjUuY2xlcmsuYWNjb3VudHMuZGV2JA';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}