import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import ClientDetail from './components/ClientDetail';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import Notes from './components/Notes';
import Invoices from './components/Invoices';
import InvoiceDetail from './components/InvoiceDetail';
import Appointments from './components/Appointments';
import Proposals from './components/Proposals';
import Support from './components/Support';
import Login from './components/Login';
import { authService, isSupabaseAvailable, clientService, supabase, avatarService } from './lib/supabase';

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
        company: 'Wise Media'
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
          company: 'Wise Media'
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
          company: 'Client Corp'
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

  const handleUpdateProfile = async (userData: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedUser = { ...currentUser, ...userData };

      if (isSupabaseAvailable()) {
        // Update client record in database
        const clientUpdates = {
          name: userData.name || currentUser.name,
          phone: userData.phone,
          company: userData.company,
          address: userData.address,
          website: userData.website,
          notes: userData.notes
        };

        // Update the client record by email
        await clientService.updateByEmail(currentUser.email, clientUpdates);

        // Update auth user metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            name: userData.name || currentUser.name,
            phone: userData.phone,
            company: userData.company,
            avatar: userData.avatar,
            title: userData.title,
            website: userData.website,
            linkedin: userData.linkedin,
            twitter: userData.twitter,
            instagram: userData.instagram,
            facebook: userData.facebook,
            github: userData.github,
            address: userData.address,
            city: userData.city,
            state: userData.state,
            zipCode: userData.zipCode,
            country: userData.country,
            timezone: userData.timezone,
            bio: userData.bio,
            industry: userData.industry,
            companySize: userData.companySize,
            budget: userData.budget,
            referralSource: userData.referralSource,
            notes: userData.notes
          }
        });

        if (authError) {
          console.error('Error updating user metadata:', authError);
          throw authError;
        }

        console.log('Profile and client record updated successfully');
      }

      setCurrentUser(updatedUser);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
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
          <Route path="/clients/:id" element={<ClientDetail currentUser={currentUser} />} />
          <Route path="/projects" element={<Projects currentUser={currentUser} />} />
          <Route path="/projects/:id" element={<ProjectDetail currentUser={currentUser} />} />
          <Route path="/notes" element={<Notes currentUser={currentUser} />} />
          <Route path="/invoices" element={<Invoices currentUser={currentUser} />} />
          <Route path="/invoices/:id" element={<InvoiceDetail currentUser={currentUser} />} />
          <Route path="/appointments" element={<Appointments currentUser={currentUser} />} />
          <Route path="/proposals" element={<Proposals currentUser={currentUser} />} />
          <Route path="/support" element={<Support currentUser={currentUser} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
