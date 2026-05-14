import TicketCard from './TicketCard';

function TicketList({ tickets, loading }) {
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
        <TicketCard key={ticket.ticket_id} ticket={ticket} />
      ))}
    </div>
  );
}

export default TicketList;

