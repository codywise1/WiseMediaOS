import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </AuthProvider>
  </StrictMode>
);
