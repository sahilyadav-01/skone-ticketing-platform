import { useMemo, useState } from 'react';
import TicketCard from './TicketCard';

function TicketList({ tickets, loading, isSupport = false, onUpdateTicket, page = 1, page_size = 20, total = 0, onPageChange }) {
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
        <p style={{ fontWeight: 800, fontSize: 16 }}>No tickets found.</p>
        <p style={{ color: 'var(--muted)' }}>You don't have any tickets yet. Create your first request to get started.</p>
        <div style={{ marginTop: 12 }}>
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
    );
  }

  // Support/Admin: show compact table with columns
  if (isSupport) {
    const totalPages = Math.max(1, Math.ceil((total || tickets.length) / page_size));
    return (
      <div style={{ marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '10px' }}>Ticket</th>
              <th style={{ padding: '10px' }}>Subject</th>
              <th style={{ padding: '10px' }}>Client</th>
              <th style={{ padding: '10px' }}>Priority</th>
              <th style={{ padding: '10px' }}>Assigned</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.ticket_id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onClick={() => setSelectedTicketId(t.ticket_id)}>
                <td style={{ padding: '10px' }}>TK-{t.ticket_id}</td>
                <td style={{ padding: '10px' }}>{t.subject || t.issue_type}</td>
                <td style={{ padding: '10px' }}>{t.client_id}</td>
                <td style={{ padding: '10px' }}><span className={`priority-badge priority-${String((t.priority||'Low')).toLowerCase()}`}>{t.priority || 'Low'}</span></td>
                <td style={{ padding: '10px' }}>{t.assigned_tech || 'Unassigned'}</td>
                <td style={{ padding: '10px' }}><span className={`status-badge status-${t.status ? (t.status.toLowerCase().includes('progress') ? 'warning' : (t.status.toLowerCase().includes('resolved') ? 'success' : 'info')) : 'neutral'}`}>{t.status}</span></td>
                <td style={{ padding: '10px' }}>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</td>
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

