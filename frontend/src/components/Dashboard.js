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
    <div className="ticket-card dashboard" style={{ marginBottom: 18 }}>
      <div className="ticket-card__top">
        <div>
          <h2 className="dashboard__title">Welcome, {name}</h2>
          <div className="dashboard__subtitle">{user?.role || ''}</div>
        </div>
      </div>

      <div className="dashboard__stats">
        <button type="button" className="dashboard-card dashboard-stat" onClick={() => handleFilter({ status: 'Open' })}>
          <div className="dashboard-stat__label">Open Tickets</div>
          <div className="dashboard-stat__value">{loading ? '…' : summary.open_count}</div>
          <div className="dashboard-stat__hint">vs yesterday —</div>
        </button>
        <button type="button" className="dashboard-card dashboard-stat" onClick={() => handleFilter({ status: 'In Progress' })}>
          <div className="dashboard-stat__label">In Progress</div>
          <div className="dashboard-stat__value">{loading ? '…' : summary.pending_count}</div>
          <div className="dashboard-stat__hint">Work items waiting for action</div>
        </button>
        <button type="button" className="dashboard-card dashboard-stat" onClick={() => handleFilter({ status: 'Resolved' })}>
          <div className="dashboard-stat__label">Resolved Today</div>
          <div className="dashboard-stat__value">{loading ? '…' : summary.resolved_today}</div>
          <div className="dashboard-stat__hint">Tickets closed this shift</div>
        </button>
      </div>

      <div className="dashboard__actions">
        {primaryActions.map((action) => (
          <button key={action.label} type="button" className="btn btnPrimary" onClick={action.action}>
            {action.label}
          </button>
        ))}
      </div>

      <div className="dashboard__recent">
        <div className="dashboard__recentTop">
          <h3 className="dashboard__recentTitle">Recent Activity</h3>
          <button type="button" className="btn btnMuted" onClick={() => handleFilter({ view: isClient ? 'tickets' : 'queue' })}>
            View all
          </button>
        </div>
        <div className="dashboard__recentList">
          {recentTickets.slice(0, 4).map((ticket) => (
            <div key={ticket.ticket_id} className="ticket-card dashboard__recentCard">
              <div className="dashboard__recentRow">
                <div className="dashboard__recentId">TK-{ticket.ticket_id}</div>
                <div className="dashboard__recentStatus">{ticket.status || 'New'}</div>
              </div>
              <div className="dashboard__recentSubject">{ticket.subject || ticket.issue_type || 'No subject provided'}</div>
              <div className="dashboard__recentMeta">
                {ticket.assigned_tech ? `Assigned to ${ticket.assigned_tech}` : 'Unassigned'} • {ticket.priority || 'Low'}
              </div>
            </div>
          ))}
          {!recentTickets.length && (
            <div className="dashboard__recentEmpty">No recent activity yet. Continue by creating a new ticket or reviewing your queue.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
