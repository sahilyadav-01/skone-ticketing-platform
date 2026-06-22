import { useState, useEffect, useMemo } from 'react';
import { adminFetchUsers, fetchComments, createComment, fetchTicketHistory } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { generateSuggestedReply, generateAISuggestedReply } from '../utils/aiHelper';

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
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.ticket_id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [techs, setTechs] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [savingStatus, setSavingStatus] = useState(null); // null | 'saving' | 'success'

  const [activeTab, setActiveTab] = useState('conversations');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Helpdesk Redesign additions
  const [filterEmails, setFilterEmails] = useState(true);
  const [filterAutoNotifications, setFilterAutoNotifications] = useState(false);
  const [filterNotes, setFilterNotes] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  const [ticketTasks, setTicketTasks] = useState({});
  const [ticketChecklists, setTicketChecklists] = useState({});
  const [worklogTimers, setWorklogTimers] = useState({});

  const [newTaskInput, setNewTaskInput] = useState('');
  const [newChecklistInput, setNewChecklistInput] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    setActiveTab('conversations');
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) {
      setComments([]);
      setHistory([]);
      return;
    }

    const loadCommentsData = async () => {
      try {
        setLoadingComments(true);
        const data = await fetchComments(selectedTicketId);
        setComments(data);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    };

    const loadHistoryData = async () => {
      try {
        setLoadingHistory(true);
        const data = await fetchTicketHistory(selectedTicketId);
        setHistory(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadCommentsData();
    loadHistoryData();
  }, [selectedTicketId]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (selectedTicketId && selectedTicket?.status === 'In Progress') {
      interval = setInterval(() => {
        setWorklogTimers((prev) => ({
          ...prev,
          [selectedTicketId]: (prev[selectedTicketId] || 0) + 1
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTicketId, selectedTicket?.status]);

  const formatWorklogTime = (seconds = 0) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getTicketTasks = (ticketId) => {
    if (!ticketTasks[ticketId]) {
      return [
        { id: 1, text: 'Analyze incident description and error codes', done: true },
        { id: 2, text: 'Validate client lease asset details', done: false },
        { id: 3, text: 'Draft response and obtain client confirmation', done: false }
      ];
    }
    return ticketTasks[ticketId];
  };

  const getTicketChecklists = (ticketId) => {
    if (!ticketChecklists[ticketId]) {
      return [
        { id: 1, text: 'Identify error logs', done: true },
        { id: 2, text: 'Verify hardware model compatibility', done: false },
        { id: 3, text: 'Verify user credentials in system database', done: false },
        { id: 4, text: 'Test MFA status flag', done: false }
      ];
    }
    return ticketChecklists[ticketId];
  };

  const toggleTask = (ticketId, taskId) => {
    const current = getTicketTasks(ticketId);
    const updated = current.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    setTicketTasks(prev => ({ ...prev, [ticketId]: updated }));
  };

  const toggleChecklist = (ticketId, checklistId) => {
    const current = getTicketChecklists(ticketId);
    const updated = current.map(c => c.id === checklistId ? { ...c, done: !c.done } : c);
    setTicketChecklists(prev => ({ ...prev, [ticketId]: updated }));
  };

  const addTask = (ticketId, text) => {
    if (!text.trim()) return;
    const current = getTicketTasks(ticketId);
    const newTask = { id: Date.now(), text: text.trim(), done: false };
    setTicketTasks(prev => ({ ...prev, [ticketId]: [...current, newTask] }));
  };

  const addChecklist = (ticketId, text) => {
    if (!text.trim()) return;
    const current = getTicketChecklists(ticketId);
    const newChecklist = { id: Date.now(), text: text.trim(), done: false };
    setTicketChecklists(prev => ({ ...prev, [ticketId]: [...current, newChecklist] }));
  };

  // Filtered and sorted comments timeline
  const filteredComments = useMemo(() => {
    let result = comments.filter((comment) => {
      const isSystem = comment.user?.username === 'System';
      const isEmail = comment.message.includes('To :') || comment.message.includes('Re:') || comment.message.includes('Dear ');
      
      if (isSystem) return filterAutoNotifications;
      if (isEmail) return filterEmails;
      return filterNotes;
    });

    return [...result].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [comments, filterEmails, filterAutoNotifications, filterNotes, sortAsc]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || postingComment) return;
    try {
      setPostingComment(true);
      const newComment = await createComment(selectedTicketId, currentUser.user_id, newCommentText.trim());
      setComments((prev) => [...prev, newComment]);
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleAISuggestedReply = async () => {
    if (generatingAI) return;
    try {
      setGeneratingAI(true);
      const reply = await generateAISuggestedReply(selectedTicket, currentUser, isSupport, comments);
      setNewCommentText(reply);
    } catch (err) {
      console.error('Failed to get AI suggested reply:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

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
    const cleanQ = q.replace(/^tk-/, '');
    if (q) {
      result = result.filter((t) => {
        return (
          String(t.ticket_id).includes(cleanQ) ||
          `tk-${t.ticket_id}`.includes(cleanQ) ||
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

  const currentTicketIndex = filteredTickets.findIndex((t) => t.ticket_id === selectedTicketId);
  const handlePrevTicket = () => {
    if (currentTicketIndex > 0) {
      setSelectedTicketId(filteredTickets[currentTicketIndex - 1].ticket_id);
    }
  };
  const handleNextTicket = () => {
    if (currentTicketIndex < filteredTickets.length - 1) {
      setSelectedTicketId(filteredTickets[currentTicketIndex + 1].ticket_id);
    }
  };

  // Handles updating individual ticket properties inline
  const handleUpdate = async (ticketId, fields) => {
    try {
      setSavingStatus('saving');
      await onUpdateTicket(ticketId, fields);
      setSavingStatus('success');
      const histData = await fetchTicketHistory(ticketId);
      setHistory(histData);
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
      <div className={`triage-layout ${selectedTicket ? 'has-selected' : ''}`}>
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
                      <StatusBadge status={t.status} />
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
        <div className="triage-detail" style={{ alignSelf: 'start', flex: 1 }}>
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
              {/* Back button (Mobile view helper) */}
              <button
                type="button"
                className="triage-back-btn"
                onClick={() => setSelectedTicketId(null)}
              >
                ← Back to Queue
              </button>

              {/* 1. TOP HELPDESK ACTIONS TOOLBAR */}
              <div className="helpdesk-toolbar">
                <div className="helpdesk-toolbar__left">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSelectedTicketId(null)}
                    style={{ padding: '8px 12px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Back to queue"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setActiveTab('details')}
                    style={{ height: 36, fontSize: 12.5 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleUpdate(selectedTicket.ticket_id, { status: 'Closed' })}
                    style={{ height: 36, fontSize: 12.5 }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      handleUpdate(selectedTicket.ticket_id, {
                        assigned_tech: currentUser?.username || 'Tech',
                        status: 'Assigned'
                      })
                    }
                    disabled={selectedTicket.assigned_tech === currentUser?.username}
                    style={{ height: 36, fontSize: 12.5 }}
                  >
                    Pick up
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setActiveTab('details')}
                      style={{ height: 36, fontSize: 12.5 }}
                    >
                      Assign
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => window.print()}
                    style={{ height: 36, fontSize: 12.5 }}
                  >
                    Print
                  </button>
                </div>

                <div className="helpdesk-toolbar__right">
                  {/* Actions Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      style={{ height: 36, fontSize: 12.5 }}
                    >
                      Actions ▾
                    </button>
                    {showActionsDropdown && (
                      <div
                        className="asset-suggestions-menu"
                        style={{ right: 0, left: 'auto', minWidth: 180, padding: 6, zIndex: 10 }}
                      >
                        {['Open', 'Assigned', 'In Progress', 'Waiting for Vendor', 'Resolved', 'Closed'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            className="asset-suggestion-item"
                            onClick={() => {
                              handleUpdate(selectedTicket.ticket_id, { status: st });
                              setShowActionsDropdown(false);
                            }}
                            style={{ width: '100%', fontSize: 12.5, fontWeight: selectedTicket.status === st ? '700' : '500' }}
                          >
                            Mark as {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Settings Icon */}
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '8px 10px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ⚙
                  </button>

                  {/* Queue Prev/Next Selectors */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={handlePrevTicket}
                      disabled={currentTicketIndex <= 0}
                      style={{ padding: '8px 10px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Previous ticket in queue"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleNextTicket}
                      disabled={currentTicketIndex < 0 || currentTicketIndex >= filteredTickets.length - 1}
                      style={{ padding: '8px 10px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Next ticket in queue"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. DUAL COLUMN DETAILS SPLIT WORKSPACE */}
              <div className="helpdesk-grid">
                {/* Main Content Area (Left: 70%) */}
                <div className="helpdesk-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Header Title Block */}
                  <div className="helpdesk-incident-header">
                    <div className="helpdesk-incident-icon">🎫</div>
                    <div className="helpdesk-incident-info">
                      <h2 className="helpdesk-incident-title">
                        #TK-{selectedTicket.ticket_id} {selectedTicket.subject || 'Regarding incident request'}
                      </h2>
                      <div className="helpdesk-incident-subtitle">
                        <span className="helpdesk-tag-pill">{selectedTicket.issue_type || 'Incident Request'}</span>
                        <span>•</span>
                        <span>Requested By <strong>{selectedTicket.client?.username || 'Client'}</strong> on {new Date(selectedTicket.created_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => {
                          const replyTo = selectedTicket.client?.username || 'Client';
                          setNewCommentText(`Dear ${replyTo},\n\n`);
                          setActiveTab('conversations');
                          const el = document.getElementById('reply-text-box');
                          if (el) el.focus();
                        }}
                      >
                        ↩ Reply
                      </button>
                    </div>
                  </div>

                  {/* Tabs bar */}
                  <div className="timeline-tabs" style={{ marginBottom: 12 }}>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'conversations' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('conversations')}
                    >
                      💬 Conversations ({comments.length})
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'details' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('details')}
                    >
                      📋 Details
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'tasks' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('tasks')}
                    >
                      ☑ Tasks ({getTicketTasks(selectedTicket.ticket_id).filter(t => t.done).length}/{getTicketTasks(selectedTicket.ticket_id).length})
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'checklists' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('checklists')}
                    >
                      ⚙ Checklists ({getTicketChecklists(selectedTicket.ticket_id).filter(c => c.done).length}/{getTicketChecklists(selectedTicket.ticket_id).length})
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'resolution' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('resolution')}
                    >
                      ✓ Resolution
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'reminders' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('reminders')}
                    >
                      ⏱ Reminders
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'approvals' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('approvals')}
                    >
                      🛡 Approvals
                    </button>
                    <button
                      type="button"
                      className={`timeline-tab ${activeTab === 'history' ? 'isActive' : ''}`}
                      onClick={() => setActiveTab('history')}
                    >
                      Audit Trail ({history.length})
                    </button>
                  </div>

                  {/* Tab contents */}
                  {activeTab === 'conversations' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      
                      {/* Filter checkboxes line */}
                      <div className="helpdesk-filter-bar">
                        <div className="helpdesk-filter-group">
                          <span>Filter:</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filterEmails}
                              onChange={(e) => setFilterEmails(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            Emails
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filterAutoNotifications}
                              onChange={(e) => setFilterAutoNotifications(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            Auto Notifications
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filterNotes}
                              onChange={(e) => setFilterNotes(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            Notes
                          </label>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setSortAsc(!sortAsc)}
                          style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                          title="Toggle timeline sorting direction"
                        >
                          ⇅ {sortAsc ? 'Oldest First' : 'Newest First'}
                        </button>
                      </div>

                      {/* Conversations Timeline */}
                      <div className="helpdesk-timeline-container">
                        {loadingComments ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
                            Loading conversations...
                          </div>
                        ) : filteredComments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)', fontSize: 13.5 }}>
                            No matching messages in timeline.
                          </div>
                        ) : (
                          (() => {
                            let lastDateLabel = '';
                            return filteredComments.map((comment) => {
                              const commentDate = new Date(comment.created_at);
                              const currentDateLabel = commentDate.toLocaleDateString([], { day: 'numeric', month: 'short' });
                              
                              let dateSeparator = null;
                              if (currentDateLabel !== lastDateLabel) {
                                lastDateLabel = currentDateLabel;
                                dateSeparator = (
                                  <div className="timeline-date-pill-wrapper" key={`date-${comment.id}`}>
                                    <span className="timeline-date-pill">{currentDateLabel}</span>
                                  </div>
                                );
                              }

                              const isCommentTech = comment.user?.role !== 'Client';
                              const headerClass = isCommentTech ? 'tech' : 'client';
                              const badgeClass = isCommentTech ? 'tech' : 'client';
                              
                              const ticketId = selectedTicket.ticket_id;
                              const subject = selectedTicket.subject || selectedTicket.issue_type || 'Support Ticket';
                              
                              // Determine Recipient
                              let recipientEmail = 'support@skoneitsm.com';
                              let recipientName = 'Support Helpdesk';
                              
                              if (isCommentTech) {
                                recipientEmail = selectedTicket.client?.email || 'client@skoneitsm.com';
                                recipientName = selectedTicket.client?.username || 'Client';
                              } else {
                                recipientEmail = selectedTicket.assigned_tech ? `${String(selectedTicket.assigned_tech).toLowerCase().replace(/\s+/g, '')}@skoneitsm.com` : 'support@skoneitsm.com';
                                recipientName = selectedTicket.assigned_tech || 'Support Team';
                              }

                              const formattedDate = commentDate.toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });

                              const isSystemNotification = comment.user?.username === 'System';

                              if (isSystemNotification) {
                                return (
                                  <div key={comment.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                    {dateSeparator}
                                    <div className="helpdesk-timeline-node">
                                      <div className="helpdesk-timeline-badge" style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}>⚙</div>
                                      <div style={{ flex: 1, padding: '10px 14px', background: '#f8fafc', border: '1px solid var(--border-dark)', borderRadius: 10, fontSize: 13, color: 'var(--muted)', textAlign: 'left' }}>
                                        <strong>Auto Notification:</strong> {comment.message} <span style={{ float: 'right', fontSize: 11 }}>{formattedDate}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={comment.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                  {dateSeparator}
                                  
                                  {/* Render Description indicator on timeline for original client request description */}
                                  {comment.message === selectedTicket.description && (
                                    <div className="timeline-label-pill-wrapper">
                                      <span className="timeline-label-pill">Description</span>
                                    </div>
                                  )}

                                  <div className="helpdesk-timeline-node">
                                    {/* Circular Icon */}
                                    <div className={`helpdesk-timeline-badge ${badgeClass}`}>✉</div>
                                    
                                    {/* Email Card Envelope */}
                                    <div className="helpdesk-envelope">
                                      {/* Header */}
                                      <div className={`helpdesk-envelope__header ${headerClass}`}>
                                        <span>
                                          {comment.user?.username || 'User'} ({comment.user?.role || 'Client'})
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                          <span style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 500 }}>{formattedDate}</span>
                                          {/* Public globe icon */}
                                          <span title="Public message (visible to all users)">🌐</span>
                                          {/* Arrow reply buttons for Client comments */}
                                          {!isCommentTech && (
                                            <div className="helpdesk-envelope__actions" style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="Reply">
                                                <polygon points="11 19 2 12 11 5 11 19" /><path d="M22 19V12A10 10 0 0 0 12 2" />
                                              </svg>
                                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="Reply All">
                                                <path d="M17 19l-9-7 9-7v14zM7 19l-9-7 9-7v14z" />
                                              </svg>
                                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="Forward">
                                                <polygon points="13 19 22 12 13 5 13 19" /><path d="M2 19V12A10 10 0 0 1 12 2" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Body */}
                                      <div className="helpdesk-envelope__body">
                                        <div className="helpdesk-envelope__meta-row">
                                          <strong>To :</strong> {recipientEmail}
                                        </div>
                                        <div className="helpdesk-envelope__meta-row">
                                          <strong>Re:</strong> [Request ID :##TK-{ticketId}##] : {subject}
                                        </div>
                                        <div className="helpdesk-envelope__divider"></div>
                                        <div style={{ marginBottom: 10, fontWeight: 600 }}>Dear {recipientName},</div>
                                        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-light)', fontSize: 13.5, lineHeight: 1.6 }}>{comment.message}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>

                      {/* Reply Input Form */}
                      <form onSubmit={handlePostComment} className="comment-input-area" style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="triage-section-title" style={{ margin: 0 }}>Add Comment</span>
                          <button
                            type="button"
                            className="btn"
                            onClick={handleAISuggestedReply}
                            disabled={generatingAI}
                            style={{ padding: '4px 8px', fontSize: 11, background: 'rgba(124, 58, 237, 0.08)', color: 'var(--purple-hover)', border: '1px solid rgba(124, 58, 237, 0.15)', borderRadius: 6 }}
                            title="Draft an email-like suggested reply using AI context helper"
                          >
                            {generatingAI ? '⏳ Drafting...' : '🪄 AI Suggested Reply'}
                          </button>
                        </div>
                        <textarea
                          id="reply-text-box"
                          className="control"
                          placeholder={generatingAI ? "AI is formulating suggested response contextually..." : "Type your comment message here..."}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          required
                          disabled={generatingAI}
                          style={{ minHeight: 90 }}
                        />
                        <div className="comment-input-actions">
                          <button
                            type="submit"
                            className="btn btnPrimary"
                            disabled={postingComment || !newCommentText.trim()}
                            style={{ padding: '8px 16px', fontSize: 13 }}
                          >
                            {postingComment ? 'Posting...' : 'Send Comment'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Description */}
                      <div>
                        <div className="triage-detail__desc-label">Issue Details</div>
                        <div className="triage-detail__desc-box">
                          <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                            <span>Type: <strong>{selectedTicket.issue_type}</strong></span>
                            {selectedTicket.error_code && <span>Error Code: <strong>{selectedTicket.error_code}</strong></span>}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{selectedTicket.description}</div>
                        </div>
                      </div>

                      {/* Triage action board */}
                      {isSupport && (
                        <div>
                          <span className="triage-section-title">⚡ Triaging Actions</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Change Assignee */}
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

                      {/* Client profile and hardware */}
                      <div className="triage-detail-split-grid">
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

                  {activeTab === 'tasks' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <span className="triage-section-title">☑ Tasks Checklist</span>
                      <div className="helpdesk-todo-list">
                        {getTicketTasks(selectedTicket.ticket_id).map((task) => (
                          <div key={task.id} className="helpdesk-todo-item">
                            <label className="helpdesk-todo-checkbox">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleTask(selectedTicket.ticket_id, task.id)}
                              />
                              <span className={`helpdesk-todo-text ${task.done ? 'done' : ''}`}>{task.text}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          className="control"
                          placeholder="Add new task..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addTask(selectedTicket.ticket_id, newTaskInput);
                              setNewTaskInput('');
                            }
                          }}
                          style={{ fontSize: 12.5, padding: '8px 12px' }}
                        />
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() => {
                            addTask(selectedTicket.ticket_id, newTaskInput);
                            setNewTaskInput('');
                          }}
                          style={{ padding: '8px 14px', fontSize: 12.5 }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'checklists' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <span className="triage-section-title">⚙ Verification Checklists</span>
                      <div className="helpdesk-todo-list">
                        {getTicketChecklists(selectedTicket.ticket_id).map((chk) => (
                          <div key={chk.id} className="helpdesk-todo-item">
                            <label className="helpdesk-todo-checkbox">
                              <input
                                type="checkbox"
                                checked={chk.done}
                                onChange={() => toggleChecklist(selectedTicket.ticket_id, chk.id)}
                              />
                              <span className={`helpdesk-todo-text ${chk.done ? 'done' : ''}`}>{chk.text}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          className="control"
                          placeholder="Add checklist item..."
                          value={newChecklistInput}
                          onChange={(e) => setNewChecklistInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addChecklist(selectedTicket.ticket_id, newChecklistInput);
                              setNewChecklistInput('');
                            }
                          }}
                          style={{ fontSize: 12.5, padding: '8px 12px' }}
                        />
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() => {
                            addChecklist(selectedTicket.ticket_id, newChecklistInput);
                            setNewChecklistInput('');
                          }}
                          style={{ padding: '8px 14px', fontSize: 12.5 }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'resolution' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <span className="triage-section-title">✓ Incident Resolution Details</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                        Provide details outlining the diagnosis and remediation actions taken to close out this service incident request.
                      </p>
                      <textarea
                        className="control"
                        placeholder="Type final resolution notes here..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        style={{ minHeight: 90 }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          type="button"
                          className="btn btnSuccess"
                          onClick={async () => {
                            if (resolutionText.trim()) {
                              // Post resolution as comment
                              await createComment(selectedTicket.ticket_id, currentUser.user_id, `[RESOLUTION] ${resolutionText.trim()}`);
                              // Update comments
                              const data = await fetchComments(selectedTicket.ticket_id);
                              setComments(data);
                            }
                            // Set status to Resolved
                            await handleUpdate(selectedTicket.ticket_id, { status: 'Resolved' });
                            setResolutionText('');
                            alert('Ticket marked as Resolved!');
                          }}
                          style={{ padding: '10px 18px', fontSize: 13 }}
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reminders' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <span className="triage-section-title">⏱ Reminders & Schedules</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                        Schedule automated SLA warnings or developer follow-ups for this ticket.
                      </p>
                      <div className="triage-info-card" style={{ padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Set custom reminder:</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {['15 mins', '1 hour', 'Tomorrow', 'In 3 Days'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              className="btn"
                              onClick={() => alert(`Reminder set for: ${t}`)}
                              style={{ padding: '6px 12px', fontSize: 12 }}
                            >
                              🔔 {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'approvals' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <span className="triage-section-title">🛡 Incident Access Approvals</span>
                      <div className="triage-info-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Manager Approval Required</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Requested for asset leasing configuration clearance.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="btn btnSuccess"
                            onClick={() => alert('Approval granted!')}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger"
                            onClick={() => alert('Request rejected!')}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="history-timeline" style={{ maxHeight: 350 }}>
                      {loadingHistory ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
                          Loading audit trail...
                        </div>
                      ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)', fontSize: 13.5 }}>
                          No audit records found.
                        </div>
                      ) : (
                        history.map((record) => {
                          let badgeClass = 'status-update';
                          let badgeIcon = '🔄';

                          if (record.action === 'Tech Assignment') {
                            badgeClass = 'tech-assignment';
                            badgeIcon = '👤';
                          } else if (record.action === 'Priority Change') {
                            badgeClass = 'priority-change';
                            badgeIcon = '⚡';
                          }

                          return (
                            <div key={record.id} className="timeline-item">
                              <div className={`timeline-badge ${badgeClass}`}>{badgeIcon}</div>
                              <div className="timeline-content">
                                <span className="timeline-action">{record.action}</span>
                                <div className="timeline-details">
                                  Changed from <strong>{record.old_value}</strong> to <strong>{record.new_value}</strong>
                                </div>
                                <span className="timeline-meta">
                                  By {record.changed_by_user?.username || 'System'} ({record.changed_by_user?.role || 'System'}) • {new Date(record.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                </div>

                {/* Sidebar Properties Widget (Right: 30%) */}
                <div className="helpdesk-sidebar">
                  <div className="helpdesk-properties-widget">
                    <h3 className="helpdesk-properties-title">
                      Properties <span>▾</span>
                    </h3>
                    <div className="helpdesk-properties-list">
                      
                      {/* Request ID */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Request ID</span>
                        <span className="helpdesk-property-value" style={{ cursor: 'pointer' }} onClick={() => handleCopyRequestId(selectedTicket.ticket_id)} title="Click to copy Request ID">
                          # {selectedTicket.ticket_id} <span style={{ fontSize: 11, color: 'var(--blue)' }}>📋</span>
                        </span>
                      </div>

                      {/* Status */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Status</span>
                        <span className="helpdesk-property-value status">
                          🔒 {selectedTicket.status}
                        </span>
                      </div>

                      {/* Technician */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Technician</span>
                        <span className="helpdesk-property-value">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: selectedTicket.assigned_tech ? 'var(--success)' : '#94a3b8', display: 'inline-block' }}></span>
                          {selectedTicket.assigned_tech || 'Unassigned'}
                        </span>
                      </div>

                      {/* Group & Site */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Group & Site</span>
                        <span className="helpdesk-property-value">
                          ITHelpdesk , Base Site
                        </span>
                      </div>

                      {/* Tasks progress */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Tasks</span>
                        <span className="helpdesk-property-value">
                          {getTicketTasks(selectedTicket.ticket_id).filter(t => t.done).length} / {getTicketTasks(selectedTicket.ticket_id).length}
                        </span>
                      </div>

                      {/* Checklists progress */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Checklists</span>
                        <span className="helpdesk-property-value">
                          {getTicketChecklists(selectedTicket.ticket_id).filter(c => c.done).length} / {getTicketChecklists(selectedTicket.ticket_id).length}
                        </span>
                      </div>

                      {/* Reminders count */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Reminders</span>
                        <span className="helpdesk-property-value">0</span>
                      </div>

                      {/* Attachments */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Attachments</span>
                        <span className="helpdesk-property-value">
                          0 📎
                        </span>
                      </div>

                      {/* Responded Time */}
                      <div className="helpdesk-property-row">
                        <span className="helpdesk-property-label">Responded Time</span>
                        <span className="helpdesk-property-value" style={{ fontSize: 11.5 }}>
                          {(() => {
                            const techReplies = comments.filter(c => c.user?.role !== 'Client').sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                            return techReplies.length > 0 ? new Date(techReplies[0].created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                          })()}
                        </span>
                      </div>

                      {/* Worklog Timer */}
                      <div className="helpdesk-property-row" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: 10 }}>
                        <span className="helpdesk-property-label">Worklog Timer</span>
                        <span className="helpdesk-property-value timer">
                          ⏱ {formatWorklogTime(worklogTimers[selectedTicket.ticket_id] || 0)}
                        </span>
                      </div>

                      {/* Associations Expandable section */}
                      <div style={{ borderTop: '1px solid var(--border-dark)', paddingTop: 12, marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
                          <span>Associations</span>
                          <span>▾</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
                          <span style={{ color: 'var(--muted)' }}>Linked Requests</span>
                          <span style={{ color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}>Attach</span>
                        </div>
                      </div>

                    </div>
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
