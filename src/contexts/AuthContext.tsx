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

  const profileRef = useRef<Profile | null>(null);
  const recoveringRef = useRef(false);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  async function loadProfile(userId: string, mounted: boolean) {
    if (!mounted) return;
    try {
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
          lastError = result.error;
        }
        data = result.data;
        if (!data && retries > 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        retries--;
      }
      if (!data) {
        console.error('Profile not found after retries. User ID:', userId, 'Last error:', lastError);
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      if (mounted) {
        setProfile(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
      if (mounted) {
        if (!profileRef.current) setProfile(null);
        setLoading(false);
      }
    }
  }

  // Recover the session from storage after a transient token error (e.g.
  // another tab consumed the shared refresh token). Re-reads the session
  // a few times with backoff before giving up, so a multi-tab refresh race
  // doesn't wipe the user's data.
  async function recoverSession(mounted: boolean): Promise<boolean> {
    if (recoveringRef.current) return false;
    recoveringRef.current = true;
    try {
      for (let i = 0; i < 4; i++) {
        if (!mounted) return false;
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        const { data, error } = await supabase.auth.getSession();
        if (error) continue;
        if (data.session?.user) {
          setUser(prev => (prev?.id === data.session!.user.id ? prev : data.session!.user));
          const currentProfile = profileRef.current;
          if (!currentProfile || currentProfile.id !== data.session.user.id) {
            setLoading(true);
            await loadProfile(data.session.user.id, mounted);
          } else {
            setLoading(false);
          }
          return true;
        }
        // Try a forced refresh — another tab may have written a new session.
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed.session?.user) {
          setUser(prev => (prev?.id === refreshed.session!.user.id ? prev : refreshed.session!.user));
          const currentProfile = profileRef.current;
          if (!currentProfile || currentProfile.id !== refreshed.session.user.id) {
            setLoading(true);
            await loadProfile(refreshed.session.user.id, mounted);
          } else {
            setLoading(false);
          }
          return true;
        }
      }
      return false;
    } finally {
      recoveringRef.current = false;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) { setLoading(false); }
          return;
        }
        if (session?.user && mounted) {
          setUser(session.user);
          await loadProfile(session.user.id, mounted);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) { setLoading(false); }
      }
    }

    initializeAuth();

    // Supabase v2 has built-in cross-tab session sync via the storage event.
    // It fires onAuthStateChange (TOKEN_REFRESHED / INITIAL_SESSION) when
    // another tab updates the shared session in localStorage. We do NOT need
    // a separate window 'storage' listener — that only races with the
    // built-in handler and causes the multi-tab token glitch.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // TOKEN_REFRESHED: this tab or another tab rotated the token.
      // Update user in place; never wipe profile/data on refresh.
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(prev => (prev?.id === session.user.id ? prev : session.user));
          const currentProfile = profileRef.current;
          if (!currentProfile || currentProfile.id !== session.user.id) {
            setLoading(true);
            await loadProfile(session.user.id, mounted);
          }
        }
        return;
      }

      // INITIAL_SESSION fires on tab load and cross-tab storage sync.
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(prev => (prev?.id === session.user.id ? prev : session.user));
          const currentProfile = profileRef.current;
          if (!currentProfile || currentProfile.id !== session.user.id) {
            setLoading(true);
            await loadProfile(session.user.id, mounted);
          } else {
            setLoading(false);
          }
        }
        return;
      }

      // SIGNED_OUT can fire as a side-effect of a failed token refresh in a
      // multi-tab setup (the other tab consumed the refresh token). Before
      // wiping, try to recover the session from storage / forced refresh.
      if (event === 'SIGNED_OUT') {
        if (profileRef.current && !recoveringRef.current) {
          const recovered = await recoverSession(mounted);
          if (recovered) return; // Session recovered — don't wipe.
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(prev => (prev?.id === session.user.id ? prev : session.user));
        }
        return;
      }

      if (session?.user) {
        setUser(prev => (prev?.id === session.user.id ? prev : session.user));
        const currentProfile = profileRef.current;
        if (!currentProfile || currentProfile.id !== session.user.id) {
          setLoading(true);
          await loadProfile(session.user.id, mounted);
        }
      } else {
        // No session in this event — try recovery before wiping, since
        // another tab may have just refreshed and this event is stale.
        if (profileRef.current && !recoveringRef.current) {
          const recovered = await recoverSession(mounted);
          if (recovered) return;
        }
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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
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
