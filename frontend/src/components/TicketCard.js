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

function TicketCard({ ticket }) {
  return (
    <div className="ticket-card">
      <div className="ticket-card__top">
        <strong>Ticket #{ticket.ticket_id}</strong>
        <StatusBadge status={ticket.status} />
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
          <span className="ticket-card__label">Assigned tech:</span>
          <span className="ticket-card__value">{ticket.assigned_tech || 'Unassigned'}</span>
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

