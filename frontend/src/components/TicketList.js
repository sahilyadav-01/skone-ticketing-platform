import { useState, useEffect, useMemo } from 'react';
import TicketCard from './TicketCard';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import { fetchComments, createComment, fetchTicketHistory } from '../services/api';
import { generateSuggestedReply } from '../utils/aiHelper';

function TicketList({ tickets, loading, isSupport = false, showTable = false, onUpdateTicket, page = 1, page_size = 20, total = 0, onPageChange, currentUser }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [activeTab, setActiveTab] = useState('conversations');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const selectedTicket = tickets.find((t) => t.ticket_id === selectedTicketId) || null;

  useEffect(() => {
    if (!selectedTicketId) {
      setComments([]);
      setHistory([]);
      setActiveTab('conversations');
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

  const currentTicketIndex = tickets.findIndex((t) => t.ticket_id === selectedTicketId);
  const handlePrevTicket = () => {
    if (currentTicketIndex > 0) {
      setSelectedTicketId(tickets[currentTicketIndex - 1].ticket_id);
    }
  };
  const handleNextTicket = () => {
    if (currentTicketIndex < tickets.length - 1) {
      setSelectedTicketId(tickets[currentTicketIndex + 1].ticket_id);
    }
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
      const newComment = await createComment(selectedTicketId, currentUser?.user_id, newCommentText.trim());
      setComments((prev) => [...prev, newComment]);
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

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

  const renderModalContent = () => {
    if (!selectedTicket) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 1. TOP ACTION TOOLBAR FOR MODAL */}
        <div className="helpdesk-toolbar" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: 10 }}>
          <div className="helpdesk-toolbar__left">
            <button
              type="button"
              className="btn"
              onClick={() => window.print()}
              style={{ height: 36, fontSize: 12.5 }}
            >
              Print Ticket
            </button>
            {isSupport && (
              <button
                type="button"
                className="btn btnPrimary"
                onClick={() => onUpdateTicket(selectedTicket.ticket_id, { status: 'Closed' })}
                style={{ height: 36, fontSize: 12.5 }}
              >
                Close Ticket
              </button>
            )}
          </div>
          <div className="helpdesk-toolbar__right">
            {/* Prev/Next navigation */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="btn"
                onClick={handlePrevTicket}
                disabled={currentTicketIndex <= 0}
                style={{ padding: '8px 10px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Previous ticket"
              >
                ‹
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleNextTicket}
                disabled={currentTicketIndex < 0 || currentTicketIndex >= tickets.length - 1}
                style={{ padding: '8px 10px', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Next ticket"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* 2. MAIN GRID LAYOUT */}
        <div className="helpdesk-grid">
          {/* Main Panel Left */}
          <div className="helpdesk-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header info */}
            <div className="helpdesk-incident-header" style={{ marginBottom: 8 }}>
              <div className="helpdesk-incident-icon" style={{ width: 40, height: 40, fontSize: 20 }}>🎫</div>
              <div className="helpdesk-incident-info">
                <h3 className="helpdesk-incident-title" style={{ fontSize: '1.2rem' }}>
                  #TK-{selectedTicket.ticket_id} {selectedTicket.subject || 'Incident Request'}
                </h3>
                <div className="helpdesk-incident-subtitle" style={{ fontSize: 12 }}>
                  <span className="helpdesk-tag-pill">{selectedTicket.issue_type || 'Incident Request'}</span>
                  <span>Requested by <strong>{selectedTicket.client?.username || 'Client'}</strong></span>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
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
                📋 Info
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
                className={`timeline-tab ${activeTab === 'history' ? 'isActive' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                Audit Trail ({history.length})
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'conversations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Checkbox filters */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-dark)' }}>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignItems: 'center' }}>
                    <span>Filter:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={filterEmails}
                        onChange={(e) => setFilterEmails(e.target.checked)}
                        style={{ width: 13, height: 13, cursor: 'pointer' }}
                      />
                      Emails
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={filterAutoNotifications}
                        onChange={(e) => setFilterAutoNotifications(e.target.checked)}
                        style={{ width: 13, height: 13, cursor: 'pointer' }}
                      />
                      Auto
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={filterNotes}
                        onChange={(e) => setFilterNotes(e.target.checked)}
                        style={{ width: 13, height: 13, cursor: 'pointer' }}
                      />
                      Notes
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSortAsc(!sortAsc)}
                    style={{ padding: '3px 6px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    ⇅ {sortAsc ? 'Oldest' : 'Newest'}
                  </button>
                </div>

                {/* Timeline */}
                <div className="helpdesk-timeline-container" style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {loadingComments ? (
                    <div style={{ textAlign: 'center', padding: '15px 0', color: 'var(--muted)', fontSize: 12 }}>
                      Loading comments...
                    </div>
                  ) : filteredComments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--muted)', fontSize: 12 }}>
                      No comments to display.
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
                              <span className="timeline-date-pill" style={{ padding: '2px 8px', fontSize: 10 }}>{currentDateLabel}</span>
                            </div>
                          );
                        }

                        const isCommentTech = comment.user?.role !== 'Client';
                        const headerClass = isCommentTech ? 'tech' : 'client';
                        const badgeClass = isCommentTech ? 'tech' : 'client';

                        const ticketId = selectedTicket.ticket_id;
                        const subject = selectedTicket.subject || selectedTicket.issue_type || 'Support Ticket';

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
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        const isSystemNotification = comment.user?.username === 'System';

                        if (isSystemNotification) {
                          return (
                            <div key={comment.id} style={{ display: 'flex', flexDirection: 'column' }}>
                              {dateSeparator}
                              <div className="helpdesk-timeline-node">
                                <div className="helpdesk-timeline-badge" style={{ width: 26, height: 26, fontSize: 12, backgroundColor: '#e2e8f0', color: '#64748b' }}>⚙</div>
                                <div style={{ flex: 1, padding: '8px 12px', background: '#f8fafc', border: '1px solid var(--border-dark)', borderRadius: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                                  <strong>Notification:</strong> {comment.message}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={comment.id} style={{ display: 'flex', flexDirection: 'column' }}>
                            {dateSeparator}
                            <div className="helpdesk-timeline-node">
                              <div className={`helpdesk-timeline-badge ${badgeClass}`} style={{ width: 26, height: 26, fontSize: 12 }}>✉</div>
                              
                              <div className="helpdesk-envelope">
                                <div className={`helpdesk-envelope__header ${headerClass}`} style={{ padding: '6px 12px', fontSize: 11.5 }}>
                                  <span>{comment.user?.username || 'User'} ({comment.user?.role || 'Client'})</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{formattedDate}</span>
                                    <span>🌐</span>
                                  </div>
                                </div>
                                <div className="helpdesk-envelope__body" style={{ padding: 12, fontSize: 12.5 }}>
                                  <div className="helpdesk-envelope__meta-row"><strong>To :</strong> {recipientEmail}</div>
                                  <div className="helpdesk-envelope__meta-row"><strong>Re:</strong> [Request ID :##TK-{ticketId}##] : {subject}</div>
                                  <div className="helpdesk-envelope__divider" style={{ margin: '8px 0' }}></div>
                                  <div style={{ marginBottom: 6, fontWeight: 600 }}>Dear {recipientName},</div>
                                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{comment.message}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handlePostComment} className="comment-input-area" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="triage-section-title" style={{ margin: 0, fontSize: 12 }}>Add Message</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setNewCommentText(generateSuggestedReply(selectedTicket, currentUser, isSupport))}
                      style={{ padding: '3px 6px', fontSize: 10, background: 'rgba(124, 58, 237, 0.08)', color: 'var(--purple-hover)', border: '1px solid rgba(124, 58, 237, 0.15)', borderRadius: 6 }}
                    >
                      🪄 Suggested Reply
                    </button>
                  </div>
                  <textarea
                    className="control"
                    placeholder="Ask support a question or reply..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    required
                    style={{ minHeight: 65, fontSize: 12.5 }}
                  />
                  <div className="comment-input-actions">
                    <button
                      type="submit"
                      className="btn btnPrimary"
                      disabled={postingComment || !newCommentText.trim()}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      {postingComment ? 'Posting...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="triage-info-card" style={{ padding: 12 }}>
                    <div className="triage-info-row">
                      <span className="triage-info-label">Status</span>
                      <span className="triage-info-value"><StatusBadge status={selectedTicket.status} /></span>
                    </div>
                    <div className="triage-info-row" style={{ marginTop: 8 }}>
                      <span className="triage-info-label">Priority</span>
                      <span className={`priority-badge priority-${String(selectedTicket.priority || 'Low').toLowerCase()}`}>{selectedTicket.priority || 'Low'}</span>
                    </div>
                  </div>
                  <div className="triage-info-card" style={{ padding: 12 }}>
                    <div className="triage-info-row">
                      <span className="triage-info-label">Assigned Tech</span>
                      <span className="triage-info-value">{selectedTicket.assigned_tech || 'Unassigned'}</span>
                    </div>
                    <div className="triage-info-row" style={{ marginTop: 8 }}>
                      <span className="triage-info-label">Issue Type</span>
                      <span className="triage-info-value">{selectedTicket.issue_type}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="triage-detail__desc-label" style={{ fontSize: 12 }}>Description</div>
                  <div className="triage-detail__desc-box" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, padding: 10, minHeight: 80 }}>
                    {selectedTicket.description}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="triage-section-title" style={{ fontSize: 12 }}>☑ Tasks Progress</span>
                <div className="helpdesk-todo-list">
                  {getTicketTasks(selectedTicket.ticket_id).map((task) => (
                    <div key={task.id} className="helpdesk-todo-item" style={{ padding: '8px 12px' }}>
                      <label className="helpdesk-todo-checkbox" style={{ fontSize: 12.5 }}>
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => toggleTask(selectedTicket.ticket_id, task.id)}
                        />
                        <span className={task.done ? 'done' : ''}>{task.text}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    className="control"
                    placeholder="New task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={() => {
                      addTask(selectedTicket.ticket_id, newTaskInput);
                      setNewTaskInput('');
                    }}
                    style={{ padding: '6px 10px', fontSize: 12 }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'checklists' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="triage-section-title" style={{ fontSize: 12 }}>⚙ Verification Checklists</span>
                <div className="helpdesk-todo-list">
                  {getTicketChecklists(selectedTicket.ticket_id).map((chk) => (
                    <div key={chk.id} className="helpdesk-todo-item" style={{ padding: '8px 12px' }}>
                      <label className="helpdesk-todo-checkbox" style={{ fontSize: 12.5 }}>
                        <input
                          type="checkbox"
                          checked={chk.done}
                          onChange={() => toggleChecklist(selectedTicket.ticket_id, chk.id)}
                        />
                        <span className={chk.done ? 'done' : ''}>{chk.text}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    className="control"
                    placeholder="New checklist item..."
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={() => {
                      addChecklist(selectedTicket.ticket_id, newChecklistInput);
                      setNewChecklistInput('');
                    }}
                    style={{ padding: '6px 10px', fontSize: 12 }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-timeline" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '15px 0', color: 'var(--muted)', fontSize: 12 }}>
                    Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--muted)', fontSize: 12 }}>
                    No audit records logs.
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
                      <div key={record.id} className="timeline-item" style={{ gap: 10 }}>
                        <div className={`timeline-badge ${badgeClass}`} style={{ width: 16, height: 16, fontSize: 9 }}>{badgeIcon}</div>
                        <div className="timeline-content" style={{ fontSize: 12.5 }}>
                          <span className="timeline-action">{record.action}</span>
                          <div className="timeline-details">
                            Changed from <strong>{record.old_value}</strong> to <strong>{record.new_value}</strong>
                          </div>
                          <span className="timeline-meta" style={{ fontSize: 10 }}>
                            By {record.changed_by_user?.username || 'System'} • {new Date(record.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

          {/* Properties Side Panel Right */}
          <div className="helpdesk-sidebar">
            <div className="helpdesk-properties-widget" style={{ padding: 14, gap: 12 }}>
              <h4 className="helpdesk-properties-title" style={{ fontSize: 13, paddingBottom: 8 }}>
                Properties <span>▾</span>
              </h4>
              <div className="helpdesk-properties-list" style={{ gap: 10 }}>
                
                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Request ID</span>
                  <span className="helpdesk-property-value" style={{ cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(`#TK-${selectedTicket.ticket_id}`)} title="Copy Request ID">
                    # {selectedTicket.ticket_id} 📋
                  </span>
                </div>

                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Status</span>
                  <span className="helpdesk-property-value status">🔒 {selectedTicket.status}</span>
                </div>

                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Technician</span>
                  <span className="helpdesk-property-value">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: selectedTicket.assigned_tech ? 'var(--success)' : '#94a3b8', display: 'inline-block' }}></span>
                    {selectedTicket.assigned_tech || 'Unassigned'}
                  </span>
                </div>

                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Group & Site</span>
                  <span className="helpdesk-property-value">ITHelpdesk , Base Site</span>
                </div>

                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Tasks</span>
                  <span className="helpdesk-property-value">
                    {getTicketTasks(selectedTicket.ticket_id).filter(t => t.done).length} / {getTicketTasks(selectedTicket.ticket_id).length}
                  </span>
                </div>

                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Checklists</span>
                  <span className="helpdesk-property-value">
                    {getTicketChecklists(selectedTicket.ticket_id).filter(c => c.done).length} / {getTicketChecklists(selectedTicket.ticket_id).length}
                  </span>
                </div>

                <div className="helpdesk-property-row">
                  <span className="helpdesk-property-label">Attachments</span>
                  <span className="helpdesk-property-value">0 📎</span>
                </div>

                <div className="helpdesk-property-row" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: 8 }}>
                  <span className="helpdesk-property-label">Worklog Timer</span>
                  <span className="helpdesk-property-value timer" style={{ fontSize: 12 }}>
                    ⏱ {formatWorklogTime(worklogTimers[selectedTicket.ticket_id] || 0)}
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  if (loading) {
    return (
      <div className="ticket-list" style={{ marginTop: 12 }}>
        <p>Loading tickets...</p>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div style={{ marginTop: 12 }}>
        <div className="ticket-card" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>📭 No tickets yet</div>
          <div style={{ color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
            Create your first support request and keep the team in sync.
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => {
                const el = document.getElementById('create-ticket-form');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="btn btnPrimary"
            >
              Create Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showTable || isSupport) {
    const totalPages = Math.max(1, Math.ceil((total || tickets.length) / page_size));
    return (
      <div style={{ marginTop: 12 }}>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.ticket_id} onClick={() => setSelectedTicketId(t.ticket_id)} style={{ cursor: 'pointer' }}>
                  <td>TK-{t.ticket_id}</td>
                  <td>{t.subject || t.issue_type || 'No subject'}</td>
                  <td>
                    <span className={`priority-badge priority-${String((t.priority || 'Low')).toLowerCase()}`}>{t.priority || 'Low'}</span>
                  </td>
                  <td>
                    <StatusBadge status={t.status || 'Open'} />
                  </td>
                  <td>{t.assigned_tech || 'Unassigned'}</td>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
          <div style={{ color: 'var(--muted)' }}>Page {page} of {totalPages}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
            <button className="btn" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </div>

        {/* Modal Detail View */}
        {selectedTicket && (
          <Modal
            isOpen={!!selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
            title={`Ticket Detail - TK-${selectedTicket.ticket_id}: ${selectedTicket.subject || 'No Subject'}`}
          >
            {renderModalContent()}
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="ticket-list" style={{ display: 'grid', gap: 16 }}>
      {tickets.map((ticket) => (
        <div key={ticket.ticket_id} onClick={() => setSelectedTicketId(ticket.ticket_id)} style={{ cursor: 'pointer' }}>
          <TicketCard
            ticket={ticket}
            isSupport={isSupport}
            onUpdateTicket={onUpdateTicket}
            isSelected={selectedTicketId === ticket.ticket_id}
          />
        </div>
      ))}

      {/* Modal Detail View */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          title={`Ticket Detail - TK-${selectedTicket.ticket_id}: ${selectedTicket.subject || 'No Subject'}`}
        >
          {renderModalContent()}
        </Modal>
      )}
    </div>
  );
}

export default TicketList;
