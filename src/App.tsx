import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import Invoices from './components/Invoices';
import Appointments from './components/Appointments';
import Proposals from './components/Proposals';
import Login from './components/Login';
import { authService, isSupabaseAvailable } from './lib/supabase';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
  id?: string;
  title?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  github?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
  bio?: string;
  industry?: string;
  companySize?: string;
  budget?: string;
  referralSource?: string;
  notes?: string;
  avatar?: string;
  phone?: string;
  company?: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseAvailable()) {
      // Auto-login as admin for development
      const devUser: User = {
        id: 'dev-admin-id',
        email: 'icodywise@gmail.com',
        role: 'admin',
        name: 'Cody Wise (Dev)',
        phone: '+1 (555) 123-4567',
        company: 'Wise Media',
        avatar: 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'
      };
      setCurrentUser(devUser);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    // Check for existing session on app load
    checkAuthState();

    // Listen for auth state changes only if Supabase is available
    let subscription: any = null;
    if (isSupabaseAvailable()) {
      const { data: { subscription: sub } } = authService.onAuthStateChange((user) => {
        if (user) {
          const userData: User = {
            id: user.id,
            email: user.email || '',
            role: user.user_metadata?.role || 'user',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
          };
          setCurrentUser(userData);
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      });
      subscription = sub;
    } else {
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const checkAuthState = async () => {
    if (!isSupabaseAvailable()) {
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      if (user) {
        const userData: User = {
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'user',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        };
        setCurrentUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    if (!isSupabaseAvailable()) {
      // Demo mode authentication
      console.log('Demo mode login attempt:', { email, password });
      
      if (email.toLowerCase() === 'admin' && password === 'admin') {
        const userData: User = {
          id: 'admin-demo-id',
          email: 'admin@wisemedia.io',
          role: 'admin',
          name: 'Demo Admin',
          phone: '+1 (555) 123-4567',
          company: 'Wise Media',
          avatar: 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'
        };
        setCurrentUser(userData);
        setIsAuthenticated(true);
        console.log('Admin login successful');
        return true;
      } else if (email.toLowerCase() === 'user' && password === 'user') {
        const userData: User = {
          id: 'user-demo-id',
          email: 'user@wisemedia.io',
          role: 'user',
          name: 'Demo Client',
          phone: '+1 (555) 987-6543',
          company: 'Client Corp',
          avatar: 'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'
        };
        setCurrentUser(userData);
        setIsAuthenticated(true);
        console.log('User login successful');
        return true;
      } else {
        console.log('Invalid demo credentials');
        throw new Error('Invalid credentials. Use admin/admin for admin access or user/user for client access.');
      }
    } else {
      try {
        const { user } = await authService.signIn(email, password);
        if (user) {
          const userData: User = {
            id: user.id,
            email: user.email || '',
            role: user.user_metadata?.role || 'user',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            phone: user.user_metadata?.phone,
            company: user.user_metadata?.company,
            avatar: user.user_metadata?.avatar
          };
          setCurrentUser(userData);
          setIsAuthenticated(true);
          return true;
        }
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    }
    return false;
  };

  const handleUpdateProfile = (userData: Partial<User>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      setCurrentUser(updatedUser);
      
      // In a real app, you'd also update the backend
      console.log('Profile updated:', updatedUser);
    }
  };
  const handleLogout = async () => {
    if (isSupabaseAvailable()) {
      try {
        await authService.signOut();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    
    // Clear user from localStorage
    localStorage.removeItem('wise_media_current_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card neon-glow rounded-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3aa3eb]"></div>
            <div>
              <p className="text-white font-medium">Loading Wise Media Portal...</p>
              <p className="text-gray-400 text-sm">
                {isSupabaseAvailable() ? 'Connecting to database...' : 'Initializing demo mode...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout currentUser={currentUser} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile}>
        <Routes>
          <Route path="/" element={<Dashboard currentUser={currentUser} />} />
          <Route path="/clients" element={<Clients currentUser={currentUser} />} />
          <Route path="/projects" element={<Projects currentUser={currentUser} />} />
          <Route path="/projects/:id" element={<ProjectDetail currentUser={currentUser} />} />
          <Route path="/invoices" element={<Invoices currentUser={currentUser} />} />
          <Route path="/appointments" element={<Appointments currentUser={currentUser} />} />
          <Route path="/proposals" element={<Proposals currentUser={currentUser} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;