import { useState, useEffect, useMemo } from 'react';
import { adminFetchUsers, fetchComments, createComment, fetchTicketHistory } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { generateSuggestedReply, generateAISuggestedReply } from '../utils/aiHelper';
import SlaTimer from '../components/SlaTimer';

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

  const handleCopyRequestId = (id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id.toString());
      alert(`Request ID #${id} copied to clipboard!`);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = id.toString();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(`Request ID #${id} copied to clipboard!`);
    }
  };

  // Kanban view mode addition
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  // Standard Lifecycle Status transitions
  const handleStatusChange = async (ticketId, newStatus) => {
    const ticketObj = tickets.find((t) => t.ticket_id === ticketId);
    if (!ticketObj) return;

    const currentStatus = ticketObj.status;
    if (currentStatus === newStatus) return;

    const allowedTransitions = {
      'Open': ['Assigned', 'In Progress'],
      'Assigned': ['In Progress', 'Waiting for Vendor', 'Resolved'],
      'In Progress': ['Waiting for Vendor', 'Resolved'],
      'Waiting for Vendor': ['In Progress', 'Resolved'],
      'Resolved': ['Closed', 'In Progress'],
      'Closed': ['Open']
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus) && currentUser?.role !== 'Admin') {
      alert(`Status transition from "${currentStatus}" to "${newStatus}" is invalid under support SLA workflow rules.`);
      return;
    }

    try {
      await handleUpdate(ticketId, { status: newStatus });
    } catch (err) {
      console.error('Failed to transition status:', err);
    }
  };

  const statuses = ['Open', 'Assigned', 'In Progress', 'Waiting for Vendor', 'Resolved', 'Closed'];

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

      {/* 2. Unified Workspace Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: '280px', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="control"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ fontSize: 13, padding: '8px 12px', width: 140 }}
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
            style={{ fontSize: 13, padding: '8px 12px', width: 120 }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
          </select>

          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'isActive' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📝 List
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'kanban' ? 'isActive' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              📋 Kanban
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Area */}
      <div className={viewMode === 'list' ? 'triage-layout-full' : ''}>
        {viewMode === 'list' ? (
          /* List Feed List (full-width) */
          <div className="triage-feed" style={{ maxWidth: '100%', maxHeight: '600px' }}>
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
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <SlaTimer ticket={t} />
                        <span className="triage-card__time">{getRelativeAge(t.created_at)}</span>
                      </div>
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
        ) : (
          /* Kanban Board */
          <div className="kanban-board">
            {statuses.map((status) => {
              const columnTickets = filteredTickets.filter(t => t.status === status);
              return (
                <div
                  key={status}
                  className="kanban-column"
                  data-status={status}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const ticketIdStr = e.dataTransfer.getData('text/plain');
                    if (ticketIdStr) {
                      const ticketId = parseInt(ticketIdStr, 10);
                      handleStatusChange(ticketId, status);
                    }
                  }}
                >
                  <div className="kanban-column-header">
                    <span>{status}</span>
                    <span className="kanban-column-count">{columnTickets.length}</span>
                  </div>
                  <div className="kanban-card-list">
                    {columnTickets.map((t) => {
                      const priorityClass = t.priority ? `priority-${t.priority.toLowerCase()}` : 'priority-low';
                      return (
                        <div
                          key={t.ticket_id}
                          className={`kanban-card ${priorityClass}`}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', t.ticket_id.toString())}
                          onClick={() => setSelectedTicketId(t.ticket_id)}
                        >
                          <div className="kanban-card__header">
                            <span className="kanban-card__id">TK-{t.ticket_id}</span>
                            <SlaTimer ticket={t} />
                          </div>
                          <h4 className="kanban-card__subject">{t.subject || t.issue_type || 'No subject'}</h4>
                          <div className="kanban-card__client">
                            👤 {t.client?.username || 'Client'}
                          </div>
                          <div className="kanban-card__footer">
                            <StatusBadge status={t.status} />
                            <span className={`priority-badge priority-${String(t.priority || 'Low').toLowerCase()}`}>
                              {t.priority || 'Low'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Split-View Context Detail Drawer */}
      {selectedTicket && (
        <>
          <div className="triage-drawer-overlay" onClick={() => setSelectedTicketId(null)} />
          <div className="triage-drawer">
            <button
              type="button"
              className="triage-drawer-close"
              onClick={() => setSelectedTicketId(null)}
              aria-label="Close drawer"
            >
              ✕
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Back button (Mobile view helper) */}
              <button
                type="button"
                className="triage-back-btn"
                onClick={() => setSelectedTicketId(null)}
              >
                ← Close Details
              </button>

              {/* 1. TOP HELPDESK ACTIONS TOOLBAR */}
              <div className="helpdesk-toolbar">
                <div className="helpdesk-toolbar__left">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSelectedTicketId(null)}
                    style={{ padding: '8px 12px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Close details"
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
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '8px 10px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ⚙
                  </button>
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
                <div className="helpdesk-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  </div>

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

                  {activeTab === 'conversations' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                            <span>Emails</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filterAutoNotifications}
                              onChange={(e) => setFilterAutoNotifications(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            <span>Notifications</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filterNotes}
                              onChange={(e) => setFilterNotes(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            <span>Notes</span>
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setSortAsc(!sortAsc)}
                            style={{ fontSize: 11.5, padding: '4px 8px' }}
                          >
                            Sort: {sortAsc ? 'Oldest first ▲' : 'Newest first ▼'}
                          </button>
                        </div>
                      </div>

                      <div className="helpdesk-comments-feed" style={{ maxHeight: 350, overflowY: 'auto' }}>
                        {loadingComments ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
                            Loading conversations...
                          </div>
                        ) : filteredComments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)', fontSize: 13.5 }}>
                            No message history found for this ticket.
                          </div>
                        ) : (
                          filteredComments.map((comment) => {
                            const isSystem = comment.user?.username === 'System';
                            const isClientUser = comment.user?.role === 'Client';
                            let commentClass = 'helpdesk-comment-card';
                            
                            if (isSystem) commentClass += ' system';
                            else if (isClientUser) commentClass += ' client';
                            else commentClass += ' tech';

                            return (
                              <div key={comment.id} className={commentClass}>
                                <div className="helpdesk-comment-meta">
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div className="helpdesk-comment-avatar">
                                      {comment.user?.username ? comment.user.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                                    </div>
                                    <span className="helpdesk-comment-author">{comment.user?.username || 'User'}</span>
                                    <span className="helpdesk-comment-role">({comment.user?.role || 'User'})</span>
                                  </div>
                                  <span className="helpdesk-comment-date">{getRelativeAge(comment.created_at)}</span>
                                </div>
                                <div className="helpdesk-comment-body" style={{ whiteSpace: 'pre-wrap' }}>
                                  {comment.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form onSubmit={handlePostComment} className="helpdesk-reply-box" style={{ marginTop: 10 }}>
                        <textarea
                          id="reply-text-box"
                          className="control"
                          placeholder="Type your response or public note here..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          style={{ minHeight: 90, fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={handleAISuggestedReply}
                            disabled={generatingAI}
                            style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            ✨ {generatingAI ? 'Drafting...' : 'AI Suggest Reply'}
                          </button>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setNewCommentText('')}
                              style={{ fontSize: 13, padding: '8px 14px' }}
                            >
                              Discard
                            </button>
                            <button
                              type="submit"
                              className="btn btnPrimary"
                              disabled={postingComment}
                              style={{ fontSize: 13, padding: '8px 18px' }}
                            >
                              {postingComment ? 'Posting...' : 'Post Reply'}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div className="triage-info-card" style={{ padding: 18 }}>
                        <span className="triage-section-title">📝 Ticket Description</span>
                        <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                          {selectedTicket.description || 'No description provided.'}
                        </div>
                      </div>

                      <div className="triage-detail-split-grid">
                        <div>
                          <span className="triage-section-title">👤 Reporter Details</span>
                          <div className="triage-info-card">
                            <div className="triage-info-row">
                              <span className="triage-info-label">Name</span>
                              <span className="triage-info-value">{selectedTicket.client?.username || 'Client'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TicketQueueWorkspace;
