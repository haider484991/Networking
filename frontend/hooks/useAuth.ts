import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let supabase: any;
    
    try {
      // Dynamically import supabase to catch initialization errors
      import('../utils/supabaseClient').then(({ supabase: supabaseClient }) => {
        supabase = supabaseClient;
        
        // Get current session
        const currentSession = supabase.auth.session ? supabase.auth.session() : null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Listen for auth changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        });

        return () => {
          listener?.subscription.unsubscribe();
        };
      }).catch((err) => {
        console.error('Supabase client error:', err);
        setError(err.message);
        setLoading(false);
      });
    } catch (err: any) {
      console.error('Auth hook error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  return { session, user, loading, error };
} 