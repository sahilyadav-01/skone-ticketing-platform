import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Restore session & detect recovery mode
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

    // Check if user landed on the page via password reset link
    if (
      (window.location.hash && window.location.hash.includes('type=recovery')) ||
      (window.location.search && window.location.search.includes('type=recovery'))
    ) {
      setRecoveryMode(true);
    }

    // Listen for auth state changes, especially PASSWORD_RECOVERY
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
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

  const requestPasswordReset = async (identifier) => {
    setError(null);
    setLoading(true);
    try {
      const trimmed = String(identifier || '').trim();
      if (!trimmed) {
        throw new Error('Please enter your email or username');
      }

      let email = trimmed;
      if (!email.includes('@')) {
        // Attempt RPC lookup first
        let resolvedEmail = null;
        try {
          const { data: rpcEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
            p_username: trimmed
          });
          if (!rpcError && rpcEmail) {
            resolvedEmail = rpcEmail;
          }
        } catch (e) {
          // ignore and fallback
        }

        // Fallback to table query if RPC failed or returned null
        if (!resolvedEmail) {
          const { data: userRow, error: queryError } = await supabase
            .from('users')
            .select('email')
            .eq('username', trimmed)
            .maybeSingle();

          if (queryError || !userRow) {
            throw new Error(`No account found with username "${trimmed}". Please check the username or enter your email.`);
          }
          resolvedEmail = userRow.email;
        }

        email = resolvedEmail;
      }

      // Request password reset email from Supabase Auth
      const redirectTo = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (resetError) {
        throw resetError;
      }

      return { success: true, email };
    } catch (err) {
      const errMsg = String(err?.message || err);
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    setError(null);
    setLoading(true);
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Exit recovery mode
      setRecoveryMode(false);

      // Clean up URL hash so refreshing doesn't re-trigger recovery mode
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Refresh or load user profile if available
      if (data?.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('user_id, username, email, role')
          .eq('user_id', data.user.id)
          .single();

        const profile = userProfile || {
          user_id: data.user.id,
          username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
          email: data.user.email,
          role: data.user.user_metadata?.role || 'Client'
        };

        try {
          if (data.session?.access_token) {
            localStorage.setItem('jwt_token', data.session.access_token);
          }
          localStorage.setItem('user_id', String(profile.user_id));
          localStorage.setItem('user_role', String(profile.role));
          localStorage.setItem('username', String(profile.username));
        } catch (err) {
          console.error("Failed to save to localStorage:", err);
        }

        setUser(profile);
      }

      return { success: true };
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
    recoveryMode,
    setRecoveryMode,
    login,
    logout,
    requestPasswordReset,
    updatePassword,
    setUser,
  };
}
