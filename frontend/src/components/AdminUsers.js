import { useEffect, useMemo, useState } from 'react';
import { adminCreateUser, adminDeleteUser, adminFetchUsers, adminUpdateUser } from '../api';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formMode, setFormMode] = useState('create');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const emptyForm = useMemo(
    () => ({
      username: '',
      email: '',
      password_hash: 'hash',
      role: 'Client',
    }),
    []
  );

  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setFormMode('create');
    setSelectedUserId(null);
    setForm(emptyForm);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchUsers();
      setUsers(data);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // run once
  }, []);


  const onEdit = (u) => {
    setFormMode('update');
    setSelectedUserId(u.user_id);
    setForm({
      username: u.username || '',
      email: u.email || '',
      password_hash: 'hash',
      role: u.role || 'Client',
    });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (formMode === 'create') {
        const created = await adminCreateUser(form);
        setUsers((prev) => [created, ...prev]);
        resetForm();
        return;
      }

      if (formMode === 'update') {
        const updated = await adminUpdateUser(selectedUserId, form);
        setUsers((prev) => prev.map((u) => (String(u.user_id) === String(selectedUserId) ? updated : u)));
        resetForm();
      }
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const del = async (userId) => {
    setError(null);
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => String(u.user_id) !== String(userId)));
      if (String(selectedUserId) === String(userId)) resetForm();
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Admin - User Management</h2>
          <p style={{ margin: 0, color: '#4b5563' }}>Create, update, or delete users. Admin role is required.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: '#b91c1c', marginTop: 12 }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="ticket-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>{formMode === 'create' ? 'Create user' : 'Update user'}</h3>

          <form onSubmit={submit}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Username</label>
            <input name="username" value={form.username} onChange={onChange} required style={{ width: '100%', padding: 8, marginBottom: 12 }} />

            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Email</label>
            <input name="email" value={form.email} onChange={onChange} required type="email" style={{ width: '100%', padding: 8, marginBottom: 12 }} />

            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Role</label>
            <select name="role" value={form.role} onChange={onChange} style={{ width: '100%', padding: 8, marginBottom: 12 }}>
              <option value="Client">Client</option>
              <option value="Support Engineer">Support Engineer</option>
              <option value="Admin">Admin</option>
            </select>

            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Password hash</label>
            <input name="password_hash" value={form.password_hash} onChange={onChange} style={{ width: '100%', padding: 8, marginBottom: 12 }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-btn" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Please wait...' : formMode === 'create' ? 'Create' : 'Save'}
              </button>
              <button type="button" className="btn" onClick={resetForm} style={{ padding: '8px 12px' }}>
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="ticket-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Users</h3>
          {loading ? <p>Loading users...</p> : null}
          {!loading && !users.length ? <p>No users found.</p> : null}

          {!loading && (
            <div style={{ display: 'grid', gap: 12 }}>
              {users.map((u) => (
                <div key={u.user_id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{u.email}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        Role: <span style={{ fontWeight: 600 }}>{u.role}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>#{u.user_id}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => onEdit(u)}
                          style={{ padding: '6px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => del(u.user_id)}
                          style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;

