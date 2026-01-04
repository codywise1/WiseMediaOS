import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import ClientDetail from './components/ClientDetail';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import Notes from './components/Notes';
import NoteDetail from './components/NoteDetail';
import Invoices from './components/Invoices';
import InvoiceDetail from './components/InvoiceDetail';

import Proposals from './components/Proposals';
import ProposalDetail from './components/ProposalDetail';
import Support from './components/Support';
import Login from './components/Login';
import { authService, isSupabaseAvailable, clientService, supabase, UserRole } from './lib/supabase';
import CommunityPage from './pages/CommunityPage';
import CommunityFeedPage from './pages/CommunityFeedPage';
import CoursesPage from './pages/CoursesPage';
import CourseSinglePage from './pages/CourseSinglePage';
import ProfilePage from './pages/ProfilePage';
import AdminBackendPage from './pages/AdminBackendPage';
import CreatorHome from './pages/CreatorHome';
import AdminFiles from './pages/AdminFiles';
import Orders from './pages/Orders';
import FilesPage from './pages/FilesPage';
import FileDetailPage from './pages/FileDetailPage';
import { useAuth } from './contexts/AuthContext';
import LessonPage from './pages/LessonPage';
import MarketplacePage from './pages/MarketplacePage';
import MeetingsPage from './pages/MeetingsPage';
import LiveMeetingPage from './pages/LiveMeetingPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import ClientNotes from './pages/ClientNotes';
import ClientNoteDetail from './pages/ClientNoteDetail';
// import CommunityProPage from './pages/CommunityProPage';
// import CommunityResourcesPage from './pages/CommunityResourcesPage';
// import CommunitySettingsPage from './pages/CommunitySettingsPage';
// import CommunityAdminCoursesPage from './pages/CommunityAdminCoursesPage';
// import CommunityAdminCourseNewPage from './pages/CommunityAdminCourseNewPage';
// import CommunityAdminCourseEditPage from './pages/CommunityAdminCourseEditPage';
// import CommunityAdminLessonEditPage from './pages/CommunityAdminLessonEditPage';
// import CommunityAdminResourcesPage from './pages/CommunityAdminResourcesPage';
// import CommunityAdminCategoriesPage from './pages/CommunityAdminCategoriesPage';

interface User {
  email: string;
  role: UserRole;
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

function AdminGuard({ children }: { children: React.ReactElement }) {
  const { profile, user } = useAuth();

  // In demo mode (no Supabase), allow admin routes
  if (!isSupabaseAvailable()) {
    return children;
  }

  const profileRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase();
  if (!profileRole || profileRole !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl max-w-md text-center border border-white/10">
          <h2 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Admin Only</h2>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            You need administrator privileges to access this area.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

function StaffOrAdminGuard({ children }: { children: React.ReactElement }) {
  const { profile, user } = useAuth();

  // In demo mode (no Supabase), allow staff/admin routes
  if (!isSupabaseAvailable()) {
    return children;
  }

  const profileRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase();
  const isAllowed = profileRole === 'admin' || profileRole === 'staff';
  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl max-w-md text-center border border-white/10">
          <h2 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Staff Only</h2>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            You don't have access to the client list.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

function ProOnlyGuard({ children }: { children: React.ReactElement }) {
  const { profile, user } = useAuth();

  const role = (profile?.role || user?.user_metadata?.role || '').toLowerCase();
  const subscription = (profile as any)?.subscription_type || user?.user_metadata?.subscription_type || 'free';
  const isPro = role === 'admin' || role === 'staff' || role === 'elite' || role === 'pro' || subscription === 'pro';

  if (!isPro) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl max-w-md text-center border border-white/10 space-y-4">
          <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Pro Creators only</h2>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            This content is exclusive to Pro Creators. Upgrade to unlock it.
          </p>
          <a
            href="/community/pro"
            className="btn-primary inline-flex justify-center w-full"
          >
            Go to Pro upgrade
          </a>
        </div>
      </div>
    );
  }

  return children;
}

function CommunityGuard({ children }: { children: React.ReactElement }) {
  const { profile, user } = useAuth();

  // In demo mode (no Supabase), allow community routes
  if (!isSupabaseAvailable()) {
    return children;
  }

  // Allow access for admin and creator roles (elite, pro, free). Block generic 'user' or missing profile.
  const role = (profile?.role || user?.user_metadata?.role || '').toLowerCase();
  const allowed = role === 'admin' || role === 'staff' || role === 'elite' || role === 'pro' || role === 'free' || role === 'user';

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl max-w-md text-center border border-white/10">
          <h2 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Access Restricted</h2>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Creator Club is available to Creators and Admins. Please sign in with a Creator account.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

import { useLoadingGuard } from './hooks/useLoadingGuard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Track current user ID to avoid unnecessary updates when switching tabs
  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;
  }, [currentUser?.id]);

  useLoadingGuard(loading, setLoading, 10000);

  const updateCurrentUserFromAuth = useCallback(
    (user: any | null) => {
      if (!user) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        return;
      }

      const next: User = {
        id: user.id,
        email: user.email || '',
        role: (user.user_metadata?.role as UserRole) || 'user',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar: user.user_metadata?.avatar,
        phone: user.user_metadata?.phone,
        company: user.user_metadata?.company,
        title: user.user_metadata?.title,
        website: user.user_metadata?.website,
        linkedin: user.user_metadata?.linkedin,
        twitter: user.user_metadata?.twitter,
        instagram: user.user_metadata?.instagram,
        facebook: user.user_metadata?.facebook,
        github: user.user_metadata?.github,
        address: user.user_metadata?.address,
        city: user.user_metadata?.city,
        state: user.user_metadata?.state,
        zipCode: user.user_metadata?.zipCode,
        country: user.user_metadata?.country,
        timezone: user.user_metadata?.timezone,
        bio: user.user_metadata?.bio,
        industry: user.user_metadata?.industry,
        companySize: user.user_metadata?.companySize,
        budget: user.user_metadata?.budget,
        referralSource: user.user_metadata?.referralSource,
        notes: user.user_metadata?.notes
      };

      setCurrentUser(prev => {
        if (prev && JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
      setIsAuthenticated(true);
    },
    [setCurrentUser, setIsAuthenticated]
  );

  const checkAuthState = useCallback(async () => {
    if (!isSupabaseAvailable()) {
      // Demo mode or missing Supabase config: don't block the UI
      setLoading(false);
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      updateCurrentUserFromAuth(user);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, [updateCurrentUserFromAuth]);

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
      const { data: { subscription: sub } } = authService.onAuthStateChange(user => {
        if (user) {
          // Only update if user changed (avoid re-renders when switching tabs)
          if (currentUserIdRef.current !== user.id) {
            updateCurrentUserFromAuth(user);
          }
          // Always ensure authenticated state is set
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
          currentUserIdRef.current = null;
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
  }, [checkAuthState, updateCurrentUserFromAuth]);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    if (!isSupabaseAvailable()) {
      // Demo mode authentication
      console.log('Demo mode login attempt:', { email });

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
      } else if (email.toLowerCase() === 'staff' && password === 'staff') {
        const userData: User = {
          id: 'staff-demo-id',
          email: 'staff@wisemedia.io',
          role: 'staff',
          name: 'Demo Staff',
          phone: '+1 (555) 246-8100',
          company: 'Wise Media'
        };
        setCurrentUser(userData);
        setIsAuthenticated(true);
        console.log('Staff login successful');
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
        throw new Error('Invalid credentials. Use admin/admin, staff/staff, or user/user.');
      }
    } else {
      try {
        const { user } = await authService.signIn(email, password);
        if (user) {
          const userData: User = {
            id: user.id,
            email: user.email || '',
            role: (user.user_metadata?.role as UserRole) || 'user',
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
        const { error: authError } = await supabase!.auth.updateUser({
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
    console.log('[App] rendering global loading spinner', { loading, isAuthenticated });
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
          <Route
            path="/clients"
            element={
              <StaffOrAdminGuard>
                <Clients currentUser={currentUser} />
              </StaffOrAdminGuard>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <StaffOrAdminGuard>
                <ClientDetail currentUser={currentUser} />
              </StaffOrAdminGuard>
            }
          />
          <Route path="/projects" element={<Projects currentUser={currentUser} />} />
          <Route path="/projects/:id" element={<ProjectDetail currentUser={currentUser} />} />
          <Route path="/notes" element={<Notes currentUser={currentUser} />} />
          <Route path="/notes/:id" element={<NoteDetail currentUser={currentUser} />} />

          {/* Client Portal Routes */}
          <Route path="/client/notes" element={<ClientNotes currentUser={currentUser} />} />
          <Route path="/client/notes/:id" element={<ClientNoteDetail />} />

          <Route path="/invoices" element={<Invoices currentUser={currentUser} />} />
          <Route path="/invoices/:id" element={<InvoiceDetail currentUser={currentUser} />} />
          <Route path="/appointments" element={<Navigate to="/meetings" replace />} />
          <Route path="/proposals" element={<Proposals currentUser={currentUser} />} />
          <Route path="/proposals/:id" element={<ProposalDetail currentUser={currentUser} />} />
          <Route path="/support" element={<Support currentUser={currentUser} />} />
          {/* Community Module */}
          <Route
            path="/community"
            element={
              <CommunityGuard>
                <CommunityFeedPage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/chat"
            element={
              <CommunityGuard>
                <CommunityPage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/courses"
            element={
              <CommunityGuard>
                <CoursesPage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/courses/:id"
            element={
              <CommunityGuard>
                <CourseSinglePage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/courses/:id/lesson/:lessonId"
            element={
              <CommunityGuard>
                <LessonPage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/marketplace"
            element={
              <MarketplacePage />
            }
          />
          {/* <Route
            path="/community/pro"
            element={
              <CommunityGuard>
                <CommunityProPage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/resources"
            element={
              <CommunityGuard>
                <CommunityResourcesPage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/settings"
            element={
              <CommunityGuard>
                <CommunitySettingsPage />
              </CommunityGuard>
            } */}
          {/* /> */}
          <Route
            path="/community/profile"
            element={
              <CommunityGuard>
                <ProfilePage />
              </CommunityGuard>
            }
          />
          <Route
            path="/community/admin"
            element={
              <AdminGuard>
                <AdminBackendPage />
              </AdminGuard>
            }
          />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route
            path="/meetings/live/:id"
            element={
              <StaffOrAdminGuard>
                <LiveMeetingPage />
              </StaffOrAdminGuard>
            }
          />
          <Route
            path="/meetings/:id"
            element={
              <StaffOrAdminGuard>
                <MeetingDetailPage />
              </StaffOrAdminGuard>
            }
          />
          {/* <Route
            path="/community/admin/courses"
            element={
              <AdminGuard>
                <CommunityAdminCoursesPage />
              </AdminGuard>
            }
          />
          <Route
            path="/community/admin/courses/new"
            element={
              <AdminGuard>
                <CommunityAdminCourseNewPage />
              </AdminGuard>
            }
          />
          <Route
            path="/community/admin/courses/:id/edit"
            element={
              <AdminGuard>
                <CommunityAdminCourseEditPage />
              </AdminGuard>
            }
          />
          <Route
            path="/community/admin/lessons/:id/edit"
            element={
              <AdminGuard>
                <CommunityAdminLessonEditPage />
              </AdminGuard>
            }
          />
          <Route
            path="/community/admin/resources"
            element={
              <AdminGuard>
                <CommunityAdminResourcesPage />
              </AdminGuard>
            }
          />
          <Route
            path="/community/admin/categories"
            element={
              <AdminGuard>
                <CommunityAdminCategoriesPage />
              </AdminGuard>
            }
          /> */}
          {/* <Route
            path="/admin/files"
            element={
              <AdminGuard>
                <AdminFiles />
              </AdminGuard>
            }
          /> */}
          <Route path="/files" element={<FilesPage />} />
          <Route
            path="/orders"
            element={
              <AdminGuard>
                <Orders />
              </AdminGuard>
            }
          />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/files/:id" element={<FileDetailPage />} />
          <Route
            path="/creator"
            element={
              <CommunityGuard>
                <CreatorHome />
              </CommunityGuard>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

