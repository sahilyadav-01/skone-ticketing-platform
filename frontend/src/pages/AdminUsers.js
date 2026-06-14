import React, { useEffect, useMemo, useState } from 'react';
import { adminCreateUser, adminDeleteUser, adminFetchUsers, adminUpdateUser } from '../services/api';
import Modal from '../components/Modal';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [roleFilter, setRoleFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selectedUser, setSelectedUser] = useState(null);

  const emptyForm = useMemo(
    () => ({
      username: '',
      email: '',
      password_hash: '',
      role: 'Client',
    }),
    []
  );

  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchUsers();
      setUsers(data || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // AdminUsers endpoint is server-protected; if user isn't Admin,
    // fail fast client-side to avoid confusing 401/403.
    const role = localStorage.getItem('user_role');
    if (role !== 'Admin') {
      setError('Admin role required to manage users. Please login as an Admin.');
      return;
    }
    load();
  }, []);

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleOpenAddModal = () => {
    setError(null);
    setForm(emptyForm);
    setActiveModal('add');
  };

  const handleOpenEditModal = (u) => {
    setError(null);
    setSelectedUser(u);
    setForm({
      username: u.username || '',
      email: u.email || '',
      password_hash: '',
      role: u.role || 'Client',
    });
    setActiveModal('edit');
  };

  const handleOpenDeleteModal = (u) => {
    setError(null);
    setSelectedUser(u);
    setActiveModal('delete');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    resetForm();
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await adminCreateUser(form);
      setUsers((prev) => [created, ...prev]);
      triggerSuccess(`User "${form.username}" created successfully!`);
      closeModal();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const patch = {
        username: form.username,
        email: form.email,
        role: form.role,
        ...(form.password_hash ? { password_hash: form.password_hash } : {}),
      };
      const updated = await adminUpdateUser(selectedUser.user_id, patch);
      setUsers((prev) => prev.map((u) => (String(u.user_id) === String(selectedUser.user_id) ? updated : u)));
      triggerSuccess(`User "${form.username}" updated successfully!`);
      closeModal();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setError(null);
    setSaving(true);
    try {
      await adminDeleteUser(selectedUser.user_id);
      setUsers((prev) => prev.filter((u) => String(u.user_id) !== String(selectedUser.user_id)));
      triggerSuccess(`User "${selectedUser.username}" deleted successfully.`);
      closeModal();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const getUserAvatarGradient = (role) => {
    if (role === 'Admin') return 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)';
    if (role === 'Support Engineer') return 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)';
    return 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)';
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'Admin') return 'status-danger';
    if (role === 'Support Engineer') return 'status-warning';
    return 'status-success';
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Role Filter
      if (roleFilter !== 'All' && u.role !== roleFilter) {
        return false;
      }
      // 2. Search Query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const haystack = [
          u.user_id,
          u.username,
          u.email,
          u.role,
        ]
          .filter(Boolean)
          .map(String)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    const support = users.filter((u) => u.role === 'Support Engineer').length;
    const clients = users.filter((u) => u.role === 'Client').length;
    return { total, admins, support, clients };
  }, [users]);

  return (
    <div className="section-panel" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Page Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ background: 'linear-gradient(135deg, var(--blue) 0%, var(--teal) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', fontWeight: 900 }}>
            User Directory & Roles
          </h2>
          <p className="section-subtitle">Provision system users, configure access control, and update credentials.</p>
        </div>

        {/* Success alert banner */}
        {successMessage && (
          <div className="triage-saving-indicator" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <span className="triage-saving-success">✓ {successMessage}</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="assets-toolbar" style={{ background: 'var(--panel)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)', marginTop: 12 }}>
        <div className="assets-toolbar__actions">
          <button type="button" className="btn btnPrimary" onClick={handleOpenAddModal}>
            ⚡ Add User
          </button>
        </div>
        <div className="assets-toolbar__search">
          <input
            className="control"
            type="search"
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Interactive KPI Ribbon */}
      <div className="assets-stats" style={{ marginTop: 20 }}>
        <div
          className={`assets-kpi-card total`}
          style={{ cursor: 'pointer', borderLeft: roleFilter === 'All' ? '4px solid var(--blue)' : 'none' }}
          onClick={() => setRoleFilter('All')}
        >
          <div className="assets-stat__label">Total Accounts</div>
          <div className="assets-stat__value">{stats.total}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Full organization users</div>
        </div>

        <div
          className={`assets-kpi-card retired`}
          style={{ cursor: 'pointer', borderLeft: roleFilter === 'Admin' ? '4px solid var(--danger)' : 'none' }}
          onClick={() => setRoleFilter('Admin')}
        >
          <div className="assets-stat__label">Administrators</div>
          <div className="assets-stat__value" style={{ background: 'linear-gradient(135deg, var(--danger) 0%, #f87171 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.admins}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Full console access</div>
        </div>

        <div
          className={`assets-kpi-card assigned`}
          style={{ cursor: 'pointer', borderLeft: roleFilter === 'Support Engineer' ? '4px solid var(--purple)' : 'none' }}
          onClick={() => setRoleFilter('Support Engineer')}
        >
          <div className="assets-stat__label">Support Team</div>
          <div className="assets-stat__value" style={{ background: 'linear-gradient(135deg, var(--purple) 0%, var(--blue) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.support}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Technicians & support</div>
        </div>

        <div
          className={`assets-kpi-card available`}
          style={{ cursor: 'pointer', borderLeft: roleFilter === 'Client' ? '4px solid var(--teal)' : 'none' }}
          onClick={() => setRoleFilter('Client')}
        >
          <div className="assets-stat__label">Clients</div>
          <div className="assets-stat__value" style={{ background: 'linear-gradient(135deg, var(--teal) 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.clients}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Standard user profiles</div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="ticket-card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-dark)', background: 'rgba(15,23,42,0.01)' }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: '15px' }}>User Register</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              {loading ? 'Refreshing...' : `Showing ${filteredUsers.length} records`}
            </span>
          </div>
        </div>

        {error && !activeModal && (
          <div style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', fontWeight: 700, fontSize: 13, borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="assets-table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>User ID</th>
                <th style={{ width: '45%' }}>Profile Info</th>
                <th style={{ width: '20%' }}>System Role</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)' }}>
                    <strong style={{ fontSize: 14 }}>Loading user records...</strong>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={4} style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                    <strong style={{ display: 'block', fontSize: 14 }}>No users found matching filters.</strong>
                    <span style={{ fontSize: 12 }}>Try adjusting your search terms or filters above.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = u.username ? u.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
                  return (
                    <tr key={u.user_id}>
                      <td style={{ fontWeight: 900, color: 'var(--blue)' }}>USR-{u.user_id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="user-avatar-circle" style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: getUserAvatarGradient(u.role),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            fontFamily: "'Outfit', sans-serif",
                            border: '1.5px solid white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{u.username}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: 12, border: '1px solid rgba(37,99,235,0.15)', background: 'rgba(37,99,235,0.03)', color: 'var(--blue)' }}
                            onClick={() => handleOpenEditModal(u)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => handleOpenDeleteModal(u)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Add User Modal */}
      <Modal isOpen={activeModal === 'add'} onClose={closeModal} title="Add New User">
        <form onSubmit={handleAddUser}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 700 }}>⚠️ {error}</div>}
          <div className="modal-form-group" style={{ marginBottom: 16 }}>
            <label className="label">Username</label>
            <input
              name="username"
              type="text"
              className="control"
              value={form.username}
              onChange={onChange}
              placeholder="e.g. John Doe"
              required
            />
          </div>
          <div className="modal-form-group" style={{ marginBottom: 16 }}>
            <label className="label">Email Address</label>
            <input
              name="email"
              type="email"
              className="control"
              value={form.email}
              onChange={onChange}
              placeholder="e.g. john@company.com"
              required
            />
          </div>
          <div className="modal-form-group" style={{ marginBottom: 16 }}>
            <label className="label">System Role</label>
            <select
              name="role"
              className="control"
              value={form.role}
              onChange={onChange}
              required
            >
              <option value="Client">Client</option>
              <option value="Support Engineer">Support Engineer</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="modal-form-group" style={{ marginBottom: 20 }}>
            <label className="label">Password</label>
            <input
              name="password_hash"
              type="password"
              className="control"
              value={form.password_hash}
              onChange={onChange}
              placeholder="Choose a secure password"
              required
            />
          </div>
          <div className="modal-form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit User Modal */}
      <Modal isOpen={activeModal === 'edit'} onClose={closeModal} title="Edit User Properties">
        <form onSubmit={handleEditUser}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 700 }}>⚠️ {error}</div>}
          <div className="modal-form-group" style={{ marginBottom: 16 }}>
            <label className="label">Username</label>
            <input
              name="username"
              type="text"
              className="control"
              value={form.username}
              onChange={onChange}
              required
            />
          </div>
          <div className="modal-form-group" style={{ marginBottom: 16 }}>
            <label className="label">Email Address</label>
            <input
              name="email"
              type="email"
              className="control"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>
          <div className="modal-form-group" style={{ marginBottom: 16 }}>
            <label className="label">System Role</label>
            <select
              name="role"
              className="control"
              value={form.role}
              onChange={onChange}
              required
            >
              <option value="Client">Client</option>
              <option value="Support Engineer">Support Engineer</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="modal-form-group" style={{ marginBottom: 20 }}>
            <label className="label">Password</label>
            <input
              name="password_hash"
              type="password"
              className="control"
              value={form.password_hash}
              onChange={onChange}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <div className="modal-form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Delete Confirmation Modal */}
      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Confirm Deletion">
        <div style={{ padding: '8px 0' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete the user account for <strong>{selectedUser?.username}</strong> ({selectedUser?.email})?
          </p>
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.04)', border: '1.5px dashed rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, lineHeight: 1.4 }}>
              Warning: This operation is irreversible. All access credentials and associations will be revoked.
            </span>
          </div>
          <div className="modal-form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btnDanger" onClick={handleDeleteUser} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminUsers;

