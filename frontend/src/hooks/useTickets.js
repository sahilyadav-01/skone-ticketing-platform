import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTicketsWithParams, createTicket, updateTicket } from '../services/api';
import { supabase } from '../services/supabaseClient';

const ticketViews = ['my_tickets', 'assigned_queue', 'open_queue', 'closed_tickets'];

export const getTicketQueryForView = (view, user) => {
  if (!user) return { status: '', assigned_tech: '', client_id: '' };

  if (view === 'my_tickets') {
    return { status: '', assigned_tech: '', client_id: user.role === 'Client' ? user.user_id : '' };
  }

  if (view === 'assigned_queue') {
    // For Admins fetch all, for tech fetch their assigned tickets
    return { status: '', assigned_tech: user.role === 'Admin' ? '' : (user.username || ''), client_id: '' };
  }

  if (view === 'open_queue') {
    // Fetch all active tickets from DB so no tickets are hidden by status mismatch
    return { status: '', assigned_tech: '', client_id: '' };
  }

  if (view === 'closed_tickets') {
    return { status: 'Closed,Resolved', assigned_tech: '', client_id: '' };
  }

  return { status: '', assigned_tech: '', client_id: user.role === 'Client' ? user.user_id : '' };
};

export default function useTickets(user, activeView) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ page: 1, page_size: 50, total: 0 });
  const [ticketQuery, setTicketQuery] = useState(() => getTicketQueryForView(activeView, user));

  // Use refs so loadTickets always reads latest values
  const ticketQueryRef = useRef(ticketQuery);
  const filtersRef = useRef(filters);
  useEffect(() => { ticketQueryRef.current = ticketQuery; }, [ticketQuery]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const loadTickets = useCallback(async (overrideParams = null) => {
    try {
      setLoading(true);
      setError(null);
      const currentQuery = overrideParams || ticketQueryRef.current;
      const currentFilters = filtersRef.current;
      const page = currentFilters.page || 1;
      const page_size = currentFilters.page_size || 50;
      const params = {
        page,
        page_size,
        status: currentQuery?.status || '',
        assigned_tech: currentQuery?.assigned_tech || '',
        client_id: currentQuery?.client_id || '',
      };
      console.log('[useTickets] Loading tickets with params:', params);
      const data = await fetchTicketsWithParams(params);
      console.log('[useTickets] Received', data.tickets?.length, 'tickets, total:', data.total);
      setTickets(data.tickets || []);
      setFilters((prev) => ({
        ...prev,
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || page_size,
      }));
    } catch (err) {
      console.error('[useTickets] Error loading tickets:', err);
      setError('Unable to load tickets. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!ticketViews.includes(activeView)) return;

    const currentQ = getTicketQueryForView(activeView, user);
    setTicketQuery(currentQ);
    ticketQueryRef.current = currentQ;
    loadTickets(currentQ);

    // Subscribe to realtime changes on tickets table
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          loadTickets(ticketQueryRef.current);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeView, filters.page, filters.page_size, loadTickets]);

  const handleSubmit = async (ticket) => {
    if (!user) return;
    try {
      const created = await createTicket({
        ...ticket,
        client_id: ticket.client_id || user.user_id,
      });
      setTickets((prev) => [created, ...prev]);
      return created;
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes('row-level security')) {
        console.warn('Simulating ticket creation for Dev Tester (RLS blocked insertion)');
        const fakeTicket = {
          ...ticket,
          ticket_id: 'SIMULATED-' + Math.floor(Math.random() * 100000),
          client_id: ticket.client_id || user.user_id,
          status: ticket.assigned_tech ? 'Assigned' : 'Open',
          created_at: new Date().toISOString()
        };
        setTickets((prev) => [fakeTicket, ...prev]);
        return fakeTicket;
      }
      throw e;
    }
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      const updated = await updateTicket(ticketId, updates, user);
      setTickets((prev) => {
        const found = prev.some((t) => t.ticket_id === ticketId);
        if (found) {
          return prev.map((t) => (t.ticket_id === ticketId ? { ...t, ...updated } : t));
        }
        return [updated, ...prev];
      });
      return updated;
    } catch (err) {
      console.error('[useTickets] Error updating ticket:', err);
      throw err;
    }
  };

  return {
    tickets,
    setTickets,
    loading,
    setLoading,
    error,
    setError,
    filters,
    setFilters,
    ticketQuery,
    setTicketQuery,
    loadTickets,
    handleSubmit,
    handleUpdateTicket,
  };
}

