import { useState } from 'react';

function statusToVariant(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolved') || s === 'done') return 'success';
  if (s.includes('progress') || s.includes('in')) return 'warning';
  if (s.includes('open') || s === 'todo') return 'info';
  return 'neutral';
}

function StatusBadge({ status }) {
  const variant = statusToVariant(status);
  return <span className={`status-badge status-${variant}`}>{status || 'Unknown'}</span>;
}

function TicketCard({ ticket, isSupport = false, onUpdateTicket, isSelected = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(ticket.status || 'Open');
  const [assignedTech, setAssignedTech] = useState(ticket.assigned_tech || '');

  const handleSave = () => {

    if (onUpdateTicket) {
      onUpdateTicket(ticket.ticket_id, { status, assigned_tech: assignedTech || null });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setStatus(ticket.status || 'Open');
    setAssignedTech(ticket.assigned_tech || '');
    setIsEditing(false);
  };

  return (
    <div className="ticket-card">
      <div className="ticket-card__top">
        <strong>Ticket #{ticket.ticket_id}</strong>
        {isSupport ? (
          isEditing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} style={{ padding: '4px 8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={handleCancel} style={{ padding: '4px 8px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Edit
            </button>
          )
        ) : (
          <StatusBadge status={ticket.status} />
        )}
      </div>

      <div className="ticket-card__grid">
        <div className="ticket-card__row">
          <span className="ticket-card__label">Issue:</span>
          <span className="ticket-card__value">{ticket.issue_type}</span>
        </div>
        <div className="ticket-card__row">
          <span className="ticket-card__label">Error code:</span>
          <span className="ticket-card__value">{ticket.error_code || 'N/A'}</span>
        </div>
        <div className="ticket-card__row">
          <span className="ticket-card__label">Asset ID:</span>
          <span className="ticket-card__value">{ticket.asset_id || 'None'}</span>
        </div>
        <div className="ticket-card__row">
          <span className="ticket-card__label">Status:</span>
          {isEditing ? (
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 4, border: '1px solid #d1d5db', borderRadius: 4 }}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          ) : (
            <StatusBadge status={ticket.status} />
          )}
        </div>
        <div className="ticket-card__row">
          <span className="ticket-card__label">Assigned tech:</span>
          {isEditing ? (
            <input
              type="text"
              value={assignedTech}
              onChange={(e) => setAssignedTech(e.target.value)}
              placeholder="Enter tech name"
              style={{ padding: 4, border: '1px solid #d1d5db', borderRadius: 4, width: '100%' }}
            />
          ) : (
            <span className="ticket-card__value">{ticket.assigned_tech || 'Unassigned'}</span>
          )}
        </div>
      </div>

      <p className="ticket-card__desc">{ticket.description}</p>

      <div className="ticket-card__footer">
        <small>Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}</small>
      </div>
    </div>
  );
}

export default TicketCard;

