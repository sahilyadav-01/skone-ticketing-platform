import React, { useState } from 'react';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'NT-201',
    title: 'New Incident Assigned',
    message: 'Ticket #TK-1005: "VPN Connection drops after 5 minutes" has been assigned to your workspace queue.',
    read: false,
    createdAt: '2026-07-09T18:30:00Z',
    category: 'incident',
    targetView: 'assigned_queue',
    targetQuery: { status: 'Assigned', assigned_tech: 'current_user' }
  },
  {
    id: 'NT-202',
    title: 'SLA Escalation Alert',
    message: 'High priority Ticket #TK-1002: "Database latency spike in Staging" is nearing SLA breach threshold (2 hours remaining).',
    read: false,
    createdAt: '2026-07-09T17:15:00Z',
    category: 'sla_warning',
    targetView: 'open_queue',
    targetQuery: { priority: 'High', status: 'Open' }
  },
  {
    id: 'NT-203',
    title: 'Client Comment Replied',
    message: 'Client Sahil Yadav left a comment on #TK-1010: "Configure lease hardware request".',
    read: true,
    createdAt: '2026-07-09T12:00:00Z',
    category: 'comment',
    targetView: 'closed_tickets',
    targetQuery: { status: 'Closed' }
  },
  {
    id: 'NT-204',
    title: 'Asset Assigned to You',
    message: 'Hardware Administrator issued Dell UltraSharp 34" Monitor (Asset: SKN-HW-493) to your employee account.',
    read: true,
    createdAt: '2026-07-08T09:45:00Z',
    category: 'asset',
    targetView: 'assets',
    targetQuery: null
  },
  {
    id: 'NT-205',
    title: 'Knowledge Base Article Available',
    message: 'New reference documentation posted: "Multi-Factor Authentication (MFA) Setup Guide". Check details for client setups.',
    read: true,
    createdAt: '2026-07-07T14:00:00Z',
    category: 'kb',
    targetView: 'knowledge',
    targetQuery: null
  }
];

function NotificationsView({ onNavigate }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Unread', 'Read'

  const toggleReadStatus = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification) => {
    // Navigate to respective route if callback is passed
    if (onNavigate && notification.targetView) {
      onNavigate(notification.targetView, notification.targetQuery);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'Unread') return !n.read;
    if (activeFilter === 'Read') return n.read;
    return true;
  });

  const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'incident':
        return (
          <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--blue)' }} className="notification-icon-wrap">
            🎫
          </div>
        );
      case 'sla_warning':
        return (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} className="notification-icon-wrap">
            ⏳
          </div>
        );
      case 'comment':
        return (
          <div style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--teal)' }} className="notification-icon-wrap">
            💬
          </div>
        );
      case 'asset':
        return (
          <div style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--purple)' }} className="notification-icon-wrap">
            💻
          </div>
        );
      default:
        return (
          <div style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--muted)' }} className="notification-icon-wrap">
            ℹ️
          </div>
        );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="section-panel" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2>Notifications</h2>
          <p className="section-subtitle">Stay informed about active queues, pending SLA triages, and comment logs.</p>
        </div>

        {/* Global Action Actions */}
        {notifications.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              type="button" 
              className="btn btnMuted" 
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              style={{ fontSize: 12.5, padding: '8px 14px' }}
            >
              Mark All as Read
            </button>
            <button 
              type="button" 
              className="btn btnDanger" 
              onClick={handleClearAll}
              style={{ fontSize: 12.5, padding: '8px 14px' }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="toolbar" style={{ margin: '20px 0', borderBottom: '1px solid var(--border-dark)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Unread', 'Read'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`btn ${activeFilter === filter ? 'btnPrimary' : 'btnMuted'}`}
              onClick={() => setActiveFilter(filter)}
              style={{ fontSize: 12.5, padding: '6px 14px', height: 36 }}
            >
              {filter} {filter === 'Unread' && unreadCount > 0 && `(${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredNotifications.length === 0 ? (
          <div className="ticket-card" style={{ padding: '40px', textAlignment: 'center', background: 'var(--panel)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>No Notifications</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                All clear! You don't have any {activeFilter.toLowerCase()} notifications.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`ticket-card notification-item-wrapper`}
              style={{
                display: 'flex',
                gap: 16,
                padding: 16,
                background: n.read ? 'var(--panel)' : 'var(--panel-solid)',
                borderColor: n.read ? 'var(--border)' : 'rgba(37, 99, 235, 0.25)',
                boxShadow: n.read ? 'var(--shadow-sm)' : 'var(--shadow), var(--shadow-glow)',
                transition: 'all 250ms ease-out',
                position: 'relative'
              }}
            >
              {/* Glowing dot for unread notifications */}
              {!n.read && (
                <div style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  boxShadow: '0 0 8px var(--blue)'
                }} />
              )}

              {/* Icon Section */}
              <div style={{ flexShrink: 0 }}>
                {getCategoryIcon(n.category)}
              </div>

              {/* Info content */}
              <div 
                style={{ flex: 1, minWidth: 0, cursor: n.targetView ? 'pointer' : 'default' }}
                onClick={() => handleNotificationClick(n)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                    {getRelativeTime(n.createdAt)}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'var(--text-light)', lineHeight: 1.5 }}>
                  {n.message}
                </p>
                
                {n.targetView && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: 'var(--blue)',
                    marginTop: 8
                  }}>
                    View Details ↗
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => toggleReadStatus(n.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    borderRadius: 6,
                    height: 26,
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid var(--border)'
                  }}
                  title={n.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {n.read ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleDismiss(n.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    borderRadius: 6,
                    height: 26,
                    color: 'var(--danger)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239,68,68,0.1)'
                  }}
                  title="Dismiss notification"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .notification-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
        }
      `}</style>
    </div>
  );
}

export default NotificationsView;
