import React from 'react';

function Sidebar({ role, activeView, onNavigate, onLogout }) {
  const links = [
    { key: 'dashboard', label: 'Dashboard' },
  ];

  if (role === 'Client') {
    links.push({ key: 'my_tickets', label: 'My Tickets' });
    links.push({ key: 'create', label: 'Create Ticket' });
    links.push({ key: 'assets', label: 'Assets' });
  } else {
    links.push({ key: 'assigned_queue', label: 'Assigned Queue' });
    links.push({ key: 'open_queue', label: 'Open Queue' });
    links.push({ key: 'closed_tickets', label: 'Closed Tickets' });
    links.push({ key: 'assets', label: 'Assets' });

    // Admin-only console links
    if (role === 'Admin') {
      links.push({ key: 'users', label: 'Users' });
    }

    links.push({ key: 'reports', label: 'Reports' });
    links.push({ key: 'settings', label: 'Settings' });
  }


  return (
    <div className="sidebar">
      <div style={{ marginBottom: 18, fontWeight: 900, fontSize: 18 }}>Skone ITSM</div>
      {links.map((l) => {
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
            {l.label}
          </a>
        );
      })}
      <div style={{ marginTop: 16, borderTop: '1px solid rgba(17,24,39,0.08)', paddingTop: 12 }}>
        <a
          href="#"
          className={activeView === 'logout' ? 'isActive' : ''}
          onClick={(e) => {
            e.preventDefault();
            if (onLogout) onLogout();
          }}
          style={{ color: 'var(--danger)' }}
        >
          Logout
        </a>
      </div>
    </div>
  );
}

export default Sidebar;
