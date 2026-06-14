import { supabase } from './supabaseClient';

export async function fetchTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function fetchTicketsWithParams({ page = 1, page_size = 20, status = '', assigned_tech = '', client_id = '' } = {}) {
  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (assigned_tech) query = query.eq('assigned_tech', assigned_tech);
  if (client_id) query = query.eq('client_id', client_id);

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  
  return { 
    tickets: data || [], 
    total: count || 0, 
    page, 
    page_size 
  };
}

export async function fetchTicketsForClient(clientId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function fetchAllTickets() {
  return fetchTickets();
}

export async function createTicket(ticket) {
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      client_id: ticket.client_id,
      asset_id: ticket.asset_id || null,
      issue_type: ticket.issue_type,
      subject: ticket.subject || '',
      priority: ticket.priority || 'Low',
      error_code: ticket.error_code || null,
      status: ticket.status || 'Open',
      assigned_tech: ticket.assigned_tech || null,
      description: ticket.description
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTicket(ticketId, patch) {
  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: patch.status,
      assigned_tech: patch.assigned_tech,
      description: patch.description,
      updated_at: new Date().toISOString()
    })
    .eq('ticket_id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function adminFetchUsers(role = '') {
  let query = supabase
    .from('users')
    .select('*');

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminCreateUser({ username, email, password_hash, role }) {
  // We invoke the 'manage-users' Edge Function to create the auth credentials securely.
  // password_hash is passed from the form as the raw plain password.
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: {
      action: 'create',
      payload: { username, email, password: password_hash, role }
    }
  });

  if (error) throw error;
  return data;
}

export async function adminUpdateUser(userId, patch) {
  const payload = { 
    userId, 
    username: patch.username, 
    email: patch.email, 
    role: patch.role 
  };
  
  if (patch.password_hash) {
    payload.password = patch.password_hash;
  }

  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: {
      action: 'update',
      payload
    }
  });

  if (error) throw error;
  return data;
}

export async function adminDeleteUser(userId) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: {
      action: 'delete',
      payload: { userId }
    }
  });

  if (error) throw error;
  return data;
}

export async function fetchTicketSummary() {
  const { data, error } = await supabase.rpc('get_ticket_summary');
  if (error) throw error;
  return data;
}

export async function fetchAssets(q = '') {
  let query = supabase
    .from('assets')
    .select('*');

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query
    .order('name')
    .limit(100);

  if (error) throw error;
  return data;
}
