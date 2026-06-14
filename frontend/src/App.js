import { useEffect, useMemo, useState } from 'react';

import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import Sidebar from './components/Sidebar';

import LoginReal from './pages/LoginReal';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AdminUsers from './pages/AdminUsers';
import AssetsView from './pages/AssetsView';

import useAuth from './hooks/useAuth';
import useTickets, { getTicketQueryForView } from './hooks/useTickets';

function App() {
  const { user, login, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [searchText, setSearchText] = useState('');

  const {
    tickets,
    loading,
    error,
    setError,
    filters,
    setFilters,
    ticketQuery,
    setTicketQuery,
    loadTickets,
    handleSubmit,
    handleUpdateTicket,
  } = useTickets(user, activeView);

  const ticketViews = ['my_tickets', 'assigned_queue', 'open_queue', 'closed_tickets'];

  const handleLogout = () => {
    logout();
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
      setTicketQuery(query || getTicketQueryForView(view, user));
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
        <AssetsView />
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
                onLogin={login}
              />
            ) : (
              <>
                <div className="section-panel section-panel--meta">
                  <div>
                    <h2>{activeTitle}</h2>
                    <p className="section-subtitle">{activeView === 'dashboard' ? 'Your executive view of ticket health and activity.' : 'Focus on the page and take the next action.'}</p>
                  </div>
                  <button onClick={handleLogout} className="btn btnDanger">
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




