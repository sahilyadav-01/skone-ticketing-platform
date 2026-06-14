import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Restore session
  useEffect(() => {
    try {
      const id = localStorage.getItem('user_id');
      const role = localStorage.getItem('user_role');
      const username = localStorage.getItem('username');
      if (id && role) {
        const parsedId = isNaN(Number(id)) ? id : Number(id);
        setUser({ user_id: parsedId, role, username: username || 'User' });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    setLoading(true);
    try {
      let email = identifier;
      if (!email.includes('@')) {
        // Look up email by username in public.users
        const { data, error: lookupError } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier)
          .maybeSingle();

        if (lookupError || !data) {
          if (lookupError) console.error("Username lookup failed:", lookupError);
          throw new Error('Invalid username or password');
        }
        email = data.email;
      }

      // Log in using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("Auth sign-in failed:", authError);
        throw authError;
      }

      // Fetch the full profile to get role and username
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('user_id, username, email, role')
        .eq('user_id', authData.user.id)
        .single();

      let profile;
      if (profileError) {
        console.error("Profile fetch failed:", profileError);
        // Fallback profile from user metadata if profile sync is delayed
        profile = {
          user_id: authData.user.id,
          username: authData.user.user_metadata?.username || email.split('@')[0],
          email: authData.user.email,
          role: authData.user.user_metadata?.role || 'Client'
        };
      } else {
        profile = userProfile;
      }

      try {
        if (authData.session?.access_token) {
          localStorage.setItem('jwt_token', authData.session.access_token);
        }
        if (profile?.user_id !== undefined) {
          localStorage.setItem('user_id', String(profile.user_id));
        }
        if (profile?.role) {
          localStorage.setItem('user_role', String(profile.role));
        }
        if (profile?.username) {
          localStorage.setItem('username', String(profile.username));
        }
      } catch (err) {
        console.error("Failed to save to localStorage:", err);
      }

      setUser(profile);
      return profile;
    } catch (err) {
      const errMsg = String(err?.message || err);
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_role');
      localStorage.removeItem('username');
      localStorage.removeItem('DEV_BYPASS');
    } catch { }
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    setUser,
  };
}
