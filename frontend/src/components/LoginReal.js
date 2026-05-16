import { useState } from 'react';

function LoginReal({ onLogin }) {
  const [mode, setMode] = useState('user_id');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const body = mode === 'user_id' ? { user_id: Number(userId) } : { username };
    if (mode === 'user_id' && !userId) return;
    if (mode === 'username' && !username) return;

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    <div className="ticket-card" style={{ marginBottom: 24 }}>
      <div className="ticket-card__top" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Real Login (JWT)</h2>
      </div>
      <p style={{ marginTop: 6, color: '#4b5563' }}>
        Demo login for Admin/Support/Client. Enter either user_id or username.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Login by</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          >
            <option value="user_id">user_id</option>
            <option value="username">username</option>
          </select>
        </div>

        {mode === 'user_id' ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>User ID</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
              placeholder="e.g. 1"
            />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
              placeholder="e.g. alice / tech1"
            />
          </div>
        )}

        {error && (
          <div style={{ color: '#b91c1c', marginTop: 10 }} role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="primary-btn"
          disabled={loading}
          style={{ width: '100%', marginTop: 8 }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginReal;

