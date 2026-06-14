import React, { useEffect, useMemo, useState } from 'react';
import { fetchTicketSummary, fetchTicketsWithParams } from '../services/api';
import StatusBadge from '../components/StatusBadge';

// Inline SVG Icon Mapping for Action Cards
const ACTION_ICONS = {
  create: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  my_tickets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  assets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  assigned_queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  open_queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  escalated: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

function Dashboard({ user, onFilter, recentTickets = [] }) {
  const name = user?.username || 'User';
  const isClient = user?.role === 'Client';
  const isAdmin = user?.role === 'Admin';

  // State management
  const [summary, setSummary] = useState({ open_count: 0, pending_count: 0, resolved_today: 0 });
  const [ticketsList, setTicketsList] = useState(recentTickets || []);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [timelineFilter, setTimelineFilter] = useState('all');

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch KPI Summary
  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchTicketSummary();
        if (mounted) setSummary(data);
      } catch (e) {
        // ignore errors
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadSummary();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch tickets for advanced charts & timeline activity
  useEffect(() => {
    let mounted = true;
    const loadAllTickets = async () => {
      try {
        const params = {
          page: 1,
          page_size: 100,
          client_id: isClient ? user?.user_id : '',
        };
        const data = await fetchTicketsWithParams(params);
        if (mounted && data?.tickets) {
          setTicketsList(data.tickets);
        }
      } catch (err) {
        console.error('Error loading tickets for dashboard:', err);
      }
    };
    if (user) {
      loadAllTickets();
    }
    return () => {
      mounted = false;
    };
  }, [user, isClient]);

  // Sync tickets list if prop changes
  useEffect(() => {
    if (recentTickets && recentTickets.length > 0) {
      setTicketsList(recentTickets);
    }
  }, [recentTickets]);

  const handleFilter = (filter) => {
    const next = { ...filter };
    if (filter?.status && !filter?.view) {
      next.view =
        filter.status === 'Open'
          ? 'open_queue'
          : filter.status === 'Resolved'
            ? 'closed_tickets'
            : filter.status === 'Closed'
              ? 'closed_tickets'
              : 'assigned_queue';
    }
    if (onFilter) onFilter(next);
  };

  // Dynamic Welcome Greeting message based on system time
  const greeting = useMemo(() => {
    const hour = time.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Welcome Back';
  }, [time]);

  // Priority Stats computed dynamically
  const priorityStats = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    ticketsList.forEach((t) => {
      const p = t.priority || 'Low';
      if (counts[p] !== undefined) counts[p]++;
    });
    return counts;
  }, [ticketsList]);

  // Donut segment calculations for SVG rendering
  const donutSegments = useMemo(() => {
    const total = Object.values(priorityStats).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const colors = {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#f59e0b',
      Low: '#10b981',
    };

    let accumulatedPercent = 0;
    const segments = [];

    const priorities = ['Critical', 'High', 'Medium', 'Low'];
    priorities.forEach((p) => {
      const count = priorityStats[p] || 0;
      if (count === 0) return;

      const percent = (count / total) * 100;
      const r = 36;
      const circumference = 2 * Math.PI * r;
      const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = circumference - (accumulatedPercent / 100) * circumference;

      segments.push({
        priority: p,
        count,
        percent,
        color: colors[p],
        strokeDasharray,
        strokeDashoffset,
      });

      accumulatedPercent += percent;
    });

    return segments;
  }, [priorityStats]);

  // Staff ticket count stats
  const techStats = useMemo(() => {
    const techs = {};
    ticketsList.forEach((t) => {
      if (t.status !== 'Closed' && t.status !== 'Resolved') {
        const name = t.assigned_tech || 'Unassigned';
        techs[name] = (techs[name] || 0) + 1;
      }
    });
    return Object.entries(techs)
      .map(([techName, count]) => ({ name: techName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [ticketsList]);

  const maxTechTickets = useMemo(() => {
    return Math.max(...techStats.map((t) => t.count), 1);
  }, [techStats]);

  // Action layouts for Quick Actions Card Grid
  const primaryActions = useMemo(() => {
    if (isClient) {
      return [
        { label: 'Create Ticket', key: 'create', desc: 'Submit a new support request', action: () => handleFilter({ view: 'create' }) },
        { label: 'My Tickets', key: 'my_tickets', desc: 'Track your current requests', action: () => handleFilter({ view: 'my_tickets' }) },
        { label: 'View Assets', key: 'assets', desc: 'Review your leased hardware', action: () => handleFilter({ view: 'assets' }) },
      ];
    }
    if (isAdmin) {
      return [
        { label: 'User Management', key: 'users', desc: 'Provision system roles & techs', action: () => handleFilter({ view: 'users' }) },
        { label: 'Reports & Audits', key: 'reports', desc: 'Export metrics & response logs', action: () => handleFilter({ view: 'reports' }) },
        { label: 'System Settings', key: 'settings', desc: 'Configure queues & triggers', action: () => handleFilter({ view: 'settings' }) },
      ];
    }
    return [
      { label: 'Assigned Queue', key: 'assigned_queue', desc: 'Work on tickets assigned to you', action: () => handleFilter({ view: 'assigned_queue' }) },
      { label: 'Open Queue', key: 'open_queue', desc: 'Triage and assign unassigned items', action: () => handleFilter({ view: 'open_queue' }) },
      { label: 'SLA Escalate Alerts', key: 'escalated', desc: 'View items nearing SLA targets', action: () => handleFilter({ view: 'assigned_queue', status: 'In Progress' }) },
    ];
  }, [isClient, isAdmin]);

  // Filters timeline items in place
  const filteredTimelineTickets = useMemo(() => {
    let list = [...ticketsList];
    if (timelineFilter === 'high') {
      list = list.filter((t) => t.priority === 'Critical' || t.priority === 'High');
    } else if (timelineFilter === 'my') {
      if (isClient) {
        list = list.filter((t) => t.client_id === user?.user_id);
      } else {
        list = list.filter((t) => t.assigned_tech === user?.username);
      }
    }
    return list.slice(0, 5);
  }, [ticketsList, timelineFilter, user, isClient]);

  const getTimelineDotColor = (ticket) => {
    if (ticket.priority === 'Critical') return '#ef4444';
    const status = String(ticket.status || '').toLowerCase();
    if (status.includes('resolved') || status.includes('closed')) return '#10b981';
    if (status.includes('progress') || status.includes('assigned') || status.includes('vendor')) return '#f59e0b';
    return '#2563eb';
  };

  const getFormattedDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="dashboard-grid">
      {/* 1. Welcoming Hero Banner */}
      <section className="dashboard-hero">
        <div className="dashboard-hero__meta">
          <h2 className="dashboard-hero__greet">{greeting}, {name}</h2>
          <div className="dashboard-hero__subtitle">
            <span className="dashboard-hero__status-badge">
              <span className="dashboard-hero__pulse"></span>
              All systems nominal
            </span>
            • Authorized as {user?.role || 'User'}
          </div>
        </div>
        <div className="dashboard-hero__clock-card">
          <div className="dashboard-hero__clock">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="dashboard-hero__date">
            {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </section>

      {/* 2. KPI Metrics cards with SVG Sparklines */}
      <section className="dashboard-kpis">
        <button type="button" className="dashboard-kpi-card" onClick={() => handleFilter({ status: 'Open' })}>
          <div className="dashboard-kpi-card__header">
            <span className="dashboard-kpi-card__label">Open Tickets</span>
            <div className="dashboard-kpi-card__icon" style={{ color: '#2563eb', background: 'rgba(37,99,235,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="dashboard-kpi-card__value">{loading ? '…' : summary.open_count}</div>
          <div className="dashboard-kpi-card__desc">Awaiting technician triage</div>
          <svg className="dashboard-kpi-card__sparkline" viewBox="0 0 100 30">
            <path d="M0,25 Q15,10 30,22 T60,8 T90,20" style={{ stroke: '#2563eb' }} />
          </svg>
        </button>

        <button type="button" className="dashboard-kpi-card" onClick={() => handleFilter({ status: 'In Progress' })}>
          <div className="dashboard-kpi-card__header">
            <span className="dashboard-kpi-card__label">In Progress</span>
            <div className="dashboard-kpi-card__icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </div>
          <div className="dashboard-kpi-card__value">{loading ? '…' : summary.pending_count}</div>
          <div className="dashboard-kpi-card__desc">Active development items</div>
          <svg className="dashboard-kpi-card__sparkline" viewBox="0 0 100 30">
            <path d="M0,15 C20,5 40,25 60,10 C80,25 90,5 100,15" style={{ stroke: '#f59e0b' }} />
          </svg>
        </button>

        <button type="button" className="dashboard-kpi-card" onClick={() => handleFilter({ status: 'Resolved' })}>
          <div className="dashboard-kpi-card__header">
            <span className="dashboard-kpi-card__label">Resolved Today</span>
            <div className="dashboard-kpi-card__icon" style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="dashboard-kpi-card__value">{loading ? '…' : summary.resolved_today}</div>
          <div className="dashboard-kpi-card__desc">Closed inside this work shift</div>
          <svg className="dashboard-kpi-card__sparkline" viewBox="0 0 100 30">
            <path d="M0,28 L20,22 L40,24 L60,14 L80,18 L100,5" style={{ stroke: '#10b981' }} />
          </svg>
        </button>
      </section>

      {/* 3. Analytics Section (SVG Donut Chart + Staff Workload / Client Resource Guide) */}
      <section className="dashboard-analytics-row">
        {/* Left Card: Priority Distribution Donut */}
        <div className="analytics-card">
          <h3 className="analytics-card__title">Priority Breakdown</h3>
          <p className="analytics-card__subtitle">Refraction mapping of SLA levels</p>
          <div className="chart-container">
            {donutSegments.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13, padding: '30px 0' }}>
                No tickets to display priority breakdown.
              </div>
            ) : (
              <>
                <svg className="svg-donut" width="130" height="130" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(15, 23, 42, 0.04)" strokeWidth="12" />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.priority}
                      className="donut-segment"
                      cx="50"
                      cy="50"
                      r="36"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      onClick={() => handleFilter({ priority: seg.priority, view: isClient ? 'my_tickets' : 'assigned_queue' })}
                      title={`${seg.priority}: ${seg.count} (${seg.percent.toFixed(1)}%)`}
                    />
                  ))}
                  <text x="50" y="54" className="donut-center-text" fontSize="10" textAnchor="middle">
                    {ticketsList.length} Items
                  </text>
                </svg>

                <div className="donut-legend">
                  {donutSegments.map((seg) => (
                    <div
                      key={seg.priority}
                      className="donut-legend__item"
                      onClick={() => handleFilter({ priority: seg.priority, view: isClient ? 'my_tickets' : 'assigned_queue' })}
                    >
                      <span className="donut-legend__color" style={{ backgroundColor: seg.color }}></span>
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seg.priority}</span>
                      <strong style={{ fontSize: 12 }}>{seg.count}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Card: Role-Specific Widget (Staff Workload or Client Resources) */}
        <div className="analytics-card">
          {!isClient ? (
            <>
              <h3 className="analytics-card__title">Technician Active Workload</h3>
              <p className="analytics-card__subtitle">Staff load and resource allocation (Open & In Progress)</p>
              <div className="staff-list" style={{ marginTop: 8 }}>
                {techStats.length === 0 ? (
                  <div style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13, padding: '40px 0' }}>
                    All technician queues are currently clear.
                  </div>
                ) : (
                  techStats.map((tech) => {
                    const widthPercent = (tech.count / maxTechTickets) * 100;
                    return (
                      <div key={tech.name} className="staff-item">
                        <div className="staff-item__meta">
                          <span className="staff-item__name">
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: tech.name === 'Unassigned' ? '#ef4444' : '#2563eb'
                            }}></span>
                            {tech.name}
                          </span>
                          <span className="staff-item__count">{tech.count} active</span>
                        </div>
                        <div className="staff-item__bar-bg">
                          <div
                            className="staff-item__bar"
                            style={{
                              width: `${widthPercent}%`,
                              background: tech.name === 'Unassigned'
                                ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                                : 'linear-gradient(90deg, #2563eb 0%, #0d9488 100%)'
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="analytics-card__title">Service Guide & FAQs</h3>
              <p className="analytics-card__subtitle">Instant resources to resolve common setup configurations</p>
              <div className="guide-grid" style={{ marginTop: 8 }}>
                <div className="guide-card" onClick={() => handleFilter({ view: 'knowledge' })}>
                  <div className="guide-card__icon">🔐</div>
                  <div>
                    <div className="guide-card__title">Credentials Recovery</div>
                    <div className="guide-card__desc">Password reset guides & security credentials.</div>
                  </div>
                </div>
                <div className="guide-card" onClick={() => handleFilter({ view: 'knowledge' })}>
                  <div className="guide-card__icon">🌐</div>
                  <div>
                    <div className="guide-card__title">Secure VPN Settings</div>
                    <div className="guide-card__desc">Step-by-step tutorial on joining corporate tunnel.</div>
                  </div>
                </div>
                <div className="guide-card" onClick={() => handleFilter({ view: 'assets' })}>
                  <div className="guide-card__icon">💻</div>
                  <div>
                    <div className="guide-card__title">Asset Maintenance</div>
                    <div className="guide-card__desc">Report hardware issue & request upgrades.</div>
                  </div>
                </div>
                <div className="guide-card" onClick={() => handleFilter({ view: 'knowledge' })}>
                  <div className="guide-card__icon">⏱️</div>
                  <div>
                    <div className="guide-card__title">Service SLA Terms</div>
                    <div className="guide-card__desc">IT response metrics and escalate guidelines.</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. High-Fidelity Quick Actions Cards Grid */}
      <section className="quick-actions-grid">
        {primaryActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="action-card"
            onClick={action.action}
          >
            <div className="action-card__icon">
              {ACTION_ICONS[action.key] || ACTION_ICONS.create}
            </div>
            <div className="action-card__info">
              <span className="action-card__title">{action.label}</span>
              <span className="action-card__desc">{action.desc}</span>
            </div>
          </button>
        ))}
      </section>

      {/* 5. Modern Activity Timeline Feed */}
      <section className="timeline-card">
        <div className="timeline-header">
          <h3 className="timeline-header__title">Recent Operations Timeline</h3>
          <div className="timeline-tabs">
            <button
              type="button"
              className={`timeline-tab ${timelineFilter === 'all' ? 'isActive' : ''}`}
              onClick={() => setTimelineFilter('all')}
            >
              All Activity
            </button>
            <button
              type="button"
              className={`timeline-tab ${timelineFilter === 'high' ? 'isActive' : ''}`}
              onClick={() => setTimelineFilter('high')}
            >
              High Priority
            </button>
            <button
              type="button"
              className={`timeline-tab ${timelineFilter === 'my' ? 'isActive' : ''}`}
              onClick={() => setTimelineFilter('my')}
            >
              {isClient ? 'My Tickets' : 'My Queue'}
            </button>
          </div>
        </div>

        <div className="timeline-list">
          {filteredTimelineTickets.length === 0 ? (
            <div className="timeline-empty">
              No recent timeline activities matches the active filter.
            </div>
          ) : (
            filteredTimelineTickets.map((ticket, index) => (
              <div
                key={ticket.ticket_id}
                className="timeline-item"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div
                  className="timeline-item__dot"
                  style={{ backgroundColor: getTimelineDotColor(ticket) }}
                ></div>
                <div className="timeline-item__card">
                  <div className="timeline-item__row">
                    <div className="timeline-item__id-wrap">
                      <span className="timeline-item__id">TK-{ticket.ticket_id}</span>
                      <StatusBadge status={ticket.status || 'New'} />
                    </div>
                    <span className="timeline-item__time" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {getFormattedDate(ticket.created_at)}
                    </span>
                  </div>
                  <div className="timeline-item__subject">
                    {ticket.subject || ticket.issue_type || 'No subject description'}
                  </div>
                  <div className="timeline-item__meta">
                    <span className="timeline-item__tech">
                      👤 {ticket.assigned_tech ? `Assigned to ${ticket.assigned_tech}` : 'Unassigned Tech'}
                    </span>
                    <span className={`priority-badge priority-${String(ticket.priority || 'Low').toLowerCase()}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {ticket.priority || 'Low'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
