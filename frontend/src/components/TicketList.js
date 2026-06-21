import { useState, useEffect } from 'react';
import TicketCard from './TicketCard';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import { fetchComments, createComment, fetchTicketHistory } from '../services/api';

function TicketList({ tickets, loading, isSupport = false, showTable = false, onUpdateTicket, page = 1, page_size = 20, total = 0, onPageChange, currentUser }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const selectedTicket = tickets.find((t) => t.ticket_id === selectedTicketId) || null;

  useEffect(() => {
    if (!selectedTicketId) {
      setComments([]);
      setHistory([]);
      setActiveTab('details');
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
        {/* Modal Tabs */}
        <div className="timeline-tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`timeline-tab ${activeTab === 'details' ? 'isActive' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📋 Info
          </button>
          <button
            type="button"
            className={`timeline-tab ${activeTab === 'comments' ? 'isActive' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            💬 Comments ({comments.length})
          </button>
          <button
            type="button"
            className={`timeline-tab ${activeTab === 'history' ? 'isActive' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            ⏱️ History ({history.length})
          </button>
        </div>

        {/* Info Tab */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="triage-info-card" style={{ padding: 12 }}>
                <div className="triage-info-row">
                  <span className="triage-info-label">Status</span>
                  <span className="triage-info-value">
                    <StatusBadge status={selectedTicket.status} />
                  </span>
                </div>
                <div className="triage-info-row" style={{ marginTop: 8 }}>
                  <span className="triage-info-label">Priority</span>
                  <span className={`priority-badge priority-${String(selectedTicket.priority || 'Low').toLowerCase()}`}>
                    {selectedTicket.priority || 'Low'}
                  </span>
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
              <div className="triage-detail__desc-label">Description</div>
              <div className="triage-detail__desc-box" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedTicket.description}
              </div>
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="comments-section" style={{ maxHeight: '300px' }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--muted)', fontSize: 13 }}>
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => {
                  const userInitial = comment.user?.username
                    ? comment.user.username.charAt(0).toUpperCase()
                    : 'U';
                  const roleClass = String(comment.user?.role || '').toLowerCase();
                  return (
                    <div key={comment.id} className="comment-card">
                      <div className="comment-header">
                        <div className="comment-avatar">{userInitial}</div>
                        <span className="comment-user">{comment.user?.username || 'User'}</span>
                        <span className={`comment-role-badge ${roleClass}`}>
                          {comment.user?.role || 'Client'}
                        </span>
                        <span className="comment-time">{getRelativeAge(comment.created_at)}</span>
                      </div>
                      <div className="comment-message">{comment.message}</div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handlePostComment} className="comment-input-area">
              <textarea
                className="control"
                placeholder="Ask support a question..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                required
              />
              <div className="comment-input-actions">
                <button
                  type="submit"
                  className="btn btnPrimary"
                  disabled={postingComment || !newCommentText.trim()}
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  {postingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-timeline" style={{ maxHeight: '300px' }}>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--muted)', fontSize: 13 }}>
                No history log.
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
                        By {record.changed_by_user?.username || 'System'} • {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
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
