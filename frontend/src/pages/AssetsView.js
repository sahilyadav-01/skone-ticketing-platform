import React, { useEffect, useMemo, useState } from 'react';
import { fetchAssets, createAsset, updateAsset, deleteAsset, adminFetchUsers } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import AssetFormFields from '../components/AssetFormFields';

function normalizeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default function AssetsView({ currentUser }) {
  // Database States
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search & Filtering
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all' | 'assigned' | 'warehouse'

  // Users lookup for assignment dropdown
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Modal Control States
  // activeModal: null | 'add' | 'edit' | 'transfer' | 'retire' | 'import' | 'view'
  const [activeModal, setActiveModal] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDeploymentDate, setFormDeploymentDate] = useState('');
  const [formLastMaintenanceDate, setFormLastMaintenanceDate] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  
  // Import Text Area
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const isAdmin = currentUser?.role === 'Admin';
  const isSupport = currentUser?.role === 'Support Engineer' || isAdmin;

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load assets from database
  const loadAssets = async () => {
    try {
      setLoading(true);
      setError('');
      // fetchAssets returns matches filtered by ilike name
      const rows = await fetchAssets(debouncedQuery);
      setAssets(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setAssets([]);
      setError('Unable to load assets. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [debouncedQuery]);

  // Load clients list for select inputs
  useEffect(() => {
    if (!isSupport) return;
    async function loadClients() {
      try {
        setLoadingClients(true);
        const users = await adminFetchUsers('Client');
        setClients(users || []);
      } catch (err) {
        console.error('Failed to load clients list:', err);
      } finally {
        setLoadingClients(false);
      }
    }
    loadClients();
  }, [isSupport]);

  // Handle temporary success message banner
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Open modals and set form defaults
  const openModal = (type, asset = null) => {
    setSelectedAsset(asset);
    setActiveModal(type);
    setError('');
    setImportError('');
    
    if (asset) {
      setFormName(asset.name || '');
      setFormClientId(asset.client_id || '');
      setFormDeploymentDate(asset.deployment_date || '');
      setFormLastMaintenanceDate(asset.last_maintenance_date || '');
      setFormStatus(asset.status || 'Active');
    } else {
      setFormName('');
      // Default to first client if available
      setFormClientId(clients[0]?.user_id || '');
      setFormDeploymentDate(new Date().toISOString().split('T')[0]);
      setFormLastMaintenanceDate('');
      setFormStatus('Active');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedAsset(null);
  };

  // Unified asset mutation runner (DRY implementation)
  const runAssetAction = async (actionFn, successMsg, errorMsgDefault) => {
    try {
      setSaving(true);
      setError('');
      await actionFn();
      triggerSuccess(successMsg);
      closeModal();
      loadAssets();
    } catch (err) {
      setError(err.message || errorMsgDefault);
    } finally {
      setSaving(false);
    }
  };

  // Asset CRUD operations
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formClientId) {
      setError('Please fill in Name and select a Client.');
      return;
    }
    await runAssetAction(
      () => createAsset({
        name: formName,
        client_id: formClientId,
        deployment_date: formDeploymentDate || null,
        last_maintenance_date: formLastMaintenanceDate || null,
        status: formStatus
      }),
      `Asset "${formName}" created successfully!`,
      'Failed to create asset. Verify permissions.'
    );
  };

  const handleEditAsset = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formClientId) {
      setError('Name and Client cannot be empty.');
      return;
    }
    await runAssetAction(
      () => updateAsset(selectedAsset.asset_id, {
        name: formName,
        client_id: formClientId,
        deployment_date: formDeploymentDate || null,
        last_maintenance_date: formLastMaintenanceDate || null,
        status: formStatus
      }),
      `Asset "${formName}" updated successfully!`,
      'Failed to update asset.'
    );
  };

  const handleTransferAsset = async (e) => {
    e.preventDefault();
    if (!formClientId) {
      setError('Please select a client to transfer ownership.');
      return;
    }
    const targetUser = clients.find(c => c.user_id === formClientId);
    await runAssetAction(
      () => updateAsset(selectedAsset.asset_id, {
        name: selectedAsset.name,
        client_id: formClientId,
        deployment_date: selectedAsset.deployment_date,
        last_maintenance_date: selectedAsset.last_maintenance_date,
        status: selectedAsset.status
      }),
      `Asset transferred to ${targetUser?.username || 'Client'} successfully!`,
      'Failed to transfer asset.'
    );
  };

  const handleRetireAsset = async () => {
    await runAssetAction(
      () => updateAsset(selectedAsset.asset_id, {
        name: selectedAsset.name,
        client_id: selectedAsset.client_id,
        deployment_date: selectedAsset.deployment_date,
        last_maintenance_date: selectedAsset.last_maintenance_date,
        status: 'Decommissioned'
      }),
      `Asset "${selectedAsset.name}" decommissioned successfully.`,
      'Failed to decommission asset.'
    );
  };

  const handleDeleteAssetPermanently = async () => {
    if (!window.confirm('WARNING: This will permanently delete this asset record. Proceed?')) return;
    await runAssetAction(
      () => deleteAsset(selectedAsset.asset_id),
      'Asset record permanently deleted.',
      'Failed to delete asset.'
    );
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (visibleAssets.length === 0) {
      alert('No records available to export.');
      return;
    }
    const headers = ['Asset ID', 'Name', 'Assigned Client ID', 'Client Username', 'Status', 'Deployment Date', 'Last Maintenance Date'];
    const rows = visibleAssets.map(a => [
      a.asset_id,
      `"${a.name.replace(/"/g, '""')}"`,
      a.client_id,
      a.client?.username || 'Warehouse',
      a.status,
      a.deployment_date || '',
      a.last_maintenance_date || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skone_assets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch JSON/CSV Import utility
  const handleImportAssets = async (e) => {
    e.preventDefault();
    if (!importText.trim()) {
      setImportError('Please provide data in the input box.');
      return;
    }

    try {
      setSaving(true);
      setImportError('');
      let itemsToInsert = [];

      // Attempt parsing as JSON
      try {
        const parsed = JSON.parse(importText);
        if (Array.isArray(parsed)) {
          itemsToInsert = parsed;
        } else {
          itemsToInsert = [parsed];
        }
      } catch (jsonErr) {
        // Fallback to parsing as CSV
        const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          // If first line contains headers, skip it
          const firstLine = lines[0].toLowerCase();
          const startIdx = (firstLine.includes('name') || firstLine.includes('client')) ? 1 : 0;
          
          for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim());
            if (parts.length >= 2) {
              itemsToInsert.push({
                name: parts[0],
                client_username: parts[1],
                status: parts[2] || 'Active',
                deployment_date: parts[3] || null,
                last_maintenance_date: parts[4] || null
              });
            }
          }
        }
      }

      if (itemsToInsert.length === 0) {
        throw new Error('No valid asset rows found to import.');
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of itemsToInsert) {
        // Resolve client username to UUID client_id if client_id is not directly given
        let clientId = item.client_id;
        if (!clientId && item.client_username) {
          const match = clients.find(c => c.username.toLowerCase() === item.client_username.toLowerCase());
          if (match) {
            clientId = match.user_id;
          }
        }
        
        // Fallback to current user if client resolution fails
        if (!clientId) {
          clientId = currentUser?.user_id;
        }

        try {
          await createAsset({
            name: item.name,
            client_id: clientId,
            deployment_date: item.deployment_date || null,
            last_maintenance_date: item.last_maintenance_date || null,
            status: item.status || 'Active'
          });
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      triggerSuccess(`Successfully imported ${successCount} assets.${failCount > 0 ? ` Failed on ${failCount} assets.` : ''}`);
      closeModal();
      loadAssets();
    } catch (err) {
      setImportError(err.message || 'Failed to parse or import data. Ensure valid JSON/CSV.');
    } finally {
      setSaving(false);
    }
  };

  // Client-side filtering logic
  const visibleAssets = useMemo(() => {
    return assets.filter((a) => {
      // 1. Search Query
      const needle = query.trim().toLowerCase();
      if (needle) {
        const haystack = [
          a.asset_id,
          a.name,
          a.client?.username,
          a.status,
        ]
          .map(normalizeStr)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      // 2. Status Dropdown Filter
      if (statusFilter && normalizeStr(a.status).toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Stats Card Filter (assignmentFilter)
      if (assignmentFilter === 'assigned' && !a.client_id) return false;
      if (assignmentFilter === 'warehouse' && a.client_id === currentUser?.user_id) return false; // treating system warehouse
      
      return true;
    });
  }, [assets, query, statusFilter, assignmentFilter, currentUser]);

  // Aggregate stats metrics
  const stats = useMemo(() => {
    const total = assets.length;
    // Assigned assets (non-null clients)
    const assigned = assets.filter((a) => a.client_id).length;
    // Available: Active status
    const available = assets.filter((a) => normalizeStr(a.status).toLowerCase() === 'active').length;
    // Retired: Decommissioned status
    const retired = assets.filter((a) => normalizeStr(a.status).toLowerCase() === 'decommissioned').length;

    return { total, assigned, available, retired };
  }, [assets]);

  return (
    <div className="section-panel" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Page Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ background: 'linear-gradient(135deg, var(--blue) 0%, var(--teal) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', fontWeight: 900 }}>
            Hardware & Software Assets
          </h2>
          <p className="section-subtitle">Track and configure leased devices, maintenance schedules, and department provisioning.</p>
        </div>
        
        {/* Success Alert Banner */}
        {successMessage && (
          <div className="triage-saving-indicator" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <span className="triage-saving-success">✓ {successMessage}</span>
          </div>
        )}
      </div>

      {/* Toolbar & Actions Bar */}
      <div className="assets-toolbar" style={{ background: 'var(--panel)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)', marginTop: 12 }}>
        <div className="assets-toolbar__actions">
          {isAdmin ? (
            <>
              <button type="button" className="btn btnPrimary" onClick={() => openModal('add')}>
                ⚡ Add Asset
              </button>
              <button type="button" className="btn btnMuted" onClick={() => openModal('import')}>
                📦 Batch Import
              </button>
            </>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)', padding: '8px 12px', background: 'rgba(15,23,42,0.03)', borderRadius: 'var(--radius-sm)' }}>
              🔒 Read-Only Operations (Admins Only)
            </div>
          )}
          <button type="button" className="btn" style={{ borderColor: 'var(--border-dark)', background: 'var(--panel2)' }} onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>

        <div className="assets-toolbar__search">
          <input
            className="control"
            type="search"
            placeholder="Search assets by ID, name, or assignee..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Interactive KPI Dashboard Ribbon */}
      <div className="assets-stats" style={{ marginTop: 20 }}>
        <div 
          className={`assets-kpi-card total ${assignmentFilter === 'all' ? 'active-filter' : ''}`} 
          style={{ cursor: 'pointer', borderLeft: assignmentFilter === 'all' ? '4px solid var(--blue)' : 'none' }}
          onClick={() => { setAssignmentFilter('all'); setStatusFilter(''); }}
        >
          <div className="assets-stat__label">Total Inventory</div>
          <div className="assets-stat__value">{stats.total}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Full organization assets</div>
        </div>

        <div 
          className={`assets-kpi-card assigned ${assignmentFilter === 'assigned' ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', borderLeft: assignmentFilter === 'assigned' ? '4px solid var(--purple)' : 'none' }}
          onClick={() => { setAssignmentFilter('assigned'); setStatusFilter(''); }}
        >
          <div className="assets-stat__label">Provisioned</div>
          <div className="assets-stat__value" style={{ background: 'linear-gradient(135deg, var(--purple) 0%, var(--blue) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.assigned}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Leased to user profiles</div>
        </div>

        <div 
          className={`assets-kpi-card available ${statusFilter === 'active' ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', borderLeft: statusFilter === 'active' ? '4px solid var(--success)' : 'none' }}
          onClick={() => { setAssignmentFilter('all'); setStatusFilter('active'); }}
        >
          <div className="assets-stat__label">Active Status</div>
          <div className="assets-stat__value" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.available}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Deployed & operational</div>
        </div>

        <div 
          className={`assets-kpi-card retired ${statusFilter === 'decommissioned' ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', borderLeft: statusFilter === 'decommissioned' ? '4px solid var(--danger)' : 'none' }}
          onClick={() => { setAssignmentFilter('all'); setStatusFilter('decommissioned'); }}
        >
          <div className="assets-stat__label">Decommissioned</div>
          <div className="assets-stat__value" style={{ background: 'linear-gradient(135deg, var(--danger) 0%, #f87171 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.retired}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Retired hardware records</div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="ticket-card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-dark)', background: 'rgba(15,23,42,0.01)' }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: '15px' }}>Asset Register</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              {loading ? 'Refreshing...' : `Showing ${visibleAssets.length} results`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, minWidth: 130, height: 32 }}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="In Repair">In Repair</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', fontWeight: 700, fontSize: 13, borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="assets-table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Asset ID</th>
                <th style={{ width: '25%' }}>Asset Description</th>
                <th style={{ width: '20%' }}>Leased To User</th>
                <th style={{ width: '15%' }}>Deployment Date</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAssets.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🗃️</div>
                    <strong style={{ display: 'block', fontSize: 14 }}>No assets found matching filters.</strong>
                    <span style={{ fontSize: 12 }}>Try adjusting your search terms or filters above.</span>
                  </td>
                </tr>
              ) : (
                visibleAssets.map((a) => (
                  <tr key={a.asset_id}>
                    <td style={{ fontWeight: 900, color: 'var(--blue)' }}>AST-{a.asset_id}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>IT Hardware asset</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>👤</span>
                        <div>
                          <div style={{ fontWeight: 700 }}>{a.client?.username || 'System warehouse'}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{a.client?.email || 'unassigned'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{a.deployment_date ? new Date(a.deployment_date).toLocaleDateString() : '—'}</td>
                    <td>
                      <StatusBadge status={a.status || 'Active'} type="asset" />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn" style={{ padding: '6px 10px', fontSize: 12, border: 'none', background: 'rgba(15,23,42,0.04)' }} onClick={() => openModal('view', a)}>
                          View
                        </button>
                        {isAdmin && (
                          <>
                            <button type="button" className="btn" style={{ padding: '6px 10px', fontSize: 12, border: '1px solid rgba(37,99,235,0.15)', background: 'rgba(37,99,235,0.03)', color: 'var(--blue)' }} onClick={() => openModal('edit', a)}>
                              Edit
                            </button>
                            <button type="button" className="btn" style={{ padding: '6px 10px', fontSize: 12, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)', color: 'var(--danger)' }} onClick={() => openModal('retire', a)}>
                              Retire
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Modals System */}

      {/* 1. Add Asset Modal */}
      <Modal isOpen={activeModal === 'add'} onClose={closeModal} title="Add New Asset">
        <form onSubmit={handleAddAsset}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 700 }}>{error}</div>}
          <AssetFormFields
            name={formName}
            setName={setFormName}
            clientId={formClientId}
            setClientId={setFormClientId}
            deploymentDate={formDeploymentDate}
            setDeploymentDate={setFormDeploymentDate}
            lastMaintenanceDate={formLastMaintenanceDate}
            setLastMaintenanceDate={setFormLastMaintenanceDate}
            status={formStatus}
            setStatus={setFormStatus}
            clients={clients}
            loadingClients={loadingClients}
            isEdit={false}
          />

          <div className="modal-form-actions">
            <button type="button" className="btn" onClick={closeModal} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Asset Modal */}
      <Modal isOpen={activeModal === 'edit'} onClose={closeModal} title="Edit Asset Properties">
        <form onSubmit={handleEditAsset}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 700 }}>{error}</div>}
          <div className="modal-form-group">
            <label>Asset ID: AST-{selectedAsset?.asset_id}</label>
          </div>
          
          <AssetFormFields
            name={formName}
            setName={setFormName}
            clientId={formClientId}
            setClientId={setFormClientId}
            deploymentDate={formDeploymentDate}
            setDeploymentDate={setFormDeploymentDate}
            lastMaintenanceDate={formLastMaintenanceDate}
            setLastMaintenanceDate={setFormLastMaintenanceDate}
            status={formStatus}
            setStatus={setFormStatus}
            clients={clients}
            loadingClients={loadingClients}
            isEdit={true}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button type="button" className="btn btnDanger" style={{ padding: '12px 16px' }} onClick={handleDeleteAssetPermanently} disabled={saving}>
              Delete Record
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn" onClick={closeModal} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btnPrimary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 3. View Asset Modal */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title="Asset Specifications">
        {selectedAsset && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--blue)' }}>Asset Registration: AST-{selectedAsset.asset_id}</span>
              <StatusBadge status={selectedAsset.status} type="asset" />
            </div>

            <div className="formPanel" style={{ background: 'var(--panel2)', border: '1px solid var(--border-dark)', padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Asset Name</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{selectedAsset.name}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Leaseholder</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👤</span>
                    <div>
                      <div>{selectedAsset.client?.username || 'System warehouse'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{selectedAsset.client?.email || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Deployment Date</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {selectedAsset.deployment_date ? new Date(selectedAsset.deployment_date).toLocaleDateString() : 'Unspecified'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Last Maintenance</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {selectedAsset.last_maintenance_date ? new Date(selectedAsset.last_maintenance_date).toLocaleDateString() : 'Unspecified'}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Database Created Date</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                    {selectedAsset.created_at ? new Date(selectedAsset.created_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {isAdmin && (
                <button type="button" className="btn btnPrimary" onClick={() => { closeModal(); openModal('edit', selectedAsset); }}>
                  Modify Asset Properties
                </button>
              )}
              <button type="button" className="btn" onClick={closeModal}>Close Details</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. Retire/Decommission Confirmation Modal */}
      <Modal isOpen={activeModal === 'retire'} onClose={closeModal} title="Confirm Decommissioning">
        {selectedAsset && (
          <div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-light)' }}>
              Are you sure you want to decommission the asset <strong>"{selectedAsset.name}"</strong> (AST-{selectedAsset.asset_id})?
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              This will update its lifecycle status to <strong>Decommissioned</strong>. The asset lease records will be kept for auditing.
            </p>
            {error && <div style={{ color: 'var(--danger)', marginTop: 10, fontWeight: 700 }}>{error}</div>}
            
            <div className="modal-form-actions">
              <button type="button" className="btn" onClick={closeModal} disabled={saving}>Cancel</button>
              <button type="button" className="btn btnDanger" onClick={handleRetireAsset} disabled={saving}>
                {saving ? 'Decommissioning...' : 'Decommission Asset'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. Batch Import Modal */}
      <Modal isOpen={activeModal === 'import'} onClose={closeModal} title="Batch Import Assets">
        <form onSubmit={handleImportAssets}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Paste a list of asset data in JSON format below. Make sure to specify the asset name and target client username.
          </p>
          
          <div className="modal-form-group">
            <label>JSON Data Array</label>
            <textarea
              className="control textarea"
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 11.5 }}
              placeholder={JSON.stringify([
                { name: "Dell Latitude 5440", client_username: "john_doe", status: "Active", deployment_date: "2026-05-01" },
                { name: "LG UltraGear 27", client_username: "jane_smith", status: "In Repair", deployment_date: "2026-06-12" }
              ], null, 2)}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              required
            />
          </div>

          {importError && (
            <div style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              ⚠️ {importError}
            </div>
          )}

          <div className="modal-form-actions">
            <button type="button" className="btn" onClick={closeModal} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? 'Processing...' : 'Run Batch Import'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
