import { useEffect, useState } from 'react';

function Login({ onLogin }) {
  const [role, setRole] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (!role) return;
    loadUsers(role);
  }, [role]);

  const loadUsers = async (selectedRole) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/users?role=${encodeURIComponent(selectedRole)}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError('Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setSelectedUserId('');
    setUsers([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    const user = users.find((u) => String(u.user_id) === String(selectedUserId));
    if (user) onLogin(user);
  };

  return (
    <div className="ticket-card" style={{ marginBottom: 24 }}>
      <div className="ticket-card__top" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Skone IT Ticketing Portal</h2>
      </div>
      <p style={{ marginTop: 6, color: '#4b5563' }}>
        Select your role and account to access the portal.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
            Role
          </label>
          <select
            value={role}
            onChange={handleRoleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          >
            <option value="">Select a role</option>
            <option value="Client">Client</option>
            <option value="Support Engineer">Support Engineer</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {role && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
              Account
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loading}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
            >
              <option value="">
                {loading ? 'Loading...' : 'Select an account'}
              </option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{ color: '#b91c1c', marginTop: 10 }} role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedUserId}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedUserId ? '#3b82f6' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: selectedUserId ? 'pointer' : 'not-allowed'
          }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}

export default Login;