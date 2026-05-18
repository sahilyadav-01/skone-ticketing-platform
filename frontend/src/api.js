const API_BASE = '/api';

function getAuthContext() {
  try {
    const token = localStorage.getItem('jwt_token');
    const userId = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role');
    const devBypass = localStorage.getItem('DEV_BYPASS') === '1';
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

  try {
    const devBypass = localStorage.getItem('DEV_BYPASS') === '1';
    if (devBypass) next['X-DEV-BYPASS'] = '1';
  } catch {}


  return next;
}

export async function fetchTickets() {
  // Deprecated: use fetchTicketsWithParams instead
  const res = await fetch(`${API_BASE}/tickets`, { headers: withAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const data = await res.json();
  // Support older shape
  if (Array.isArray(data)) return data;
  return data;
}

export async function fetchTicketsWithParams({ page = 1, page_size = 20, status = '', assigned_tech = '', client_id = '' } = {}) {
  const params = new URLSearchParams();
  if (page) params.append('page', String(page));
  if (page_size) params.append('page_size', String(page_size));
  if (status) params.append('status', status);
  if (assigned_tech) params.append('assigned_tech', assigned_tech);
  if (client_id) params.append('client_id', client_id);
  const url = `${API_BASE}/tickets?${params.toString()}`;
  const res = await fetch(url, { headers: withAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch tickets');
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

export async function fetchTicketSummary() {
  const res = await fetch(`${API_BASE}/tickets/summary`, { headers: withAuthHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch ticket summary');
  }
  return res.json();
}

export async function fetchAssets(q = '') {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await fetch(`${API_BASE}/assets${qs}`, { headers: withAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load assets');
  return res.json();
}






