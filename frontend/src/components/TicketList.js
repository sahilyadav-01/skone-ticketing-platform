import { useState } from 'react';
import TicketCard from './TicketCard';
import StatusBadge from './StatusBadge';

function TicketList({ tickets, loading, isSupport = false, showTable = false, onUpdateTicket, page = 1, page_size = 20, total = 0, onPageChange }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);

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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
          <div style={{ color: 'var(--muted)' }}>Page {page} of {totalPages}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
            <button className="btn" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-list" style={{ display: 'grid', gap: 16 }}>
      {tickets.map((ticket) => (
        <div key={ticket.ticket_id} onClick={() => setSelectedTicketId(ticket.ticket_id)} style={{ cursor: isSupport ? 'pointer' : 'default' }}>
          <TicketCard
            ticket={ticket}
            isSupport={isSupport}
            onUpdateTicket={onUpdateTicket}
            isSelected={selectedTicketId === ticket.ticket_id}
          />
        </div>
      ))}
    </div>
  );
}

export default TicketList;

