import React from 'react';

export default function AssetFormFields({
  name,
  setName,
  clientId,
  setClientId,
  deploymentDate,
  setDeploymentDate,
  lastMaintenanceDate,
  setLastMaintenanceDate,
  status,
  setStatus,
  clients = [],
  loadingClients = false,
  isEdit = false
}) {
  return (
    <>
      <div className="modal-form-group">
        <label>Asset Name / Model</label>
        <input
          type="text"
          className="control"
          placeholder={isEdit ? '' : 'e.g. MacBook Pro 14-inch M3 Max'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="modal-form-group">
        <label>Assign to Client Profile</label>
        {loadingClients ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading users...</div>
        ) : (
          <select className="control" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            {!isEdit && <option value="">-- Choose User Account --</option>}
            {clients.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.username} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="modal-form-group">
          <label>Deployment Date</label>
          <input
            type="date"
            className="control"
            value={deploymentDate}
            onChange={(e) => setDeploymentDate(e.target.value)}
          />
        </div>
        <div className="modal-form-group">
          <label>Last Maintenance</label>
          <input
            type="date"
            className="control"
            value={lastMaintenanceDate}
            onChange={(e) => setLastMaintenanceDate(e.target.value)}
          />
        </div>
      </div>

      <div className="modal-form-group">
        <label>Lifecycle Status</label>
        <select className="control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Active">Active</option>
          <option value="In Repair">In Repair</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>
      </div>
    </>
  );
}
