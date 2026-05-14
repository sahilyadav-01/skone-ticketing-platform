import { useEffect, useMemo, useState } from 'react';

const defaultRole = 'Client';

function LoginAsClient({ onLogin }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/users?role=' + encodeURIComponent(defaultRole));
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        setClients(data);
      } catch (e) {
        setError('Unable to load clients.');
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  const selected = useMemo(() => {
    if (!selectedUserId) return null;
    return clients.find((c) => String(c.user_id) === String(selectedUserId)) || null;
  }, [clients, selectedUserId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected) return;
    onLogin(selected);
  };

  return (
    <div className="ticket-card" style={{ marginBottom: 24 }}>
      <div className="ticket-card__top" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Client Portal</h2>
      </div>
      <p style={{ marginTop: 6, color: '#4b5563' }}>
        Select your client account to submit and track tickets.
      </p>

      {error && (
        <div style={{ color: '#b91c1c', marginTop: 10 }} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <label style={{ display: 'block' }}>
          Client
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
            disabled={loading}
            required
          >
            <option value="">{loading ? 'Loading...' : 'Select a client'}</option>
            {clients.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.username} (#{c.user_id})
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="primary-btn" disabled={loading || !selected}>
          Continue
        </button>
      </form>
    </div>
  );
}

export default LoginAsClient;

