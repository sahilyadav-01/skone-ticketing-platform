import { useMemo, useState } from 'react';
import TicketCard from './TicketCard';

function TicketList({ tickets, loading, isSupport = false, onUpdateTicket }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  if (loading) {

    return (
      <div className="ticket-list" style={{ marginTop: 12 }}>
        <p>Loading tickets...</p>
      </div>
    );
  }

  if (!tickets.length) {
    return <p>No tickets found.</p>;
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

