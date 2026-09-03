import { useState } from 'react';

function ResetPassword({ onUpdatePassword, onCancel }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    try {
      setLoading(true);
      await onUpdatePassword(newPassword);
      setSuccess(true);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  return (
    <div
      className="ticket-card"
      style={{ marginBottom: 24, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}
    >
      <div className="ticket-card__top" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Create New Password</h2>
      </div>
      <p style={{ marginTop: 0, color: 'var(--muted)', marginBottom: 12 }}>
        Choose a secure new password for your account.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 14,
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

      {success ? (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 14px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            ✓
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>
            Password Updated!
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
            Your account password has been successfully reset. You can now access your account.
          </p>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={onCancel}
            style={{ width: '100%', height: 48, backgroundColor: '#0f172a', borderRadius: 12, fontSize: 15 }}
          >
            Continue to ITSM Portal
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
          <label className="label">New Password</label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="control"
              placeholder="Enter new password (min. 6 chars)"
              autoComplete="new-password"
              disabled={loading}
              style={{ paddingRight: 45 }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 12,
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 24,
                width: 24,
              }}
            >
              <span aria-hidden style={{ fontSize: 16 }}>{showNew ? '🙈' : '👁️'}</span>
            </button>
          </div>

          <label className="label">Confirm New Password</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="control"
              placeholder="Confirm your new password"
              autoComplete="new-password"
              disabled={loading}
              style={{ paddingRight: 45 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 12,
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 24,
                width: 24,
              }}
            >
              <span aria-hidden style={{ fontSize: 16 }}>{showConfirm ? '🙈' : '👁️'}</span>
            </button>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.04)',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              marginBottom: 16,
              fontSize: 12.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isMinLength ? '#059669' : 'var(--muted)' }}>
              <span>{isMinLength ? '✓' : '○'}</span>
              <span>At least 6 characters long</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isMatch ? '#059669' : 'var(--muted)' }}>
              <span>{isMatch ? '✓' : '○'}</span>
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={loading || !isMinLength || !isMatch}
            aria-busy={loading}
            style={{
              width: '100%',
              height: 48,
              backgroundColor: (!isMinLength || !isMatch) ? '#94a3b8' : '#0f172a',
              borderRadius: 12,
              fontSize: 15,
              cursor: (!isMinLength || !isMatch || loading) ? 'not-allowed' : 'pointer',
            }}
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
                Updating Password...
              </span>
            ) : (
              'Save New Password'
            )}
          </button>

          {onCancel && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default ResetPassword;
