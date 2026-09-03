import { useMemo, useState, useEffect, useRef } from 'react';
import { fetchAssets, adminFetchUsers } from '../services/api';

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

// Category Icon components helper
const CATEGORY_ICONS = {
  Network: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  ),
  Software: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Hardware: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Access: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Custom: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
};

function TicketForm({ onSubmit, defaultClientId = '', onNavigate, user }) {
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
  const [selectedAsset, setSelectedAsset] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);

  const [techs, setTechs] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);

  // Load available technicians dynamically
  useEffect(() => {
    let mounted = true;
    const fetchTechs = async () => {
      try {
        setLoadingTechs(true);
        const supportTechs = await adminFetchUsers('Support Engineer');
        const adminTechs = await adminFetchUsers('Admin');
        if (mounted) {
          const combined = [...(supportTechs || []), ...(adminTechs || [])];
          const uniqueTechs = Array.from(new Map(combined.map((t) => [t.user_id, t])).values());
          setTechs(uniqueTechs);
        }
      } catch (err) {
        console.error('Failed to load support technicians:', err);
      } finally {
        if (mounted) {
          setLoadingTechs(false);
        }
      }
    };
    fetchTechs();
    return () => {
      mounted = false;
    };
  }, []);

  // Asset search & autoload
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
                setSelectedAsset(data[0]);
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

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setError(null);
    if (cat === 'Custom') {
      setValues((prev) => ({ ...prev, issue_type: customCategory }));
    } else {
      setValues((prev) => ({ ...prev, issue_type: cat }));
    }
  };

  const handleCustomCategoryChange = (e) => {
    const val = e.target.value;
    setCustomCategory(val);
    setValues((prev) => ({ ...prev, issue_type: val }));
    setError(null);
  };

  const handlePrioritySelect = (prio) => {
    setValues((prev) => ({ ...prev, priority: prio }));
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
        setSelectedAsset(selected);
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
    setSelectedAsset(asset);
    setShowAssetMenu(false);
  };

  const handleUnlinkAsset = () => {
    setValues((prev) => ({ ...prev, asset_id: '' }));
    setAssetQuery('');
    setSelectedAsset(null);
    setActiveAssetIndex(-1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (hasErrors) {
      return;
    }

    try {
      setSubmitting(true);
      const { zoho_type, ...rest } = values;
      const result = await onSubmit({
        ...rest,
        client_id: values.client_id,
        asset_id: values.asset_id ? Number(values.asset_id) : null,
      });

      // Success transition
      setCreatedTicket(result);
      setValues({
        ...defaultValues,
        client_id: defaultClientId,
      });
      setSelectedCategory('');
      setCustomCategory('');
      setSelectedAsset(null);
      setAssetQuery('');
    } catch (e) {
      console.error('Ticket creation error:', e);
      setError('Unable to submit ticket. Please try again. ' + (e?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const descLength = values.description ? values.description.length : 0;
  const username = user?.username || 'Client User';

  // Render Success Screen Overlay
  if (createdTicket) {
    return (
      <div className="ticket-success-container">
        <div className="success-checkmark-wrapper">
          <div className="success-checkmark-circle"></div>
          <svg className="success-checkmark-svg" viewBox="0 0 52 52">
            <circle className="checkmark-circle-path" cx="26" cy="26" r="25" />
            <path className="checkmark-check-path" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <h2 className="ticket-success-title">Ticket Transmitted</h2>
        <p className="ticket-success-subtitle">
          Your support request was logged successfully. Technicians have been alerted and will update you shortly.
        </p>

        <div className="success-stub-wrapper">
          <div className="success-stub">
            <div className="success-stub-row">
              <span className="success-stub-label">Ticket Reference</span>
              <span className="success-stub-value ticket-ref">TK-{createdTicket.ticket_id || 'XXXX'}</span>
            </div>
            <div className="success-stub-row">
              <span className="success-stub-label">Subject</span>
              <span className="success-stub-subject" title={createdTicket.subject}>{createdTicket.subject || 'No Subject'}</span>
            </div>

            <div className="success-stub-divider"></div>

            <div className="success-stub-row">
              <span className="success-stub-label">Category</span>
              <span className="success-stub-value">{createdTicket.issue_type || 'General'}</span>
            </div>
            <div className="success-stub-row">
              <span className="success-stub-label">Priority</span>
              <span className="success-stub-value">{createdTicket.priority || 'Low'}</span>
            </div>
            <div className="success-stub-row">
              <span className="success-stub-label">Status</span>
              <span className="success-stub-value" style={{ color: 'var(--success-hover)', fontWeight: 800 }}>
                {createdTicket.status || 'Open'}
              </span>
            </div>
          </div>
        </div>

        <div className="success-actions">
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => setCreatedTicket(null)}
          >
            Create Another Ticket
          </button>
          {onNavigate && (
            <button
              type="button"
              className="btn btnMuted"
              onClick={() => onNavigate('my_tickets')}
            >
              View My Tickets
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="create-ticket-workspace">
      {/* LEFT SIDE: Input Form */}
      <div className="create-ticket-form-side">
        <form id="create-ticket-form" onSubmit={handleSubmit} className="formPanel" style={{ marginBottom: 0 }}>
          <h2>Submit Support Request</h2>

          {/* Category Selector Tiles */}
          <div className="formRow">
            <span className="label">Category</span>
            <div className="category-grid">
              {[
                { name: 'Network', label: 'Network' },
                { name: 'Software', label: 'Software' },
                { name: 'Hardware', label: 'Hardware' },
                { name: 'Access', label: 'Access' },
                { name: 'Custom', label: 'Custom' },
              ].map((cat) => {
                const isSelected = selectedCategory === cat.name;
                const Icon = CATEGORY_ICONS[cat.name];
                return (
                  <button
                    key={cat.name}
                    type="button"
                    className={`category-card ${isSelected ? 'isSelected' : ''}`}
                    onClick={() => handleCategorySelect(cat.name)}
                  >
                    <Icon />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedCategory === 'Custom' && (
              <input
                name="custom_issue_type"
                value={customCategory}
                onChange={handleCustomCategoryChange}
                required
                placeholder="Specify custom category (e.g. Printer, Email, VoIP)"
                className="control"
                style={{ animation: 'slideDownFade 200ms ease' }}
              />
            )}
            {validation.issue_type && !selectedCategory && (
              <div style={{ color: 'var(--danger)', marginTop: 6, fontSize: 13, fontWeight: 700 }}>
                {validation.issue_type}
              </div>
            )}
          </div>

          {/* Priority Pill Selector */}
          <div className="formRow">
            <span className="label">Priority Level</span>
            <div className="priority-selector-group">
              {['Low', 'Medium', 'High', 'Critical'].map((prio) => {
                const isActive = values.priority === prio;
                return (
                  <button
                    key={prio}
                    type="button"
                    className={`priority-pill priority-${prio.toLowerCase()} ${isActive ? 'isActive' : ''}`}
                    onClick={() => handlePrioritySelect(prio)}
                  >
                    <span className="dot"></span>
                    <span>{prio}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Field */}
          <div className="formRow">
            <label className="label">
              Subject
              <input
                name="subject"
                value={values.subject || ''}
                onChange={handleChange}
                placeholder="Enter a brief summary of the issue"
                className="control"
                style={{ marginTop: 6 }}
                required
              />
            </label>
          </div>

          {/* Asset Selection Wrapper */}
          <div className="formRow asset-selector-wrapper" style={{ position: 'relative' }}>
            <span className="label">Asset Association</span>
            {!values.asset_id ? (
              <>
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
                  placeholder="Type to search and link assets (e.g. laptop, printer, monitor)"
                  className="control"
                  style={{ marginTop: 6 }}
                  autoComplete="off"
                />
                {showAssetMenu && assets.length > 0 && (
                  <div className="asset-suggestions-menu">
                    {assets.map((a, idx) => (
                      <button
                        type="button"
                        key={a.asset_id}
                        className={`asset-suggestion-item ${idx === activeAssetIndex ? 'isActive' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectAsset(a);
                        }}
                        onMouseEnter={() => setActiveAssetIndex(idx)}
                      >
                        <div className="asset-suggestion-item__title">{a.name}</div>
                        <div className="asset-suggestion-item__meta">
                          {a.deployment_date ? `Deployed: ${a.deployment_date}` : ''} {a.status ? `· Status: ${a.status}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              selectedAsset && (
                <div style={{ display: 'block' }}>
                  <div className="asset-token">
                    <div className="asset-token__text">
                      <span className="asset-token__dot"></span>
                      Linked: {selectedAsset.name}
                    </div>
                    <button
                      type="button"
                      className="asset-token__close"
                      onClick={handleUnlinkAsset}
                      title="Unlink asset"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Error Code & Assigned Tech (Row) */}
          <div className="form-row-flex" style={{ marginBottom: 16 }}>
            <label className="label" style={{ flex: 1 }}>
              Error Code (Optional)
              <input
                name="error_code"
                value={values.error_code || ''}
                onChange={handleChange}
                placeholder="e.g. ERR_CONNECTION_RESET"
                className="control"
                style={{ marginTop: 6 }}
              />
            </label>

            <label className="label" style={{ flex: 1 }}>
              Assigned Tech (Optional)
              <select
                name="assigned_tech"
                value={values.assigned_tech || ''}
                onChange={handleChange}
                className="control"
                style={{ marginTop: 6 }}
              >
                <option value="">-- Unassigned --</option>
                {loadingTechs ? (
                  <option value="" disabled>Loading technicians...</option>
                ) : (
                  techs.map((tech) => (
                    <option key={tech.user_id} value={tech.username}>
                      {tech.username} ({tech.role})
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          {/* Description Textarea */}
          <div className="formRow">
            <label className="label">
              Detailed Description
              <div className="textarea-wrapper" style={{ marginTop: 6 }}>
                <textarea
                  name="description"
                  value={values.description}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="control textarea"
                  placeholder="Describe the problem, steps to reproduce, or support requested..."
                />
                <span className="word-counter">{descLength} characters</span>
              </div>
            </label>
            {validation.description && (
              <div style={{ color: 'var(--danger)', marginTop: 6, fontSize: 13, fontWeight: 700 }}>
                {validation.description}
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 700 }} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={submitting || hasErrors}
            style={{ width: '100%', marginTop: 8 }}
          >
            {submitting ? 'Transmitting Ticket Blueprint...' : 'Submit Support Request'}
          </button>
        </form>
      </div>

      {/* RIGHT SIDE: Interactive Holographic Ticket Live Preview */}
      <div className="create-ticket-preview-side">
        <div className="ticket-preview-container">
          <span className="ticket-preview-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Live Ticket Blueprint
          </span>

          <div className={`ticket-preview-card priority-glow-${values.priority.toLowerCase()}`}>
            <div className="ticket-preview-meta">
              <span className="ticket-preview-id">TK-XXXX</span>
              <span className="ticket-preview-badge-status">Drafting</span>
            </div>

            <h3 className={`ticket-preview-subject ${!values.subject ? 'is-placeholder' : ''}`}>
              {values.subject || 'Untitled Ticket Summary'}
            </h3>

            <div className={`ticket-preview-desc ${!values.description ? 'is-placeholder' : ''}`}>
              {values.description || 'Describe the technical issues in the form to populate this workspace...'}
            </div>

            <div className="ticket-preview-tags">
              <span className="ticket-preview-tag" style={{ borderLeft: '3px solid var(--priority-color, var(--blue))' }}>
                Priority: {values.priority}
              </span>
              <span className="ticket-preview-tag">
                Category: {values.issue_type || 'Unspecified'}
              </span>
              {selectedAsset && (
                <span className="ticket-preview-tag">
                  Asset: {selectedAsset.name}
                </span>
              )}
              {values.error_code && (
                <span className="ticket-preview-tag">
                  Code: {values.error_code}
                </span>
              )}
            </div>

            <div className="ticket-preview-footer">
              <div>
                CLIENT: <span style={{ color: 'var(--text)', fontWeight: 800 }}>{username}</span>
              </div>
              <div className="ticket-preview-barcode" title="Blueprint System Active">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketForm;
