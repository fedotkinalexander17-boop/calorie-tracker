import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Временно без Clerk для проверки
console.log('main.tsx loaded');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);