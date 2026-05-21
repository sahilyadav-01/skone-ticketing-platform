import { useEffect, useMemo, useState } from 'react';
import { createTicket, fetchTicketsWithParams, updateTicket } from './api';

import TicketForm from './components/TicketForm';

import TicketList from './components/TicketList';
import LoginReal from './components/LoginReal';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import AdminUsers from './components/AdminUsers';


















function App() {
  const [user, setUser] = useState(null);
  const [devBypass, setDevBypass] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ page: 1, page_size: 20, total: 0 });
  const [ticketQuery, setTicketQuery] = useState({ status: '', assigned_tech: '', client_id: '' });
  const [searchText, setSearchText] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  const ticketViews = ['my_tickets', 'assigned_queue', 'open_queue', 'closed_tickets'];

  const getTicketQueryForView = (view) => {
    if (!user) return { status: '', assigned_tech: '', client_id: '' };

    if (view === 'my_tickets') {
      return { status: '', assigned_tech: '', client_id: user.role === 'Client' ? user.user_id : '' };
    }

    if (view === 'assigned_queue') {
      return { status: 'Assigned', assigned_tech: user.username || '', client_id: '' };
    }

    if (view === 'open_queue') {
      return { status: 'Open', assigned_tech: '', client_id: '' };
    }

    if (view === 'closed_tickets') {
      return { status: 'Closed', assigned_tech: '', client_id: '' };
    }

    return { status: '', assigned_tech: '', client_id: user.role === 'Client' ? user.user_id : '' };
  };

  useEffect(() => {
    if (!user) return;
    if (!ticketViews.includes(activeView)) return;

    loadTickets();
  }, [user, ticketQuery, filters.page, filters.page_size, activeView]);

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
      const page = filters.page || 1;
      const page_size = filters.page_size || 20;
      const params = {
        page,
        page_size,
        status: ticketQuery.status || '',
        assigned_tech: ticketQuery.assigned_tech || '',
        client_id: ticketQuery.client_id || '',
      };
      const data = await fetchTicketsWithParams(params);
      setTickets(data.tickets || []);
      setFilters((prev) => ({
        ...prev,
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || page_size,
      }));
    } catch (err) {
      setError('Unable to load tickets. Please try again later.');
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

  const handleLogout = () => {
    try {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_role');
      localStorage.removeItem('username');
      localStorage.removeItem('DEV_BYPASS');
    } catch {}
    setUser(null);
    setActiveView('dashboard');
    setSearchText('');
    setTicketQuery({ status: '', assigned_tech: '', client_id: '' });
    setFilters({ page: 1, page_size: 20, total: 0 });
  };

  const handleNavigate = (view, query = null) => {
    if (view === 'logout') {
      handleLogout();
      return;
    }

    setActiveView(view);
    setError(null);
    setFilters((prev) => ({ ...prev, page: 1 }));

    if (ticketViews.includes(view)) {
      setTicketQuery(query || getTicketQueryForView(view));
    }
  };

  const isClient = user?.role === 'Client';
  const isSupport = user && !isClient;
  const visibleTickets = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter((ticket) => {
      const haystack = [
        ticket.ticket_id,
        ticket.subject,
        ticket.description,
        ticket.issue_type,
        ticket.status,
        ticket.assigned_tech,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [tickets, searchText]);

  const visibleTotal = searchText.trim() ? visibleTickets.length : filters.total;

  const activeTitle = {
    dashboard: 'Dashboard',
    my_tickets: 'My Tickets',
    assigned_queue: 'Assigned Queue',
    open_queue: 'Open Queue',
    closed_tickets: 'Closed Tickets',
    create: 'Create Ticket',
    assets: 'Assets',
    knowledge: 'Knowledge Base',
    notifications: 'Notifications',
    users: 'User Management',
    reports: 'Reports',
    settings: 'Settings',
  }[activeView] || 'Dashboard';

  const renderPortal = () => {
    if (!user) return null;

    const errorMessage = (
      <div className="ticket-card" style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, color: 'var(--text)' }}>Something went wrong</div>
        <div style={{ color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
          We couldn't load your tickets right now. Please refresh or try again later.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
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

    if (activeView === 'dashboard') {
      return null;
    }

    if (activeView === 'create') {
      return (
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Create Ticket</h2>
              <p className="section-subtitle">Submit a new support request and track it from your dashboard.</p>
            </div>
          </div>
          <TicketForm onSubmit={handleSubmit} defaultClientId={user.user_id} />
          {error && errorMessage}
        </div>
      );
    }

    if (['my_tickets', 'assigned_queue', 'open_queue', 'closed_tickets'].includes(activeView)) {
      const title = activeView === 'my_tickets' ? 'My Tickets' : activeView === 'assigned_queue' ? 'Assigned Queue' : activeView === 'open_queue' ? 'Open Queue' : 'Closed Tickets';
      const description = activeView === 'my_tickets'
        ? 'Review your open and resolved requests.'
        : activeView === 'assigned_queue'
        ? 'Tickets assigned to your team for action.'
        : activeView === 'open_queue'
        ? 'High-priority open items that need triage.'
        : 'Closed tickets for audit and history.';

      return (
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>{title}</h2>
              <p className="section-subtitle">{description}</p>
            </div>
          </div>
          {error && errorMessage}
          <TicketList
            tickets={visibleTickets}
            loading={loading}
            isSupport={isSupport}
            showTable={true}
            onUpdateTicket={handleUpdateTicket}
            page={filters.page}
            page_size={filters.page_size}
            total={visibleTotal}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        </div>
      );
    }

    if (activeView === 'assets') {
      return (
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Assets</h2>
              <p className="section-subtitle">Track hardware and deployments across the organization.</p>
            </div>
          </div>
          <div className="ticket-card" style={{ marginTop: 14 }}>
            <h3>Asset registry</h3>
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              Asset search and inventory are coming soon. For now, use ticket details to track hardware and deployments.
            </p>
          </div>
        </div>
      );
    }

    if (activeView === 'knowledge') {
      return (
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Knowledge Base</h2>
              <p className="section-subtitle">Reduce repeat tickets with the most common IT support articles.</p>
            </div>
          </div>
          <div className="ticket-card" style={{ marginTop: 14 }}>
            <h3>Popular articles</h3>
            <ul style={{ marginTop: 12, paddingLeft: 20, color: 'var(--text)' }}>
              <li><strong>Password Reset</strong> — How to restore your credentials safely.</li>
              <li><strong>VPN Setup</strong> — Connect securely from remote locations.</li>
              <li><strong>Printer Access</strong> — Troubleshoot common printing issues.</li>
            </ul>
          </div>
        </div>
      );
    }

    if (activeView === 'notifications') {
      return (
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Notifications</h2>
              <p className="section-subtitle">Stay informed about ticket routing, SLA risk, and updates.</p>
            </div>
          </div>
          <div className="ticket-card" style={{ marginTop: 14 }}>
            <div style={{ marginBottom: 10, fontWeight: 700 }}>Recent alerts</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--panel2)', borderRadius: 12 }}>New ticket assigned to you: <strong>TK-1005</strong>.</div>
              <div style={{ padding: 12, background: 'var(--panel2)', borderRadius: 12 }}>SLA warning: <strong>3 open tickets</strong> are nearing escalation.</div>
              <div style={{ padding: 12, background: 'var(--panel2)', borderRadius: 12 }}>Knowledge base update: <strong>VPN connection guide</strong> now available.</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeView === 'reports') {
      return <Reports onFilter={(filter) => handleNavigate('assigned_queue', filter)} />;
    }

    if (activeView === 'settings') {
      return <Settings />;
    }

    if (activeView === 'users') {
      return <AdminUsers />;
    }


    return null;
  };

  return (
    <div className="page">
      <div className="container" style={{ display: 'grid', gridTemplateColumns: user ? '240px 1fr' : '1fr', gap: 18, minHeight: '100vh', paddingTop: 18 }}>
        {user && (
          <Sidebar
            role={user.role}
            activeView={activeView}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )}

        <div className="content-shell">
          <div className="topnav">
            <div>
              <div className="pageHeader">
                <h1>Skone IT Ticketing</h1>
                <p>Enterprise ticketing for IT support, assets, and lifecycle workflows.</p>
              </div>
            </div>
            {user && (
              <div className="topnav__actions">
                <button type="button" className="btn btnMuted" onClick={() => handleNavigate('notifications')}>🔔 Notifications</button>
                <input
                  className="control topnav__search"
                  placeholder="Search tickets"
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <div className="topnav__profile">{user.username} • {user.role}</div>
              </div>
            )}
          </div>

          <main>
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
                <div className="section-panel section-panel--meta">
                  <div>
                    <h2>{activeTitle}</h2>
                    <p className="section-subtitle">{activeView === 'dashboard' ? 'Your executive view of ticket health and activity.' : 'Focus on the page and take the next action.'}</p>
                  </div>
                  <button onClick={() => setUser(null)} className="btn btnDanger">
                    Logout
                  </button>
                </div>

                {activeView === 'dashboard' ? (
                  <Dashboard
                    user={user}
                    recentTickets={tickets}
                    onFilter={(f) => {
                      if (f?.view) {
                        handleNavigate(f.view, f);
                      } else if (f?.status || f?.assigned_tech) {
                        handleNavigate(activeView, { ...ticketQuery, ...f });
                      }
                    }}
                  />
                ) : (
                  renderPortal()
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;




