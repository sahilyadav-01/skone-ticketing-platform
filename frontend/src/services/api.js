import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';

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

  query = query.order('created_at', { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { tickets: data || [], total: count || 0, page, page_size };
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

export async function createTicket(ticketData) {
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      client_id: ticketData.client_id,
      asset_id: ticketData.asset_id || null,
      issue_type: ticketData.issue_type,
      subject: ticketData.subject || '',
      priority: ticketData.priority || 'Low',
      error_code: ticketData.error_code || null,
      status: ticketData.status || 'Open',
      assigned_tech: ticketData.assigned_tech || null,
      description: ticketData.description
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
  // Create the user via an isolated Supabase auth client (does not disturb admin session)
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const { data: authData, error: signUpError } = await tempClient.auth.signUp({
    email,
    password: password_hash,
    options: {
      data: { username, role }
    }
  });

  if (signUpError) {
    throw new Error(signUpError.message || 'Failed to create user account.');
  }

  if (!authData?.user) {
    throw new Error('User account creation did not return a user. The email may already be registered.');
  }

  // The database trigger `handle_new_user` inserts a row in public.users with role='Client'.
  // Update it to the requested role/username.
  const { error: updateErr } = await supabase
    .from('users')
    .update({ role, username, email })
    .eq('user_id', authData.user.id);

  if (updateErr) {
    console.warn('Role update after signup failed (may need manual fix):', updateErr);
  }

  return {
    user_id: authData.user.id,
    username,
    email,
    role
  };
}

export async function adminUpdateUser(userId, patch) {
  // Update the public.users table directly
  const updatePayload = {};
  if (patch.username) updatePayload.username = patch.username;
  if (patch.email) updatePayload.email = patch.email;
  if (patch.role) updatePayload.role = patch.role;

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('user_id', userId)
    .select()
    .single();

  if (dbError) {
    throw new Error(dbError.message || 'Failed to update user in database.');
  }

  return dbUser;
}

export async function adminDeleteUser(userId) {
  // Delete from public.users table directly
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('user_id', userId);

  if (dbError) {
    throw new Error(dbError.message || 'Failed to delete user.');
  }

  return true;
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


