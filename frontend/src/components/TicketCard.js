import { useState } from 'react';
import StatusBadge from './StatusBadge';

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

  const priorityClass = ticket.priority ? `priority-${String(ticket.priority).toLowerCase()}` : 'priority-low';

  return (
    <div className="ticket-card">
      <div className="ticket-card__top">
        <div>
          <strong>TK-{ticket.ticket_id}</strong>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{ticket.subject || ''}</div>
        </div>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setIsEditing(true)} style={{ padding: '6px 10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Edit
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={async () => {
                    const next = 'Assigned';
                    setStatus(next);
                    if (onUpdateTicket) await onUpdateTicket(ticket.ticket_id, { status: next });
                  }}
                  className="btn"
                >
                  Assign
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const next = 'In Progress';
                    setStatus(next);
                    if (onUpdateTicket) await onUpdateTicket(ticket.ticket_id, { status: next });
                  }}
                  className="btn"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const next = 'Resolved';
                    setStatus(next);
                    if (onUpdateTicket) await onUpdateTicket(ticket.ticket_id, { status: next });
                  }}
                  className="btn btnSuccess"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const next = 'Closed';
                    setStatus(next);
                    if (onUpdateTicket) await onUpdateTicket(ticket.ticket_id, { status: next });
                  }}
                  className="btn btnDanger"
                >
                  Close
                </button>
              </div>
            </div>
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
          <span className="ticket-card__label">Priority:</span>
          <span className={`priority-badge ${priorityClass}`}>{ticket.priority || 'Low'}</span>
        </div>
        <div className="ticket-card__row">
          <span className="ticket-card__label">Status:</span>
          {isEditing ? (
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 4, border: '1px solid #d1d5db', borderRadius: 4 }}>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Vendor">Waiting for Vendor</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
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

