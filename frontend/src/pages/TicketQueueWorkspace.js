import { useState, useEffect, useMemo } from 'react';
import { adminFetchUsers } from '../services/api';

function TicketQueueWorkspace({
  tickets,
  loading,
  isSupport,
  onUpdateTicket,
  page,
  page_size,
  total,
  onPageChange,
  onRefresh,
  currentUser,
  viewType // 'open_queue' | 'assigned_queue' | 'closed_tickets'
}) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [techs, setTechs] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [savingStatus, setSavingStatus] = useState(null); // null | 'saving' | 'success'

  // Load support engineers & admins dynamically for the assignment dropdown
  useEffect(() => {
    if (!isSupport) return;
    const fetchTechs = async () => {
      try {
        setLoadingTechs(true);
        const supportTechs = await adminFetchUsers('Support Engineer');
        const adminTechs = await adminFetchUsers('Admin');
        setTechs([...supportTechs, ...adminTechs]);
      } catch (err) {
        console.error('Failed to load support technicians:', err);
      } finally {
        setLoadingTechs(false);
      }
    };
    fetchTechs();
  }, [isSupport]);

  // Reset selected ticket when switching views
  useEffect(() => {
    setSelectedTicketId(null);
  }, [viewType]);

  // Local filter rule based on the view context to make state transitions snappy
  const activeTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (viewType === 'open_queue') {
        return t.status === 'Open' && !t.assigned_tech;
      }
      if (viewType === 'closed_tickets') {
        return t.status === 'Closed' || t.status === 'Resolved';
      }
      if (viewType === 'assigned_queue') {
        // Active tickets assigned to current user
        return (
          t.assigned_tech === currentUser?.username &&
          t.status !== 'Closed' &&
          t.status !== 'Resolved'
        );
      }
      return true;
    });
  }, [tickets, viewType, currentUser]);

  // Compute live triage statistics depending on the viewType
  const stats = useMemo(() => {
    const totalCount = activeTickets.length;
    const criticalCount = activeTickets.filter((t) => t.priority === 'Critical').length;
    const highCount = activeTickets.filter((t) => t.priority === 'High').length;

    if (viewType === 'closed_tickets') {
      const resolvedTodayCount = activeTickets.filter((t) => {
        if (t.status !== 'Resolved') return false;
        const updatedDate = new Date(t.updated_at || t.created_at);
        return updatedDate.toDateString() === new Date().toDateString();
      }).length;

      return {
        card1: { val: totalCount, label: 'Resolved / Closed', icon: '✅' },
        card2: { val: resolvedTodayCount, label: 'Resolved Today', icon: '⏱️' },
        card3: { val: criticalCount, label: 'Critical Solved', icon: '🚨' },
        card4: { val: highCount, label: 'High Solved', icon: '🔥' }
      };
    }

    if (viewType === 'assigned_queue') {
      let avgAgeMins = 0;
      if (totalCount > 0) {
        const totalAgeMs = activeTickets.reduce((sum, t) => {
          const created = new Date(t.created_at);
          return sum + (Date.now() - created.getTime());
        }, 0);
        avgAgeMins = Math.round((totalAgeMs / totalCount) / 60000);
      }

      return {
        card1: { val: totalCount, label: 'My Active Tasks', icon: '👤' },
        card2: { val: criticalCount, label: 'My Critical', icon: '🚨' },
        card3: { val: highCount, label: 'My High', icon: '🔥' },
        card4: {
          val: avgAgeMins < 60 ? `${avgAgeMins}m` : `${Math.round(avgAgeMins / 60)}h`,
          label: 'Avg Task Age',
          icon: '⏱️'
        }
      };
    }

    // Default: open_queue
    let avgAgeMins = 0;
    if (totalCount > 0) {
      const totalAgeMs = activeTickets.reduce((sum, t) => {
        const created = new Date(t.created_at);
        return sum + (Date.now() - created.getTime());
      }, 0);
      avgAgeMins = Math.round((totalAgeMs / totalCount) / 60000);
    }

    return {
      card1: { val: totalCount, label: 'Unassigned', icon: '📬' },
      card2: { val: criticalCount, label: 'Critical SLA', icon: '🚨' },
      card3: { val: highCount, label: 'High Priority', icon: '🔥' },
      card4: {
        val: avgAgeMins < 60 ? `${avgAgeMins}m` : `${Math.round(avgAgeMins / 60)}h`,
        label: 'Avg Queue Age',
        icon: '⏱️'
      }
    };
  }, [activeTickets, viewType]);

  // Apply search, priority filtering, and sorting to the active list
  const filteredTickets = useMemo(() => {
    let result = [...activeTickets];

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => {
        return (
          String(t.ticket_id).includes(q) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.issue_type && t.issue_type.toLowerCase().includes(q)) ||
          (t.client && t.client.username && t.client.username.toLowerCase().includes(q))
        );
      });
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === 'priority') {
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      return 0;
    });

    return result;
  }, [activeTickets, search, priorityFilter, sortBy]);

  // Keep a reference to the selected ticket from the parent array so we can view its state live
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.ticket_id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Handles updating individual ticket properties inline
  const handleUpdate = async (ticketId, fields) => {
    try {
      setSavingStatus('saving');
      await onUpdateTicket(ticketId, fields);
      setSavingStatus('success');
      setTimeout(() => setSavingStatus(null), 2000);
    } catch (err) {
      console.error('Triage save error:', err);
      setSavingStatus(null);
    }
  };

  // Helper to get formatted relative age
  const getRelativeAge = (dateString) => {
    if (!dateString) return '';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Dynamic KPIs ribbon */}
      <section className="triage-stats">
        <div className="triage-stat-card">
          <div className="triage-stat-icon" style={{ color: 'var(--blue)', background: 'rgba(37,99,235,0.08)' }}>
            {stats.card1.icon}
          </div>
          <div className="triage-stat-info">
            <span className="triage-stat-val">{loading ? '…' : stats.card1.val}</span>
            <span className="triage-stat-lbl">{stats.card1.label}</span>
          </div>
        </div>

        <div className="triage-stat-card">
          <div className="triage-stat-icon" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
            {stats.card2.icon}
          </div>
          <div className="triage-stat-info">
            <span className="triage-stat-val">{loading ? '…' : stats.card2.val}</span>
            <span className="triage-stat-lbl">{stats.card2.label}</span>
          </div>
        </div>

        <div className="triage-stat-card">
          <div className="triage-stat-icon" style={{ color: '#f97316', background: 'rgba(249,115,22,0.08)' }}>
            {stats.card3.icon}
          </div>
          <div className="triage-stat-info">
            <span className="triage-stat-val">{loading ? '…' : stats.card3.val}</span>
            <span className="triage-stat-lbl">{stats.card3.label}</span>
          </div>
        </div>

        <div className="triage-stat-card">
          <div className="triage-stat-icon" style={{ color: 'var(--teal)', background: 'rgba(13,148,136,0.08)' }}>
            {stats.card4.icon}
          </div>
          <div className="triage-stat-info">
            <span className="triage-stat-val">{loading ? '…' : stats.card4.val}</span>
            <span className="triage-stat-lbl">{stats.card4.label}</span>
          </div>
        </div>
      </section>

      {/* 2. Main Dual-pane triage workspace */}
      <div className="triage-layout">
        {/* Left column: Feed list */}
        <div className="triage-feed">
          <div className="triage-feed-header">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="control"
                placeholder="Search queue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: 13.5, padding: '10px 14px', flex: 1 }}
              />
              <button
                type="button"
                className="btn"
                onClick={onRefresh}
                title="Refresh Queue"
                style={{ padding: '10px 12px', height: 40, width: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🔄
              </button>
            </div>
            <div className="triage-feed-filters">
              <select
                className="control"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ fontSize: 12, padding: '8px 10px' }}
              >
                <option value="all">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              <select
                className="control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ fontSize: 12, padding: '8px 10px' }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              <div className="triage-saving-spinner" style={{ margin: '0 auto 12px', width: 24, height: 24 }}></div>
              Loading tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--muted)', fontSize: 13.5 }}>
              No tickets found in this queue matching filters.
            </div>
          ) : (
            filteredTickets.map((t) => {
              const priorityClass = t.priority ? `priority-${t.priority.toLowerCase()}` : 'priority-low';
              const isSelected = selectedTicketId === t.ticket_id;
              return (
                <div
                  key={t.ticket_id}
                  className={`triage-card ${priorityClass} ${isSelected ? 'isActive' : ''}`}
                  onClick={() => setSelectedTicketId(t.ticket_id)}
                >
                  <div className="triage-card__head">
                    <span className="triage-card__id">TK-{t.ticket_id}</span>
                    <span className="triage-card__time">{getRelativeAge(t.created_at)}</span>
                  </div>
                  <h4 className="triage-card__subj">{t.subject || t.issue_type || 'No subject'}</h4>
                  <div className="triage-card__meta">
                    <span className="triage-card__client">
                      👤 {t.client?.username || 'Client'}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`status-badge status-${t.status === 'Resolved' || t.status === 'Closed' ? 'success' : 'warning'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                        {t.status}
                      </span>
                      <span className={`priority-badge priority-${String(t.priority || 'Low').toLowerCase()}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                        {t.priority || 'Low'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column: Triage workstation detail pane */}
        <div className="triage-detail">
          {!selectedTicket ? (
            <div className="triage-empty-panel">
              <div className="triage-empty-icon">⚡</div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>Triage Workstation</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, maxWidth: 300 }}>
                Select a ticket from the queue feed to manage priority, assign support engineers, and review configurations.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div className="triage-detail__header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Triage Workstation
                  </span>
                  {savingStatus === 'saving' && (
                    <div className="triage-saving-indicator">
                      <div className="triage-saving-spinner"></div>
                      <span>Saving...</span>
                    </div>
                  )}
                  {savingStatus === 'success' && (
                    <div className="triage-saving-indicator">
                      <span className="triage-saving-success">✓ Saved</span>
                    </div>
                  )}
                </div>
                <h2 style={{ margin: '6px 0 0', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text)' }}>
                  TK-{selectedTicket.ticket_id}: {selectedTicket.subject || 'No Subject'}
                </h2>
                <div className="triage-detail__meta-ribbon">
                  <span className={`priority-badge priority-${String(selectedTicket.priority || 'Low').toLowerCase()}`}>
                    {selectedTicket.priority || 'Low'}
                  </span>
                  <span className={`status-badge status-${selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? 'success' : 'warning'}`}>
                    {selectedTicket.status || 'Open'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                    Submitted: {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="triage-detail__desc-label">Issue Details</div>
                <div className="triage-detail__desc-box">
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                    <span>Type: <strong>{selectedTicket.issue_type}</strong></span>
                    {selectedTicket.error_code && <span>Error Code: <strong>{selectedTicket.error_code}</strong></span>}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</div>
                </div>
              </div>

              {/* Triage action board */}
              {isSupport && (
                <div>
                  <span className="triage-section-title">⚡ Triaging Actions</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Claims / Assignment */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      {viewType === 'open_queue' && (
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() =>
                            handleUpdate(selectedTicket.ticket_id, {
                              assigned_tech: currentUser?.username || 'Tech',
                              status: 'Assigned'
                            })
                          }
                          disabled={selectedTicket.assigned_tech === currentUser?.username}
                          style={{ padding: '10px 16px', fontSize: 13 }}
                        >
                          Claim Ticket
                        </button>
                      )}

                      {viewType === 'assigned_queue' && (
                        <button
                          type="button"
                          className="btn btnDanger"
                          onClick={() =>
                            handleUpdate(selectedTicket.ticket_id, {
                              assigned_tech: null,
                              status: 'Open'
                            })
                          }
                          style={{ padding: '10px 16px', fontSize: 13 }}
                        >
                          Release Ticket
                        </button>
                      )}

                      {viewType === 'closed_tickets' && (
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() =>
                            handleUpdate(selectedTicket.ticket_id, {
                              status: 'Open',
                              assigned_tech: null
                            })
                          }
                          style={{ padding: '10px 16px', fontSize: 13 }}
                        >
                          Re-open Ticket
                        </button>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          Tech:
                        </span>
                        <select
                          className="control"
                          value={selectedTicket.assigned_tech || ''}
                          onChange={(e) =>
                            handleUpdate(selectedTicket.ticket_id, {
                              assigned_tech: e.target.value || null,
                              status: e.target.value ? (selectedTicket.status === 'Open' ? 'Assigned' : selectedTicket.status) : 'Open'
                            })
                          }
                          style={{ padding: '8px 12px', fontSize: 13 }}
                        >
                          <option value="">-- Unassigned --</option>
                          {techs.map((tech) => (
                            <option key={tech.user_id} value={tech.username}>
                              {tech.username} ({tech.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Change Priority */}
                    <div>
                      <div className="triage-section-title">Adjust Priority Level</div>
                      <div className="triage-pill-group">
                        {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`triage-pill p-${p.toLowerCase()} ${selectedTicket.priority === p ? 'isActive' : ''}`}
                            onClick={() => handleUpdate(selectedTicket.ticket_id, { priority: p })}
                          >
                            {p === 'Critical' ? '🚨 ' : ''}
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Change Status */}
                    <div>
                      <div className="triage-section-title">Update Lifecycle Status</div>
                      <div className="triage-pill-group">
                        {[
                          { key: 'Open', label: 'Open', className: 's-open' },
                          { key: 'Assigned', label: 'Assigned', className: 's-assigned' },
                          { key: 'In Progress', label: 'In Progress', className: 's-progress' },
                          { key: 'Waiting for Vendor', label: 'Waiting for Vendor', className: 's-vendor' },
                          { key: 'Resolved', label: 'Resolved', className: 's-resolved' },
                          { key: 'Closed', label: 'Closed', className: 's-closed' }
                        ].map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            className={`triage-pill ${s.className} ${selectedTicket.status === s.key ? 'isActive' : ''}`}
                            onClick={() => handleUpdate(selectedTicket.ticket_id, { status: s.key })}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Profile and Leased Asset details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                {/* Client profile */}
                <div>
                  <span className="triage-section-title">👤 Client Contact</span>
                  <div className="triage-info-card">
                    <div className="triage-info-row">
                      <span className="triage-info-label">Name</span>
                      <span className="triage-info-value">{selectedTicket.client?.username || 'Client'}</span>
                    </div>
                    <div className="triage-info-row">
                      <span className="triage-info-label">Email</span>
                      <span className="triage-info-value" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                        {selectedTicket.client?.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Leased hardware */}
                <div>
                  <span className="triage-section-title">💻 Attached Asset</span>
                  <div className="triage-info-card">
                    {selectedTicket.asset ? (
                      <>
                        <div className="triage-info-row">
                          <span className="triage-info-label">Asset</span>
                          <span className="triage-info-value">{selectedTicket.asset.name}</span>
                        </div>
                        <div className="triage-info-row">
                          <span className="triage-info-label">Status</span>
                          <span
                            className="triage-info-value"
                            style={{
                              color:
                                selectedTicket.asset.status === 'Active'
                                  ? 'var(--success-hover)'
                                  : 'var(--danger-hover)'
                            }}
                          >
                            {selectedTicket.asset.status}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--muted)', fontSize: 12, padding: '4px 0' }}>
                        No asset attached to ticket
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketQueueWorkspace;
