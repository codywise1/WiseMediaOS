import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ToastProvider } from './contexts/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NavigationProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </NavigationProvider>
    </AuthProvider>
  </StrictMode>
);
