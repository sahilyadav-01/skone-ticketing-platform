import { useMemo, useState, useEffect, useRef } from 'react';
import { fetchAssets } from '../api';

const defaultValues = {
  client_id: '',
  asset_id: '',
  issue_type: '',
  priority: 'Low',
  subject: '',
  subcategory: '',
  error_code: '',
  assigned_tech: '',
  description: '',
};

function TicketForm({ onSubmit, defaultClientId = '' }) {
  const assetInputRef = useRef(null);
  const [values, setValues] = useState({
    ...defaultValues,
    client_id: defaultClientId,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetQuery, setAssetQuery] = useState('');
  const [activeAssetIndex, setActiveAssetIndex] = useState(-1);
  const [showAssetMenu, setShowAssetMenu] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      const load = async () => {
        try {
          const data = await fetchAssets(assetQuery);
          if (mounted) {
            setAssets(data);
            if (defaultClientId && (!values.asset_id || values.asset_id === '')) {
              if (Array.isArray(data) && data.length > 0) {
                setValues((prev) => ({ ...prev, asset_id: String(data[0].asset_id) }));
                setAssetQuery(data[0].name);
                setActiveAssetIndex(0);

              }
            }
          }
        } catch (e) {
          if (mounted) setAssets([]);
        }
      };
      load();
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [assetQuery, defaultClientId, values.asset_id]);


  const validation = useMemo(() => {
    const errs = {};
    if (!values.issue_type) errs.issue_type = 'Category is required.';
    if (!values.description) errs.description = 'Description is required.';
    return errs;
  }, [values]);

  const hasErrors = Object.keys(validation).length > 0;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleAssetKeyDown = (event) => {
    if (!showAssetMenu || !assets.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveAssetIndex((prev) => Math.min(prev + 1, assets.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveAssetIndex((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeAssetIndex >= 0 && assets[activeAssetIndex]) {
        const selected = assets[activeAssetIndex];
        setValues((prev) => ({ ...prev, asset_id: String(selected.asset_id) }));
        setAssetQuery(selected.name);
        setShowAssetMenu(false);
      }
    }
    if (event.key === 'Escape') {
      setShowAssetMenu(false);
    }
  };

  const handleSelectAsset = (asset) => {
    setValues((prev) => ({ ...prev, asset_id: String(asset.asset_id) }));
    setAssetQuery(asset.name);
    setShowAssetMenu(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (hasErrors) {
      // Let browser required fields be silent; show our inline message.
      return;
    }

    try {
      setSubmitting(true);
      const { zoho_type, ...rest } = values;
      await onSubmit({
        ...rest,
        client_id: Number(values.client_id),
        asset_id: values.asset_id ? Number(values.asset_id) : null,
      });
      setValues(defaultValues);
    } catch (e) {
      setError('Unable to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id="create-ticket-form"
      onSubmit={handleSubmit}
      style={{ marginBottom: 24, background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}
    >
      <h2>New Ticket</h2>

      <label style={{ display: 'block' }}>
        Category
        <input
          name="issue_type"
          value={values.issue_type}
          onChange={handleChange}
          required
          placeholder="e.g. Network, Printer, Application"
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 6 }}
        />
      </label>
      {validation.issue_type && <div style={{ color: '#b91c1c', marginTop: -2, marginBottom: 10, fontSize: 13 }}>{validation.issue_type}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1 }}>
          Priority
          <select name="priority" value={values.priority || 'Low'} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </label>

        <label style={{ flex: 2 }}>
          Subject
          <input name="subject" value={values.subject || ''} onChange={handleChange} placeholder="Short summary" style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </label>
      </div>

      <label style={{ display: 'block', marginTop: 10, position: 'relative' }}>
        Asset
        <input
          ref={assetInputRef}
          value={assetQuery}
          onFocus={() => setShowAssetMenu(true)}
          onChange={(e) => {
            setAssetQuery(e.target.value);
            setShowAssetMenu(true);
            setActiveAssetIndex(-1);
          }}
          onKeyDown={handleAssetKeyDown}
          placeholder="Search assets (type laptop, printer, monitor)"
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 6 }}
          autoComplete="off"
        />
        {showAssetMenu && assets.length > 0 && (
          <div
            style={{
              position: 'absolute',
              width: '100%',
              background: '#fff',
              border: '1px solid rgba(17,24,39,0.12)',
              borderRadius: 10,
              boxShadow: '0 10px 24px rgba(17,24,39,0.08)',
              zIndex: 10,
              maxHeight: 240,
              overflowY: 'auto',
              marginTop: 4,
            }}
          >
            {assets.map((a, idx) => (
              <button
                type="button"
                key={a.asset_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectAsset(a);
                }}
                onMouseEnter={() => setActiveAssetIndex(idx)}
                style={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: idx === activeAssetIndex ? '#eef2ff' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {a.deployment_date ? `Deployed: ${a.deployment_date}` : ''} {a.status ? `· ${a.status}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </label>


      <label style={{ display: 'block' }}>
        Error Code
        <input
          name="error_code"
          value={values.error_code}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
        />
      </label>

      <label style={{ display: 'block' }}>
        Assigned Tech
        <input
          name="assigned_tech"
          value={values.assigned_tech}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
        />
      </label>

      <label style={{ display: 'block' }}>
        Description
        <textarea
            name="description"
            value={values.description}
            onChange={handleChange}
            required
            rows="5"
            style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 6 }}
          />
      </label>
      {validation.description && <div style={{ color: '#b91c1c', marginTop: -2, marginBottom: 10, fontSize: 13 }}>{validation.description}</div>}

      {error && (
        <div style={{ color: '#b91c1c', marginBottom: 12 }} role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="primary-btn" disabled={submitting || hasErrors}>
        {submitting ? 'Submitting...' : 'Submit Ticket'}
      </button>
    </form>
  );
}

export default TicketForm;

