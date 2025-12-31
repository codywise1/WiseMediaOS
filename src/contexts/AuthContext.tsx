import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Use ref to track current profile in callbacks without stale closure
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      if (!mounted) return;

      try {
        console.log('Fetching profile for user:', userId);

        let retries = 5;
        let data = null;
        let lastError = null;

        while (retries > 0 && !data && mounted) {
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (result.error) {
            console.error('Error fetching profile:', result.error);
            lastError = result.error;
          }

          data = result.data;

          if (!data && retries > 1) {
            console.log(`Profile not found, retrying... (${retries - 1} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          retries--;
        }

        if (!data) {
          console.error('Profile not found after retries. User ID:', userId);
          console.error('Last error:', lastError);
          if (mounted) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        console.log('Profile loaded:', data.email, 'Role:', data.role);
        if (mounted) {
          setProfile(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Unexpected error loading profile:', error);
        if (mounted) {
          // Don't wipe profile on error if we already have one, to avoid UI flash
          if (!profile) {
            setProfile(null);
          }
          setLoading(false);
        }
      }
    }

    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
            setInitializing(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('Session found for:', session.user.email);
          setUser(session.user);
          await loadProfile(session.user.id);
        } else if (mounted) {
          console.log('No active session');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (!mounted) return;

      // Skip events that shouldn't trigger UI updates when switching tabs
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Only reload profile if user changed
        setUser(prev => {
          if (prev?.id === session.user.id) return prev;
          return session.user;
        });
        // Don't set loading if we already have a profile for this user (use ref to avoid stale closure)
        const currentProfile = profileRef.current;
        if (!currentProfile || currentProfile.id !== session.user.id) {
          setLoading(true);
          await loadProfile(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(userId: string) {
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('Profile not found for user:', userId);
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('Profile loaded:', data.email, 'Role:', data.role);
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      setProfile(null);
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      console.log('Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      console.log('Sign in successful:', data.user?.email);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      console.log('Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });
      if (error) throw error;

      console.log('Sign up successful:', data.user?.email);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
