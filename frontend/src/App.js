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
import TicketQueueWorkspace from './pages/TicketQueueWorkspace';
import KnowledgeBase from './pages/KnowledgeBase';
import NotificationsView from './pages/NotificationsView';

import useAuth from './hooks/useAuth';
import useTickets, { getTicketQueryForView } from './hooks/useTickets';

function App() {
  const { user, login, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [searchText, setSearchText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

    setIsSidebarOpen(false);
  };

  const isClient = user?.role === 'Client';
  const isSupport = user && !isClient;
  const visibleTickets = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    if (!query) return tickets;
    const cleanQuery = query.replace(/^tk-/, '');
    return tickets.filter((ticket) => {
      const haystack = [
        ticket.ticket_id,
        `tk-${ticket.ticket_id}`,
        ticket.subject,
        ticket.description,
        ticket.issue_type,
        ticket.status,
        ticket.assigned_tech,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(cleanQuery) || haystack.includes(query);
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
        <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <TicketForm
            onSubmit={handleSubmit}
            defaultClientId={user.user_id}
            onNavigate={handleNavigate}
            user={user}
          />
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

      if (['open_queue', 'assigned_queue', 'closed_tickets'].includes(activeView)) {
        return (
          <div className="section-panel">
            <div className="section-header">
              <div>
                <h2>{title}</h2>
                <p className="section-subtitle">{description}</p>
              </div>
            </div>
            {error && errorMessage}
            <TicketQueueWorkspace
              viewType={activeView}
              tickets={visibleTickets}
              loading={loading}
              isSupport={isSupport}
              onUpdateTicket={handleUpdateTicket}
              page={filters.page}
              page_size={filters.page_size}
              total={visibleTotal}
              onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
              onRefresh={loadTickets}
              currentUser={user}
            />
          </div>
        );
      }

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
            currentUser={user}
          />
        </div>
      );
    }

    if (activeView === 'assets') {
      return (
        <AssetsView currentUser={user} />
      );
    }


    if (activeView === 'knowledge') {
      return (
        <KnowledgeBase />
      );
    }

    if (activeView === 'notifications') {
      return (
        <NotificationsView onNavigate={handleNavigate} />
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
      {user && (
        <div 
          className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={`container ${user ? 'has-sidebar' : ''}`}>
        {user && (
          <Sidebar
            user={user}
            activeView={activeView}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            isSidebarOpen={isSidebarOpen}
          />
        )}

        <div className="content-shell">
          <div className="topnav">
            {user && (
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle navigation menu"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <div className="topnav-brand">
              <div className="topnav-brand__logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="topnav-brand__title">Skone ITSM</span>
            </div>
            {user && (
              <div className="topnav__actions">
                <div className="search-wrapper">
                  <svg className="search-wrapper__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="control topnav__search"
                    placeholder="Search tickets..."
                    type="search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="topnav-bell-btn"
                  onClick={() => handleNavigate('notifications')}
                  title="Notifications"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span className="topnav-bell-badge"></span>
                </button>
                <div className="topnav-user-chip">
                  <div className="topnav-user-avatar">
                    {user.username ? user.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                  </div>
                  <span>{user.username}</span>
                  <span className="topnav-user-role">{user.role}</span>
                </div>
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
                <div className="breadcrumb-bar">
                  <div className="breadcrumb-path">
                    <svg className="breadcrumb-path__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="9" rx="1" />
                      <rect x="14" y="3" width="7" height="5" rx="1" />
                      <rect x="14" y="12" width="7" height="9" rx="1" />
                      <rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                    <span>ITSM Portal</span>
                    <span className="breadcrumb-path__separator">/</span>
                    <span className="breadcrumb-path__active">{activeTitle}</span>
                  </div>
                  <button onClick={handleLogout} className="breadcrumb-logout" title="Sign out of portal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
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




