
import { useState } from 'react';

function LoginReal({ onLogin, onRequestPasswordReset }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetSentEmail, setResetSentEmail] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please enter both username/email and password.');
      return;
    }

    try {
      setLoading(true);
      await onLogin(identifier.trim(), password);
    } catch (e2) {
      setError(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your email or username.');
      return;
    }

    try {
      setLoading(true);
      if (typeof onRequestPasswordReset === 'function') {
        const result = await onRequestPasswordReset(identifier.trim());
        setResetSentEmail(result?.email || identifier.trim());
      } else {
        throw new Error('Password reset handler is not configured.');
      }
    } catch (e2) {
      setError(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  };

  const switchToForgot = () => {
    setError(null);
    setResetSentEmail(null);
    setMode('forgot');
  };

  const switchToLogin = () => {
    setError(null);
    setResetSentEmail(null);
    setMode('login');
  };

  return (
    <div
      className="ticket-card"
      style={{ marginBottom: 24, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}
    >
      <div className="ticket-card__top" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>
          {mode === 'login' ? 'Skone IT Support' : 'Reset Password'}
        </h2>
      </div>
      <p style={{ marginTop: 0, color: 'var(--muted)', marginBottom: 6 }}>
        {mode === 'login'
          ? 'Secure Ticket Portal'
          : 'Enter your email or username to receive a reset link.'}
      </p>

      {error && (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#b91c1c',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontWeight: 600,
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLoginSubmit} style={{ marginTop: 14 }}>
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
              style={{ paddingRight: 45 }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              style={{
                position: 'absolute',
                top: '50%',
                right: 12,
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
                height: 24,
                width: 24,
              }}
              disabled={loading}
            >
              <span aria-hidden style={{ fontSize: 16, display: 'inline-block' }}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={switchToForgot}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--blue, #2563eb)',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={loading}
            aria-busy={loading}
            style={{ width: '100%', height: 48, backgroundColor: '#0f172a', borderRadius: 12, fontSize: 16 }}
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

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textAlign: 'center' }}>
              ⚡ One-Click Sign In:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  setIdentifier('tech1');
                  setPassword('pass');
                  setError(null);
                  setLoading(true);
                  try {
                    await onLogin('tech1', 'pass');
                  } catch (e2) {
                    setError(String(e2?.message || e2));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                style={{ fontSize: 12, padding: '9px 10px', textAlign: 'center', background: 'rgba(37,99,235,0.08)', color: 'var(--blue)', borderColor: 'rgba(37,99,235,0.25)', fontWeight: 600 }}
              >
                👨‍💻 Support (tech1)
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  setIdentifier('bob');
                  setPassword('pass');
                  setError(null);
                  setLoading(true);
                  try {
                    await onLogin('bob', 'pass');
                  } catch (e2) {
                    setError(String(e2?.message || e2));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                style={{ fontSize: 12, padding: '9px 10px', textAlign: 'center', background: 'rgba(16,185,129,0.08)', color: '#059669', borderColor: 'rgba(16,185,129,0.25)', fontWeight: 600 }}
              >
                👤 Client (bob)
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            Need help? Contact IT Support
          </div>
        </form>
      ) : resetSentEmail ? (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              margin: '0 auto 14px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            ✓
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, color: 'var(--text)' }}>
            Reset Link Sent
          </h3>
          <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5 }}>
            We have sent a password reset link to:
            <br />
            <strong style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{resetSentEmail}</strong>
          </p>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(37, 99, 235, 0.06)',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              color: 'var(--muted)',
              fontSize: 12.5,
              lineHeight: 1.45,
              marginBottom: 18,
              textAlign: 'left',
            }}
          >
            💡 <strong>Next steps:</strong> Open the link in your email to choose your new password. If you don't see it within a couple minutes, check your spam or junk folder.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={switchToLogin}
              style={{ width: '100%', height: 46, backgroundColor: '#0f172a', borderRadius: 12, fontSize: 15 }}
            >
              Back to Sign In
            </button>
            <button
              type="button"
              onClick={handleForgotSubmit}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--blue, #2563eb)',
                fontWeight: 600,
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '6px 0',
              }}
            >
              {loading ? 'Resending...' : 'Didn’t receive an email? Resend'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleForgotSubmit} style={{ marginTop: 14 }}>
          <label className="label">Email / Username</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="control"
            placeholder="e.g. alice@example.com or alice"
            autoComplete="username"
            disabled={loading}
            style={{ marginTop: 4, marginBottom: 14 }}
            autoFocus
          />

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={loading}
            aria-busy={loading}
            style={{ width: '100%', height: 48, backgroundColor: '#0f172a', borderRadius: 12, fontSize: 15 }}
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
                Sending Reset Link...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button
              type="button"
              onClick={switchToLogin}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--blue, #2563eb)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ← Back to Sign In
            </button>
          </div>

          <div style={{ marginTop: 16, color: 'var(--muted)', fontSize: 12.5, textAlign: 'center' }}>
            Immediate assistance? Contact IT Support at support@skone.com
          </div>
        </form>
      )}
    </div>
  );
}

export default LoginReal;

