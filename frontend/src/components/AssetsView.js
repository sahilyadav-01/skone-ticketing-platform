import React, { useEffect, useMemo, useState } from 'react';
import { fetchAssets } from '../api';

function normalizeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function matchesQ(asset, q) {
  if (!q) return true;
  const query = q.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    asset.asset_id,
    asset.name,
    asset.client_id,
    asset.deployment_date,
    asset.status,
  ]
    .map(normalizeStr)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function guessStatusBadgeClass(status) {
  const s = normalizeStr(status).toLowerCase();
  if (s.includes('retire')) return 'status-warning';
  if (s.includes('active') || s.includes('in stock') || s.includes('available')) return 'status-success';
  if (s.includes('in stock')) return 'status-success';
  if (s.includes('pending')) return 'status-neutral';
  if (s.includes('inactive') || s.includes('closed')) return 'status-neutral';
  return 'status-neutral';
}

export default function AssetsView() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const rows = await fetchAssets(debouncedQuery);
        if (cancelled) return;
        setAssets(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (cancelled) return;
        setAssets([]);
        setError('Unable to load assets. Please try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const visibleAssets = useMemo(() => {
    const q = query;
    return assets
      .filter((a) => matchesQ(a, q))
      .filter((a) => {
        if (!statusFilter) return true;
        return normalizeStr(a.status).toLowerCase() === normalizeStr(statusFilter).toLowerCase();
      });
  }, [assets, query, statusFilter]);

  const statusOptions = useMemo(() => {
    const set = new Set(assets.map((a) => normalizeStr(a.status)).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const stats = useMemo(() => {
    const total = visibleAssets.length;
    const assigned = visibleAssets.filter((a) => normalizeStr(a.client_id)).length;

    const s = visibleAssets.map((a) => normalizeStr(a.status).toLowerCase());
    const retired = s.filter((x) => x.includes('retire')).length;

    // Best-effort: treat "active/in stock/available" as in-stock.
    const inStock = s.filter((x) => x.includes('in stock') || x.includes('available') || x.includes('active')).length;

    return {
      total,
      assigned,
      inStock,
      retired,
    };
  }, [visibleAssets]);

  return (
    <div className="section-panel">
      <div className="section-header">
        <div>
          <h2>Assets</h2>
          <p className="section-subtitle">Track and manage hardware inventory, software licenses, and deployments.</p>
        </div>
      </div>

      <div className="assets-toolbar">
        <div className="assets-toolbar__actions">
          <button type="button" className="btn btnPrimary" onClick={() => alert('Add Asset (not implemented yet)')}>
            + Add Asset
          </button>
          <button type="button" className="btn btnMuted" onClick={() => alert('Import Assets (not implemented yet)')}>
            Import Assets
          </button>
          <button type="button" className="btn" style={{ borderColor: 'rgba(17,24,39,0.15)', background: 'var(--panel2)' }} onClick={() => alert('Export (not implemented yet)')}>
            Export
          </button>
        </div>

        <div className="assets-toolbar__search">
          <input
            className="control"
            type="search"
            placeholder="Search Asset ID, Name, Serial Number, User..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="ticket-card">
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Asset Overview</div>
        <div className="assets-stats">
          <div className="assets-stat">
            <div className="assets-stat__label">Total Assets</div>
            <div className="assets-stat__value">{stats.total.toLocaleString()}</div>
          </div>
          <div className="assets-stat">
            <div className="assets-stat__label">Assigned</div>
            <div className="assets-stat__value">{stats.assigned.toLocaleString()}</div>
          </div>
          <div className="assets-stat">
            <div className="assets-stat__label">Available</div>
            <div className="assets-stat__value">{stats.inStock.toLocaleString()}</div>
          </div>
          <div className="assets-stat">
            <div className="assets-stat__label">Retired</div>
            <div className="assets-stat__value">{stats.retired.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="ticket-card">
        <div className="assets-filters">
          <div>
            <div className="label">Filters</div>
            <select
              className="control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ appearance: 'none' }}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="assets-filters__meta">
            <div style={{ fontWeight: 900 }}>Results</div>
            <div style={{ color: 'var(--muted)', fontWeight: 700, marginTop: 6 }}>
              {loading ? 'Loading…' : `${visibleAssets.length} assets`}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: 'var(--danger)', fontWeight: 800 }}>{error}</div>
        )}

        <div style={{ marginTop: 14 }} className="ticket-list">
          <table>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Type / Name</th>
                <th>Model</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAssets.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 18, color: 'var(--muted)', fontWeight: 800 }}>
                    No assets found.
                  </td>
                </tr>
              ) : (
                visibleAssets.map((a) => {
                  const statusClass = guessStatusBadgeClass(a.status);
                  return (
                    <tr key={a.asset_id}>
                      <td style={{ fontWeight: 900 }}>{a.asset_id}</td>
                      <td>{a.name}</td>
                      <td style={{ color: 'var(--muted)', fontWeight: 700 }}>
                        {/* API doesn’t provide a separate model field yet */}
                        —
                      </td>
                      <td style={{ color: 'var(--muted)', fontWeight: 800 }}>{a.client_id || 'Warehouse'}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>{a.status || 'Unknown'}</span>
                      </td>
                      <td>
                        <div className="asset-actions">
                          <button type="button" className="btn" style={{ padding: '8px 10px', borderColor: 'rgba(17,24,39,0.12)', background: 'var(--panel2)' }} onClick={() => alert(`View ${a.asset_id} (not implemented)`)}>
                            View
                          </button>
                          <button type="button" className="btn" style={{ padding: '8px 10px', borderColor: 'rgba(37,99,235,0.25)', background: 'rgba(37,99,235,0.08)' }} onClick={() => alert(`Edit ${a.asset_id} (not implemented)`)}>
                            Edit
                          </button>
                          <button type="button" className="btn" style={{ padding: '8px 10px', borderColor: 'rgba(17,24,39,0.12)', background: 'var(--panel2)' }} onClick={() => alert(`Transfer ${a.asset_id} (not implemented)`)}>
                            Transfer
                          </button>
                          <button type="button" className="btn btnDanger" style={{ padding: '8px 10px' }} onClick={() => alert(`Retire ${a.asset_id} (not implemented)`)}>
                            Retire
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

