import React from 'react';

// Premium SVG Icon Components Mapping
const ICONS = {
  dashboard: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  my_tickets: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  create: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  assigned_queue: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  open_queue: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  closed_tickets: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  assets: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  users: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  reports: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  settings: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (className) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

// Premium Logo Brand Icon
const BrandLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

function Sidebar({ user, activeView, onNavigate, onLogout, isSidebarOpen }) {
  const role = user?.role || 'Client';
  const username = user?.username || 'User';

  const links = [
    { key: 'dashboard', label: 'Dashboard', category: 'main' },
  ];

  if (role === 'Client') {
    links.push({ key: 'my_tickets', label: 'My Tickets', category: 'main' });
    links.push({ key: 'create', label: 'Create Ticket', category: 'main' });
    links.push({ key: 'assets', label: 'Assets', category: 'resources' });
  } else {
    links.push({ key: 'assigned_queue', label: 'Assigned Queue', category: 'ops' });
    links.push({ key: 'open_queue', label: 'Open Queue', category: 'ops' });
    links.push({ key: 'closed_tickets', label: 'Closed Tickets', category: 'ops' });
    links.push({ key: 'assets', label: 'Assets', category: 'resources' });

    if (role === 'Admin') {
      links.push({ key: 'users', label: 'Users', category: 'admin' });
    }

    links.push({ key: 'reports', label: 'Reports', category: 'admin' });
    links.push({ key: 'settings', label: 'Settings', category: 'admin' });
  }

  const categories = [
    { id: 'main', label: 'Workspace' },
    { id: 'ops', label: 'Operations' },
    { id: 'resources', label: 'Resources' },
    { id: 'admin', label: 'System' }
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className={`sidebar ${isSidebarOpen ? 'isOpen' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <BrandLogo />
        </div>
        <div className="sidebar-title-group">
          <span className="sidebar-title">Skone ITSM</span>
          <div className="sidebar-status">
            <span className="sidebar-status-dot"></span>
            <span className="sidebar-status-text">System Active</span>
          </div>
        </div>
      </div>

      {/* Categorized Navigation */}
      <nav className="sidebar-navigation">
        {categories.map((cat) => {
          const catLinks = links.filter((l) => l.category === cat.id);
          if (catLinks.length === 0) return null;

          return (
            <div key={cat.id} className="sidebar-category">
              <span className="sidebar-category-title">{cat.label}</span>
              {catLinks.map((l) => {
                const isActive = l.key === activeView;
                return (
                  <a
                    key={l.key}
                    href="#"
                    className={isActive ? 'isActive' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigate) onNavigate(l.key);
                    }}
                  >
                    {ICONS[l.key] ? ICONS[l.key]('nav-icon') : null}
                    <span>{l.label}</span>
                  </a>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom Profile Details */}
      <div className="sidebar-profile">
        <div className="sidebar-profile-card">
          <div className="sidebar-avatar">{getInitials(username)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{username}</span>
            <span className="sidebar-role">{role}</span>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={(e) => {
              e.preventDefault();
              if (onLogout) onLogout();
            }}
            title="Logout"
            type="button"
          >
            {ICONS.logout('logout-icon')}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
