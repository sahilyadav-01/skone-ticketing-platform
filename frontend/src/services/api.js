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
    .select('*, client:client_id(username, email), asset:asset_id(*)', { count: 'exact' });

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
  const payload = {
    updated_at: new Date().toISOString()
  };
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.assigned_tech !== undefined) payload.assigned_tech = patch.assigned_tech;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.description !== undefined) payload.description = patch.description;

  const { data, error } = await supabase
    .from('tickets')
    .update(payload)
    .eq('ticket_id', ticketId)
    .select('*, client:client_id(username, email), asset:asset_id(*)')
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
    .select('*, client:client_id(username, email)');

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query
    .order('name')
    .limit(100);

  if (error) throw error;
  return data;
}

export async function createAsset(asset) {
  const { data, error } = await supabase
    .from('assets')
    .insert({
      name: asset.name,
      client_id: asset.client_id,
      deployment_date: asset.deployment_date || null,
      last_maintenance_date: asset.last_maintenance_date || null,
      status: asset.status || 'Active'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsset(assetId, patch) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      name: patch.name,
      client_id: patch.client_id,
      deployment_date: patch.deployment_date || null,
      last_maintenance_date: patch.last_maintenance_date || null,
      status: patch.status || 'Active'
    })
    .eq('asset_id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAsset(assetId) {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('asset_id', assetId);

  if (error) throw error;
  return true;
}

export async function fetchComments(ticketId) {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select('*, user:user_id(username, role)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createComment(ticketId, userId, message) {
  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      message: message
    })
    .select('*, user:user_id(username, role)')
    .single();

  if (error) throw error;
  return data;
}

export async function fetchTicketHistory(ticketId) {
  const { data, error } = await supabase
    .from('ticket_history')
    .select('*, changed_by_user:changed_by(username, role)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


