import { useState } from 'react';
import { supabase } from '../supabaseClient';

function LoginReal({ onLogin }) {
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) return;

    try {
      setLoading(true);

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

      if (profileError) {
        console.error("Profile fetch failed:", profileError);
        // Fallback profile from user metadata if profile sync is delayed
        const fallbackProfile = {
          user_id: authData.user.id,
          username: authData.user.user_metadata?.username || email.split('@')[0],
          email: authData.user.email,
          role: authData.user.user_metadata?.role || 'Client'
        };
        onLogin(fallbackProfile, authData.session.access_token);
      } else {
        onLogin(userProfile, authData.session.access_token);
      }
    } catch (e2) {
      setError('Unable to login. ' + String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ticket-card"
      style={{ marginBottom: 24, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}
    >
      <div className="ticket-card__top" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Skone IT Support</h2>
      </div>
      <p style={{ marginTop: 0, color: 'var(--muted)', marginBottom: 6 }}>Secure Ticket Portal</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
        <label className="label">Email / Username</label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="control"
          placeholder="e.g. alice@example.com or alice"
          autoComplete="username"
          disabled={loading}
          style={{ marginTop: 4, marginBottom: 14 }}
        />

        <label className="label">Password</label>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="control"
            placeholder="Your password"
            autoComplete="current-password"
            disabled={loading}
            style={{ paddingRight: 120 }}
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            style={{
              position: 'absolute',
              top: '50%',
              right: 10,
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: 0,
              lineHeight: 1,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 22,
              width: 22,
            }}
            disabled={loading}
          >
            <span aria-hidden style={{ fontSize: 16, display: 'inline-block', transform: 'translateY(1px)' }}>
              {showPassword ? '🙈' : '👁️'}
            </span>
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255, 80, 80, 0.12)',
              color: 'var(--text)',
              border: '1px solid rgba(255, 80, 80, 0.25)',
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ color: 'var(--blue)', fontWeight: 800, textDecoration: 'none', fontSize: 13 }}
          >
            Forgot password?
          </a>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} />
        </div>

        <button
          type="submit"
          className="btn btnPrimary"
          disabled={loading}
          aria-busy={loading}
          style={{ width: '100%', height: 52, backgroundColor: '#0f172a', borderRadius: 12, fontSize: 16 }}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  border: '2px solid rgba(255,255,255,0.6)',
                  borderTopColor: '#fff',
                  display: 'inline-block',
                  animation: 'spin 0.9s linear infinite',
                  boxSizing: 'border-box',
                }}
              />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>

        <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
          Need help? Contact IT Support
        </div>
      </form>
    </div>
  );
}

export default LoginReal;

