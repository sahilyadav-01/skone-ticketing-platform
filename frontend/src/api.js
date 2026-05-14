const API_BASE = '/api';

export async function fetchTickets() {
  const res = await fetch(`${API_BASE}/tickets`);
  if (!res.ok) {
    throw new Error('Failed to fetch tickets');
  }
  return res.json();
}

export async function fetchTicketsForClient(clientId) {
  const res = await fetch(`${API_BASE}/tickets?client_id=${encodeURIComponent(clientId)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch tickets for client');
  }
  return res.json();
}

export async function createTicket(ticket) {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticket),
  });

  if (!res.ok) {
    throw new Error('Failed to create ticket');
  }

  return res.json();
}

