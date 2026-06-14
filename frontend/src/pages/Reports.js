import React from 'react';

function Reports({ onFilter }) {
  const reports = [
    { label: 'Ticket Volume', value: '428', detail: 'Past 7 days' },
    { label: 'SLA Compliance', value: '94%', detail: 'Last 30 days' },
    { label: 'Avg. Response', value: '1h 22m', detail: 'Median time' },
  ];

  const insights = [
    { title: 'Top incoming issue', value: 'VPN outage', note: '22 tickets this week' },
    { title: 'Highest escalation', value: 'Email delivery', note: '4 escalations' },
    { title: 'At-risk queue', value: 'Assigned Queue', note: '8 tickets over SLA' },
  ];

  const trends = [
    { ticket: 'TK-1001', subject: 'Printer access failure', status: 'Open', owner: 'Sahil' },
    { ticket: 'TK-1006', subject: 'VPN blocked', status: 'In Progress', owner: 'Mukul' },
    { ticket: 'TK-1010', subject: 'Password reset', status: 'Resolved', owner: 'Support' },
  ];

  return (
    <div className="section-panel">
      <div className="section-header">
        <div>
          <h2>Reports</h2>
          <p className="section-subtitle">Ticket performance, SLA health, and escalation trends for your team.</p>
        </div>
      </div>

      <div className="admin-grid">
        {reports.map((metric) => (
          <div key={metric.label} className="ticket-card report-card">
            <div className="dashboard-stat__label">{metric.label}</div>
            <div className="dashboard-stat__value">{metric.value}</div>
            <div className="dashboard-stat__hint">{metric.detail}</div>
          </div>
        ))}
      </div>

      <div className="ticket-card report-card">
        <div className="dashboard__recentTop" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Highlights</div>
            <div className="section-subtitle">Actionable insights from the latest ticket trends.</div>
          </div>
          <button type="button" className="btn btnMuted" onClick={() => onFilter?.({ view: 'assigned_queue' })}>
            Review queue
          </button>
        </div>
        <div className="settings-list">
          {insights.map((item) => (
            <div key={item.title} className="settings-item">
              <div style={{ fontWeight: 700 }}>{item.title}</div>
              <div style={{ color: 'var(--text)', marginTop: 4 }}>{item.value}</div>
              <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 12 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ticket-card report-card">
        <div className="dashboard__recentTop" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Recent ticket trends</div>
            <div className="section-subtitle">Top issues and resolution flow from the past 24 hours.</div>
          </div>
          <button type="button" className="btn btnPrimary" onClick={() => onFilter?.({ status: 'Resolved' })}>
            Show resolved
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((row) => (
              <tr key={row.ticket}>
                <td>{row.ticket}</td>
                <td>{row.subject}</td>
                <td>{row.status}</td>
                <td>{row.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;
