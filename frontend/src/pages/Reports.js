import React, { useState } from 'react';

// Mocked live dashboard metrics
const STATUS_METRICS = [
  { name: 'Open', count: 32, percentage: 32, color: '#2563eb', gradient: 'url(#blueGrad)' },
  { name: 'In Progress', count: 24, percentage: 24, color: '#7c3aed', gradient: 'url(#purpleGrad)' },
  { name: 'Resolved', count: 30, percentage: 30, color: '#10b981', gradient: 'url(#successGrad)' },
  { name: 'Closed', count: 14, percentage: 14, color: '#64748b', gradient: 'url(#grayGrad)' }
];

const PRIORITY_METRICS = [
  { priority: 'Critical', count: 8, color: '#ef4444', gradient: 'url(#redGrad)', resolutionSla: '2h' },
  { priority: 'High', count: 18, color: '#f59e0b', gradient: 'url(#orangeGrad)', resolutionSla: '8h' },
  { priority: 'Medium', count: 42, color: '#3b82f6', gradient: 'url(#blueGrad)', resolutionSla: '24h' },
  { priority: 'Low', count: 32, color: '#0d9488', gradient: 'url(#tealGrad)', resolutionSla: '72h' }
];

// Helper to calculate polar coordinates for SVG donut segments
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
};

function Reports({ onFilter }) {
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  const reports = [
    { label: 'Total Volume', value: '100', detail: 'Active & closed tickets' },
    { label: 'SLA Compliance', value: '94.2%', detail: 'Last 30 days performance' },
    { label: 'Avg. First Response', value: '48m', detail: 'Median triage delay' },
  ];

  // Calculate cumulative angles for donut segments
  let accumulatedAngle = 0;
  const donutSegments = STATUS_METRICS.map((segment) => {
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + (segment.percentage / 100) * 360;
    accumulatedAngle = endAngle;
    return {
      ...segment,
      startAngle,
      endAngle,
      pathD: describeArc(100, 100, 70, startAngle, endAngle)
    };
  });

  return (
    <div className="section-panel" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="section-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p className="section-subtitle">Real-time charts, workload distributions, and SLA metrics for the support queue.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-grid" style={{ marginBottom: 24 }}>
        {reports.map((metric) => (
          <div key={metric.label} className="ticket-card report-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div className="dashboard-stat__label" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{metric.label}</div>
            <div className="dashboard-stat__value" style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0', color: 'var(--text)', background: 'linear-gradient(135deg, var(--text) 30%, var(--blue) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{metric.value}</div>
            <div className="dashboard-stat__hint" style={{ fontSize: 12, color: 'var(--muted)' }}>{metric.detail}</div>
          </div>
        ))}
      </div>

      {/* Visual Charts Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Donut Chart: Tickets by Status */}
        <div className="ticket-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 320 }}>
          <h3 style={{ alignSelf: 'flex-start', margin: '0 0 16px 0', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            Tickets by Status Distribution
          </h3>

          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="successGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="grayGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
              </defs>
              
              {/* Backing Circle (Track) */}
              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="24" />

              {donutSegments.map((seg) => {
                const isHovered = hoveredDonutSegment?.name === seg.name;
                return (
                  <path
                    key={seg.name}
                    d={seg.pathD}
                    fill="none"
                    stroke={seg.gradient}
                    strokeWidth={isHovered ? 28 : 24}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={() => setHoveredDonutSegment(seg)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                  />
                );
              })}
            </svg>

            {/* Inner text overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              {hoveredDonutSegment ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 900, color: hoveredDonutSegment.color }}>
                    {hoveredDonutSegment.count}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {hoveredDonutSegment.name}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>100</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Tickets</div>
                </>
              )}
            </div>
          </div>

          {/* Custom Legend */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 }}>
            {STATUS_METRICS.map((metric) => (
              <div 
                key={metric.name} 
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-light)', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredDonutSegment(metric)}
                onMouseLeave={() => setHoveredDonutSegment(null)}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: metric.color }} />
                <span>{metric.name} ({metric.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Backlog by Priority */}
        <div className="ticket-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 320 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            Backlog Distribution by Priority
          </h3>

          <div style={{ position: 'relative', flex: 1, minHeight: 180, display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
            <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
                <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(15,23,42,0.04)" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(15,23,42,0.04)" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(15,23,42,0.04)" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="159" x2="400" y2="159" stroke="rgba(15,23,42,0.1)" strokeWidth="1.5" />

              {/* Bars */}
              {PRIORITY_METRICS.map((metric, i) => {
                const maxVal = 50;
                const barHeight = (metric.count / maxVal) * 140;
                const barWidth = 46;
                const xPos = 40 + i * 90;
                const yPos = 160 - barHeight;
                const isHovered = hoveredBar?.priority === metric.priority;

                return (
                  <g key={metric.priority}>
                    <rect
                      x={xPos}
                      y={yPos - 1} // Compensate base line
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      fill={metric.gradient}
                      opacity={isHovered ? 1 : 0.85}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 200ms ease'
                      }}
                      onMouseEnter={() => setHoveredBar(metric)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                    {/* Tiny count text on top of the bar */}
                    <text
                      x={xPos + barWidth / 2}
                      y={yPos - 8}
                      textAnchor="middle"
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fill: isHovered ? metric.color : 'var(--muted)',
                        transition: 'fill 200ms ease'
                      }}
                    >
                      {metric.count}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Custom interactive tooltip box */}
            {hoveredBar && (
              <div style={{
                position: 'absolute',
                top: 4,
                right: 4,
                padding: '6px 12px',
                background: 'var(--panel-solid)',
                border: `1.5px solid ${hoveredBar.color}`,
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-sm)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text)',
                animation: 'fadeIn 0.15s ease-out',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <div>Priority: <span style={{ color: hoveredBar.color }}>{hoveredBar.priority}</span></div>
                <div>Tickets: <span>{hoveredBar.count}</span></div>
                <div>SLA Target: <span style={{ color: 'var(--muted)' }}>{hoveredBar.resolutionSla}</span></div>
              </div>
            )}
          </div>

          {/* X Axis Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 32px' }}>
            {PRIORITY_METRICS.map((metric) => (
              <span key={metric.priority} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', width: 70, textAlign: 'center' }}>
                {metric.priority}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Insight Highlight Panel */}
      <div className="ticket-card report-card" style={{ marginBottom: 24 }}>
        <div className="dashboard__recentTop" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Queue Insights & SLA Alert Warnings</div>
            <div className="section-subtitle">Real-time alerts generated from workload trends.</div>
          </div>
          <button type="button" className="btn btnMuted" onClick={() => onFilter?.({ view: 'assigned_queue' })}>
            Review queue
          </button>
        </div>
        <div className="settings-list">
          <div className="settings-item" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>⚠️ Overdue Ticket Backlog Detected</div>
            <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>There are 8 tickets currently breaching active SLAs in the Assigned Queue. Consider executing an escalation macro.</div>
          </div>
          <div className="settings-item" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: 12, paddingTop: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>🔌 Top Incident Category</div>
            <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>VPN Outage has contributed to 22 ticket requests this week. A global KB reference guide was published for client self-service.</div>
          </div>
          <div className="settings-item" style={{ paddingTop: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>👑 Service Performance Rate</div>
            <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>Your customer satisfaction rating is currently evaluated at 94.2% positive client feedback.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
