import React from 'react';

function Sidebar({ role, activeView, onNavigate }) {
  const links = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tickets', label: 'My Tickets' },
    { key: 'create', label: 'Create Ticket' },
  ];

  if (role !== 'Client') {
    links.push({ key: 'queue', label: 'Assigned Queue' });
    links.push({ key: 'assets', label: 'Assets' });
  }
  if (role === 'Admin') {
    links.push({ key: 'users', label: 'Users' });
    links.push({ key: 'reports', label: 'Reports' });
  }

  return (
    <div className="sidebar">
      <div style={{ marginBottom: 8, fontWeight: 900 }}>Skone</div>
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
    </div>
  );
}

export default Sidebar;
