import React, { useEffect, useMemo, useState } from 'react';
import { fetchTicketSummary } from '../api';

function Dashboard({ user, onFilter, recentTickets = [] }) {
  const name = user?.username || 'User';
  const [summary, setSummary] = useState({ open_count: 0, pending_count: 0, resolved_today: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchTicketSummary();
        if (mounted) setSummary(data);
      } catch (e) {
        // ignore errors for dashboard
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleFilter = (filter) => {
    const next = { ...filter };
    if (filter?.status) {
      next.view = isClient ? 'tickets' : 'queue';
    }
    if (filter?.view && filter.view === 'dashboard') {
      // stay on dashboard
    }
    if (onFilter) onFilter(next);
  };

  // Role specific cards
  const isClient = user?.role === 'Client';

  const primaryActions = isClient
    ? [
        { label: 'Create Ticket', action: () => handleFilter({ view: 'create' }) },
        { label: 'My Tickets', action: () => handleFilter({ view: 'tickets' }) },
        { label: 'View Assets', action: () => handleFilter({ view: 'assets' }) },
      ]
    : user?.role === 'Admin'
    ? [
        { label: 'Users', action: () => handleFilter({ view: 'users' }) },
        { label: 'Reports', action: () => handleFilter({ view: 'reports' }) },
        { label: 'Settings', action: () => handleFilter({ view: 'settings' }) },
      ]
    : [
        { label: 'Assigned Queue', action: () => handleFilter({ status: 'Open' }) },
        { label: 'SLA Alerts', action: () => handleFilter({ status: 'In Progress' }) },
        { label: 'Vendor Escalation', action: () => handleFilter({ status: 'Waiting for Vendor' }) },
      ];

  return (
    <div className="ticket-card" style={{ marginBottom: 18 }}>
      <div className="ticket-card__top">
        <div>
          <h2 style={{ margin: 0 }}>Welcome, {name}</h2>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{user?.role || ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
        <button type="button" className="dashboard-card" onClick={() => handleFilter({ status: 'Open' })}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Open Tickets</div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{loading ? '…' : summary.open_count}</div>
          <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>vs yesterday —</div>
        </button>
        <button type="button" className="dashboard-card" onClick={() => handleFilter({ status: 'In Progress' })}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>In Progress</div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{loading ? '…' : summary.pending_count}</div>
          <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>Work items waiting for action</div>
        </button>
        <button type="button" className="dashboard-card" onClick={() => handleFilter({ status: 'Resolved' })}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Resolved Today</div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{loading ? '…' : summary.resolved_today}</div>
          <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>Tickets closed this shift</div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {primaryActions.map((action) => (
          <button key={action.label} type="button" className="btn btnPrimary" onClick={action.action}>
            {action.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Recent Activity</h3>
          <button type="button" className="btn btnMuted" onClick={() => handleFilter({ view: isClient ? 'tickets' : 'queue' })}>
            View all
          </button>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {recentTickets.slice(0, 4).map((ticket) => (
            <div key={ticket.ticket_id} className="ticket-card" style={{ padding: 12, background: 'var(--panel2)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>TK-{ticket.ticket_id}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{ticket.status || 'New'}</div>
              </div>
              <div style={{ marginTop: 6, color: 'var(--text)' }}>{ticket.subject || ticket.issue_type || 'No subject provided'}</div>
              <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
                {ticket.assigned_tech ? `Assigned to ${ticket.assigned_tech}` : 'Unassigned'} • {ticket.priority || 'Low'}
              </div>
            </div>
          ))}
          {!recentTickets.length && (
            <div style={{ color: 'var(--muted)' }}>No recent activity yet. Continue by creating a new ticket or reviewing your queue.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
