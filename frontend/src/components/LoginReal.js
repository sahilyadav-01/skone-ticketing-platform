import { useState } from 'react';

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Login failed');
      }

      const data = await res.json();
      onLogin(data.user, data.token);
    } catch (e) {
      setError('Unable to login. ' + String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ticket-card"
      style={{ marginBottom: 24, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}
    >
      <div className="ticket-card__top" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Skone IT Support Portal</h2>
      </div>
      <p style={{ marginTop: 0, color: 'var(--muted)' }}>
        Secure access for employees
      </p>

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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, marginBottom: 12 }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ color: 'var(--blue)', fontWeight: 800, textDecoration: 'none', fontSize: 13 }}
          >
            Forgot password?
          </a>
        </div>

        {error && (
          <div style={{ color: 'var(--danger2)', marginTop: 2, marginBottom: 12 }} role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btnPrimary"
          disabled={loading}
          aria-busy={loading}
          style={{ width: '100%', height: 48 }}
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

