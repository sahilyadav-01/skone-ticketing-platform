import { useEffect, useState } from 'react';
import { createTicket, fetchTicketsForClient, updateTicket } from './api';



import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import LoginReal from './components/LoginReal';






const API_BASE = '/api';


function App() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', assigned_tech: '' });

  useEffect(() => {
    if (!user) return;

    loadTickets();
  }, [user, filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      if (user.role === 'Client') {
        data = await fetchTicketsForClient(user.user_id);
      } else {
        // Support/Admin see all tickets with optional filters
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.assigned_tech) queryParams.append('assigned_tech', filters.assigned_tech);
        const queryString = queryParams.toString();
        data = await fetch(`${API_BASE}/tickets${queryString ? '?' + queryString : ''}`);
        if (!data.ok) throw new Error('Failed to fetch tickets');
        data = await data.json();
      }
      setTickets(data);
    } catch (err) {
      setError('Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (ticket) => {
    if (!user || user.role !== 'Client') return;
    const created = await createTicket({
      ...ticket,
      client_id: user.user_id,
    });
    setTickets((prev) => [created, ...prev]);
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    const updated = await updateTicket(ticketId, updates);
    setTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticketId ? updated : t))
    );
  };

  const renderPortal = () => {
    if (user.role === 'Client') {

      return (


        <>
          <TicketForm onSubmit={handleSubmit} defaultClientId={user.user_id} />

          {error && (
            <div style={{ color: '#b91c1c', marginTop: 12 }} role="alert">
              {error}
            </div>
          )}
          <TicketList tickets={tickets} loading={loading} />
        </>
      );
    } else {
      // Support/Admin portal
      return (
        <>
          <div style={{ marginBottom: 18 }}>
            <h2>Support Portal</h2>
            <p>Manage and update all tickets.</p>
          </div>

          {error && (
            <div style={{ color: '#b91c1c', marginTop: 12 }} role="alert">
              {error}
            </div>
          )}
          <TicketList
            tickets={tickets}
            loading={loading}
            isSupport={true}
            onUpdateTicket={handleUpdateTicket}
          />
        </>
      );
    }
  };

  return (
    <div className="page">
      <div className="container">
        <header className="pageHeader">
          <h1>Skone IT Ticketing</h1>
          <p>Submit a ticket or review the latest requests.</p>
        </header>

        {!user ? (
          <>
            <LoginReal

              onLogin={(u, token) => {
                try {
                  if (token) localStorage.setItem('jwt_token', token);
                  if (u?.user_id !== undefined) localStorage.setItem('user_id', String(u.user_id));
                  if (u?.role) localStorage.setItem('user_role', String(u.role));
                } catch {}
                setUser(u);
              }}
            />
          </>
        ) : (

          <>
            <div style={{ marginBottom: 18, color: '#374151' }}>
              Signed in as <strong>{user.username}</strong>
              <span style={{ marginLeft: 8, color: '#6b7280' }}>({user.role})</span>
              <button onClick={() => setUser(null)} className="btn btnDanger" style={{ marginLeft: 16 }}>
                Logout
              </button>
            </div>

            {user.role !== 'Client' && (
              <div className="toolbar">
                <select
                  className="control"
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  style={{ maxWidth: 260 }}
                >
                  <option value="">All statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <input
                  className="control"
                  type="text"
                  value={filters.assigned_tech}
                  onChange={(e) => setFilters((prev) => ({ ...prev, assigned_tech: e.target.value }))}
                  placeholder="Filter by assigned tech"
                  style={{ minWidth: 220, flex: 1 }}
                />
              </div>
            )}

            {renderPortal()}
          </>
        )}
      </div>
    </div>
  );
}

export default App;




