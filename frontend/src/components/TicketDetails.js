import { useMemo, useState } from 'react';

function statusToVariant(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolved') || s === 'done') return 'success';
  if (s.includes('progress') || s.includes('in')) return 'warning';
  if (s.includes('open') || s.includes('todo')) return 'info';
  return 'neutral';
}

function StatusBadge({ status }) {
  const variant = statusToVariant(status);
  return <span className={`status-badge status-${variant}`}>{status || 'Unknown'}</span>;
}


function formatDate(value) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'N/A';
  }
}

function TicketDetails({ ticket, onUpdate, canEdit }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    status: ticket?.status || 'Open',
    assigned_tech: ticket?.assigned_tech || '',
    description: ticket?.description || '',
  });

  const hasChanges = useMemo(() => {
    if (!ticket) return false;
    return (
      String(form.status) !== String(ticket.status || '') ||
      String(form.assigned_tech || '') !== String(ticket.assigned_tech || '') ||
      String(form.description || '') !== String(ticket.description || '')
    );
  }, [form, ticket]);

  if (!ticket) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    const payload = {
      status: form.status,
      assigned_tech: form.assigned_tech ? form.assigned_tech : null,
      description: form.description,
    };

    setSubmitting(true);
    try {
      await onUpdate(ticket.ticket_id, payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ticket-details">
      <div className="ticket-details__header">
        <div className="ticket-details__title">
          <strong>Ticket #{ticket.ticket_id}</strong>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="ticket-details__meta">
          <div>Created: {formatDate(ticket.created_at)}</div>
        </div>
      </div>

      <div className="ticket-details__grid">
        <div className="ticket-details__row">
          <div className="ticket-details__label">Issue</div>
          <div className="ticket-details__value">{ticket.issue_type}</div>
        </div>
        <div className="ticket-details__row">
          <div className="ticket-details__label">Error code</div>
          <div className="ticket-details__value">{ticket.error_code || 'N/A'}</div>
        </div>
        <div className="ticket-details__row">
          <div className="ticket-details__label">Asset ID</div>
          <div className="ticket-details__value">{ticket.asset_id || 'None'}</div>
        </div>
        <div className="ticket-details__row">
          <div className="ticket-details__label">Assigned tech</div>
          <div className="ticket-details__value">{ticket.assigned_tech || 'Unassigned'}</div>
        </div>
      </div>

      <div className="ticket-details__section">
        <div className="ticket-details__sectionTitle">Description</div>
        <div className="ticket-details__description">{ticket.description}</div>
      </div>

      {canEdit && (
        <form className="ticket-details__update" onSubmit={handleSubmit}>
          <h3>Update ticket</h3>

          <label style={{ display: 'block' }}>
            Status
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Done">Done</option>
            </select>
          </label>

          <label style={{ display: 'block' }}>
            Assigned tech
            <input
              name="assigned_tech"
              value={form.assigned_tech}
              onChange={handleChange}
              style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
              placeholder="Optional"
            />
          </label>

          <label style={{ display: 'block' }}>
            Description / notes
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
            />
          </label>

          <button type="submit" className="primary-btn" disabled={submitting || !hasChanges}>
            {submitting ? 'Saving...' : 'Save updates'}
          </button>
        </form>
      )}
    </div>
  );
}

export default TicketDetails;

