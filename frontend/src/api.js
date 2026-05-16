const API_BASE = '/api';

function getAuthContext() {
  try {
    const token = localStorage.getItem('jwt_token');
    const userId = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role');
    return { token, userId, role };
  } catch {
    return { token: null, userId: null, role: null };
  }
}

function withAuthHeaders(headers = {}) {
  const { token, userId, role } = getAuthContext();
  const next = { ...headers };

  if (token) {
    next.Authorization = `Bearer ${token}`;
  } else if (userId && role) {
    next['X-User-Id'] = String(userId);
    next['X-User-Role'] = String(role);
  }

  return next;
}

export async function fetchTickets() {
  const res = await fetch(`${API_BASE}/tickets`, { headers: withAuthHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch tickets');
  }
  return res.json();
}

export async function fetchTicketsForClient(clientId) {
  const res = await fetch(`${API_BASE}/tickets?client_id=${encodeURIComponent(clientId)}`, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch tickets for client');
  }
  return res.json();
}

export async function fetchAllTickets() {
  return fetchTickets();
}

export async function createTicket(ticket) {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(ticket),
  });

  if (!res.ok) {
    throw new Error('Failed to create ticket');
  }

  return res.json();
}

export async function updateTicket(ticketId, patch) {
  const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'PATCH',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to update ticket');
  }

  return res.json();
}

export async function adminFetchUsers(role = '') {
  const qs = role ? `?role=${encodeURIComponent(role)}` : '';
  const res = await fetch(`${API_BASE}/admin/users${qs}`, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to load users');
  }
  return res.json();
}

export async function adminCreateUser({ username, email, password_hash, role }) {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, email, password_hash, role }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to create user');
  }
  return res.json();
}

export async function adminUpdateUser(userId, patch) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to update user');
  }
  return res.json();
}

export async function adminDeleteUser(userId) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to delete user');
  }
  return res.json();
}






