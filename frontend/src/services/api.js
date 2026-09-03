import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';

async function extractErrorMessage(error) {
  if (!error) return 'An unexpected error occurred';
  if (error.context) {
    try {
      const errJson = await error.context.json();
      if (errJson?.error) return errJson.error;
      if (errJson?.message) return errJson.message;
    } catch {
      try {
        const text = await error.context.text();
        if (text) return text;
      } catch {}
    }
  }
  if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
    return error.message;
  }
  return 'The request could not be processed. Please verify your credentials or user details.';
}

async function getAuthHeader() {
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes?.data?.session?.access_token || localStorage.getItem('jwt_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    const token = localStorage.getItem('jwt_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

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
  const headers = await getAuthHeader();
  let edgeError = null;

  // 1. Try invoking manage-users Edge Function first
  try {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      headers,
      body: {
        action: 'create',
        payload: { username, email, password: password_hash, role }
      }
    });

    if (!error && data && data.user_id) {
      return data;
    }
    edgeError = error;
  } catch (err) {
    edgeError = err;
  }

  // 2. Resilient Fallback: If Edge Function returns non-2xx (e.g. 401/403 or unavailable),
  // create the user through isolated auth signUp (without altering current admin session)
  try {
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
        data: {
          username,
          role
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    if (authData?.user) {
      // Explicitly update database role from 'Client' to requested role
      await supabase
        .from('users')
        .update({ role, username, email })
        .eq('user_id', authData.user.id);

      return {
        user_id: authData.user.id,
        username,
        email,
        role
      };
    }
  } catch (fallbackError) {
    if (fallbackError?.message) {
      throw new Error(fallbackError.message);
    }
  }

  // 3. If both failed, extract descriptive error message
  const msg = await extractErrorMessage(edgeError);
  throw new Error(msg);
}

export async function adminUpdateUser(userId, patch) {
  const headers = await getAuthHeader();
  const payload = { 
    userId, 
    username: patch.username, 
    email: patch.email, 
    role: patch.role 
  };
  
  if (patch.password_hash) {
    payload.password = patch.password_hash;
  }

  let edgeError = null;
  try {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      headers,
      body: {
        action: 'update',
        payload
      }
    });

    if (!error && data && data.user_id) {
      return data;
    }
    edgeError = error;
  } catch (err) {
    edgeError = err;
  }

  // Fallback: update database users table directly
  try {
    const updatePayload = {
      username: patch.username,
      email: patch.email,
      role: patch.role
    };

    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('user_id', userId)
      .select()
      .single();

    if (!dbError && dbUser) {
      return dbUser;
    }
  } catch (fallbackErr) {
    console.warn('Direct database update fallback error:', fallbackErr);
  }

  const msg = await extractErrorMessage(edgeError);
  throw new Error(msg);
}

export async function adminDeleteUser(userId) {
  const headers = await getAuthHeader();
  let edgeError = null;

  try {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      headers,
      body: {
        action: 'delete',
        payload: { userId }
      }
    });

    if (!error) {
      return true;
    }
    edgeError = error;
  } catch (err) {
    edgeError = err;
  }

  // Fallback: delete from users table directly
  try {
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (!dbError) {
      return true;
    }
  } catch (fallbackErr) {
    console.warn('Direct database delete fallback error:', fallbackErr);
  }

  const msg = await extractErrorMessage(edgeError);
  throw new Error(msg);
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


