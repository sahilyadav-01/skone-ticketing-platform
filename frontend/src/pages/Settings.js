import React from 'react';

function Settings() {
  const settings = [
    { title: 'SLA policy', value: 'Response within 2 hours', note: 'Applied to all support queues' },
    { title: 'Ticket routing', value: 'Auto-assign by skill', note: 'Smart workload balancing enabled' },
    { title: 'Notification rules', value: 'Email + in-app', note: 'Critical alerts only' },
  ];

  const systemOptions = [
    { label: 'Require ticket priority', description: 'Ensure every request includes urgency.' },
    { label: 'Enable vendor tracking', description: 'Capture vendor status for external work.' },
    { label: 'Allow client asset tagging', description: 'Clients can attach asset tags to tickets.' },
  ];

  return (
    <div className="section-panel">
      <div className="section-header">
        <div>
          <h2>Settings</h2>
          <p className="section-subtitle">Manage system policies, notifications, and ticket workflow behavior.</p>
        </div>
      </div>

      <div className="admin-grid">
        <div className="ticket-card report-card">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>System configuration</div>
            <div className="section-subtitle">Core ticketing policies that keep your support team aligned.</div>
          </div>
          <div className="settings-list">
            {settings.map((item) => (
              <div key={item.title} className="settings-item">
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ color: 'var(--text)', marginTop: 4 }}>{item.value}</div>
                <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 12 }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ticket-card report-card">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Workflow settings</div>
            <div className="section-subtitle">Fine-tune how tickets move through support and escalation.</div>
          </div>
          <div className="settings-list">
            {systemOptions.map((item) => (
              <div key={item.label} className="settings-item">
                <div style={{ fontWeight: 700 }}>{item.label}</div>
                <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>{item.description}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btnPrimary">Edit settings</button>
            <button type="button" className="btn btnMuted">View audit logs</button>
          </div>
        </div>
      </div>

      <div className="ticket-card report-card">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Security & access</div>
          <div className="section-subtitle">Permissions, authentication, and admin controls for your workspace.</div>
        </div>
        <div className="settings-list">
          <div className="settings-item">
            <div style={{ fontWeight: 700 }}>Role-based access</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>Admins can assign roles, support engineers can only access queues, and clients can submit tickets.</div>
          </div>
          <div className="settings-item">
            <div style={{ fontWeight: 700 }}>Session timeout</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>Users are automatically signed out after 12 hours of inactivity.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
