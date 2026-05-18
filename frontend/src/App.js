import { useEffect, useState } from 'react';
import { createTicket, fetchTicketsWithParams, updateTicket } from './api';

import TicketForm from './components/TicketForm';

import TicketList from './components/TicketList';
import LoginReal from './components/LoginReal';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';






const API_BASE = '/api';


function App() {
  const [user, setUser] = useState(null);
  const [devBypass, setDevBypass] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', assigned_tech: '', page: 1, page_size: 20, total: 0 });
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    if (!user) return;

    loadTickets();
  }, [user, filters]);

  // Restore user session from localStorage if available
  useEffect(() => {
    try {
      const id = localStorage.getItem('user_id');
      const role = localStorage.getItem('user_role');
      const username = localStorage.getItem('username');
      if (id && role) {
        setUser({ user_id: Number(id), role, username: username || 'User' });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Developer bypass: allow using ?bypass=1 to skip login in dev environments.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('bypass') === '1') {
        const devUser = { user_id: 9999, role: 'Admin', username: 'Dev Bypass' };
        localStorage.setItem('DEV_BYPASS', '1');
        localStorage.setItem('user_id', String(devUser.user_id));
        localStorage.setItem('user_role', String(devUser.role));
        localStorage.setItem('username', String(devUser.username));
        setUser(devUser);
        setDevBypass(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      // Use paginated API
      const page = filters.page || 1;
      const page_size = filters.page_size || 20;
      const params = { page, page_size, status: filters.status || '', assigned_tech: filters.assigned_tech || '', client_id: user.role === 'Client' ? user.user_id : '' };
      data = await fetchTicketsWithParams(params);
      // data: { tickets, total, page, page_size }
      setTickets(data.tickets || []);
      setFilters((prev) => ({ ...prev, total: data.total || 0, page: data.page || page, page_size: data.page_size || page_size }));
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

  const isClient = user?.role === 'Client';

  const renderPortal = () => {
    if (!user) return null;

    const emptyState = (
      <div className="ticket-card" style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>📭 No tickets yet</div>
        <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Your ticket feed is unavailable or there are no tickets to display yet.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btnPrimary" onClick={() => loadTickets()} type="button">
            Retry
          </button>
          {isClient && (
            <button className="btn btnPrimary" onClick={() => setActiveView('create')} type="button">
              Create Ticket
            </button>
          )}
        </div>
      </div>
    );

    if (isClient) {
      if (activeView === 'create') {
        return (
          <>
            <TicketForm onSubmit={handleSubmit} defaultClientId={user.user_id} />
            {error && emptyState}
          </>
        );
      }

      return (
        <>
          {error && emptyState}
          <TicketList
            tickets={tickets}
            loading={loading}
            page={filters.page}
            page_size={filters.page_size}
            total={filters.total}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        </>
      );
    }

    if (activeView === 'dashboard') {
      return null;
    }

    if (activeView === 'assets') {
      return (
        <div className="ticket-card" style={{ marginTop: 14 }}>
          <h2>Asset Registry</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            Asset search and inventory are coming soon. For now, use ticket details to track hardware and deployments.
          </p>
        </div>
      );
    }

    if (activeView === 'users') {
      return (
        <div className="ticket-card" style={{ marginTop: 14 }}>
          <h2>User management</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            Admin user lists and role controls will appear here once the next release ships.
          </p>
        </div>
      );
    }

    if (activeView === 'reports') {
      return (
        <div className="ticket-card" style={{ marginTop: 14 }}>
          <h2>Reports & analytics</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            This workspace is preparing more reporting features for SLA performance and ticket volume.
          </p>
        </div>
      );
    }

    return (
      <>
        {error && emptyState}
        <TicketList
          tickets={tickets}
          loading={loading}
          isSupport={true}
          onUpdateTicket={handleUpdateTicket}
          page={filters.page}
          page_size={filters.page_size}
          total={filters.total}
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
        />
      </>
    );
  };

  return (
    <div className="page">
      <div className="container" style={{ display: 'grid', gridTemplateColumns: user ? '240px 1fr' : '1fr', gap: 18, minHeight: '100vh', paddingTop: 18 }}>
        {user && (
          <Sidebar
            role={user.role}
            activeView={activeView}
            onNavigate={(view) => {
              setActiveView(view);
              setError(null);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
          />
        )}

        <main>
          <header className="pageHeader">
            <h1>Skone IT Ticketing</h1>
            <p>Submit a request, review ticket status, and stay on top of IT work.</p>
          </header>

          {!user ? (
            <LoginReal
              onLogin={(u, token) => {
                try {
                  if (token) localStorage.setItem('jwt_token', token);
                  if (u?.user_id !== undefined) localStorage.setItem('user_id', String(u.user_id));
                  if (u?.role) localStorage.setItem('user_role', String(u.role));
                  if (u?.username) localStorage.setItem('username', String(u.username));
                } catch {}
                setUser(u);
              }}
            />
          ) : (
            <>
              <div style={{ marginBottom: 18, color: '#374151', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <div>
                  Signed in as <strong>{user.username}</strong>
                  <span style={{ marginLeft: 8, color: '#6b7280' }}>({user.role})</span>
                </div>
                <button onClick={() => setUser(null)} className="btn btnDanger">
                  Logout
                </button>
              </div>

              {activeView === 'dashboard' && (
                <Dashboard
                  user={user}
                  recentTickets={tickets}
                  onFilter={(f) => {
                    if (f?.view) setActiveView(f.view);
                    setFilters((prev) => ({ ...prev, ...f, page: 1 }));
                  }}
                />
              )}

              {user.role !== 'Client' && (
                <>
                  <div className="toolbar">
                    <select
                      className="control"
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                      style={{ maxWidth: 260 }}
                    >
                      <option value="">All statuses</option>
                      <option value="Open">Open</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting for Vendor">Waiting for Vendor</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>

                    <input
                      className="control"
                      type="text"
                      value={filters.assigned_tech}
                      onChange={(e) => setFilters((prev) => ({ ...prev, assigned_tech: e.target.value, page: 1 }))}
                      placeholder="Filter by assigned tech"
                      style={{ minWidth: 220, flex: 1 }}
                    />
                  </div>
                  {(filters.status || filters.assigned_tech) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
                      {filters.status && (
                        <button type="button" className="filter-chip" onClick={() => setFilters((prev) => ({ ...prev, status: '', page: 1 }))}>
                          Status: {filters.status} ×
                        </button>
                      )}
                      {filters.assigned_tech && (
                        <button type="button" className="filter-chip" onClick={() => setFilters((prev) => ({ ...prev, assigned_tech: '', page: 1 }))}>
                          Assigned: {filters.assigned_tech} ×
                        </button>
                      )}
                      <button type="button" className="filter-chip" onClick={() => setFilters((prev) => ({ ...prev, status: '', assigned_tech: '', page: 1 }))}>
                        Clear filters
                      </button>
                    </div>
                  )}
                </>
              )}

              {renderPortal()}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;




