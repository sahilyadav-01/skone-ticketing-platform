import { useEffect, useState } from 'react';
import { createTicket, fetchTicketsForClient } from './api';
import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import LoginAsClient from './components/LoginAsClient';

function App() {
  const [client, setClient] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!client) return;
    loadTickets(client.user_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const loadTickets = async (clientId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTicketsForClient(clientId);
      setTickets(data);
    } catch (err) {
      setError('Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (ticket) => {
    if (!client) return;
    const created = await createTicket({
      ...ticket,
      client_id: client.user_id,
    });
    setTickets((prev) => [created, ...prev]);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header>
        <h1>Skone IT Ticketing</h1>
        <p>Submit a ticket or review the latest requests.</p>
      </header>

      {!client ? (
        <LoginAsClient onLogin={setClient} />
      ) : (
        <>
          <div style={{ marginBottom: 18, color: '#374151' }}>
            Signed in as <strong>{client.username}</strong>
            <span style={{ marginLeft: 8, color: '#6b7280' }}>({client.role})</span>
          </div>

          <TicketForm onSubmit={handleSubmit} defaultClientId={client.user_id} />

          {error && (
            <div style={{ color: '#b91c1c', marginTop: 12 }} role="alert">
              {error}
            </div>
          )}
          <TicketList tickets={tickets} loading={loading} />
        </>
      )}
    </div>
  );
}

export default App;


