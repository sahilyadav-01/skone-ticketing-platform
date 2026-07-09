import React, { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  requirePriority: true,
  enableVendorTracking: false,
  allowAssetTagging: true,
  slaCritical: 2,
  slaHigh: 8,
  slaMedium: 24,
  slaLow: 72,
  mfaEnforcement: false,
  sessionTimeout: 12
};

function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('skone_system_settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNumberChange = (key, val) => {
    const parsed = parseInt(val, 10);
    setSettings((prev) => ({
      ...prev,
      [key]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('skone_system_settings', JSON.stringify(settings));
      triggerToast('✓ Settings updated successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      triggerToast('❌ Error: Failed to save changes.');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all values to factory defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      try {
        localStorage.setItem('skone_system_settings', JSON.stringify(DEFAULT_SETTINGS));
        triggerToast('✓ Settings reset to default values.');
      } catch (err) {
        console.error('Failed to reset settings:', err);
      }
    }
  };

  return (
    <div className="section-panel" style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative' }}>
      
      {/* Toast Notification Container */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1.5px solid var(--border)',
          borderColor: toastMessage.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
          boxShadow: 'var(--shadow-lg), 0 10px 25px rgba(15,23,42,0.1)',
          borderRadius: 'var(--radius)',
          zIndex: 9999,
          color: 'var(--text)',
          fontWeight: 800,
          fontSize: 13.5,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {toastMessage}
        </div>
      )}

      <div className="section-header">
        <div>
          <h2>Settings</h2>
          <p className="section-subtitle">Manage system rules, configure SLA priority targets, and define ticket lifecycle policies.</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 10 }}>
        
        {/* Row 1: System Policies & SLA Config */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          
          {/* Card 1: Ticketing & Workflow Policies */}
          <div className="ticket-card" style={{ background: 'var(--panel)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              Workflow Policies
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Toggle 1: Require Priority */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Require ticket priority</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Clients must supply an urgency level when submitting.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.requirePriority}
                    onChange={() => handleToggle('requirePriority')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 2: Enable Vendor Tracking */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Enable vendor tracking</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Unlock status tracking for tasks escalated to vendors.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.enableVendorTracking}
                    onChange={() => handleToggle('enableVendorTracking')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 3: Allow Asset Tagging */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Allow client asset tagging</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Let client users reference leased inventory in new tickets.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.allowAssetTagging}
                    onChange={() => handleToggle('allowAssetTagging')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 4: MFA Enforcement */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Enforce MFA for Engineers</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Require Microsoft Authenticator sign-ins for support staff.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.mfaEnforcement}
                    onChange={() => handleToggle('mfaEnforcement')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

            </div>
          </div>

          {/* Card 2: SLA Response Targets (Hours) */}
          <div className="ticket-card" style={{ background: 'var(--panel)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              SLA Priority Resolution Limits (Hours)
            </h3>
            <p style={{ margin: '-10px 0 16px 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
              Set the standard target duration (in hours) within which tickets of each priority must be resolved to meet SLAs.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 100, fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>🚨 Critical:</span>
                <input
                  type="number"
                  className="control"
                  value={settings.slaCritical}
                  onChange={(e) => handleNumberChange('slaCritical', e.target.value)}
                  min="1"
                  style={{ width: 100, padding: '8px 12px', fontSize: 13 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>hours</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 100, fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>⚠️ High:</span>
                <input
                  type="number"
                  className="control"
                  value={settings.slaHigh}
                  onChange={(e) => handleNumberChange('slaHigh', e.target.value)}
                  min="1"
                  style={{ width: 100, padding: '8px 12px', fontSize: 13 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>hours</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 100, fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>ℹ️ Medium:</span>
                <input
                  type="number"
                  className="control"
                  value={settings.slaMedium}
                  onChange={(e) => handleNumberChange('slaMedium', e.target.value)}
                  min="1"
                  style={{ width: 100, padding: '8px 12px', fontSize: 13 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>hours</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 100, fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>💤 Low:</span>
                <input
                  type="number"
                  className="control"
                  value={settings.slaLow}
                  onChange={(e) => handleNumberChange('slaLow', e.target.value)}
                  min="1"
                  style={{ width: 100, padding: '8px 12px', fontSize: 13 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>hours</span>
              </div>

            </div>
          </div>
        </div>

        {/* Row 2: Security & Global Admin rules */}
        <div className="ticket-card" style={{ background: 'var(--panel)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            Security & Authentication Policy
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Portal inactive session timeout</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Duration of inactivity (in hours) before system forces users to sign out.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <select
                className="control"
                value={settings.sessionTimeout}
                onChange={(e) => handleNumberChange('sessionTimeout', e.target.value)}
                style={{ width: 120, padding: '8px 12px', fontSize: 13, cursor: 'pointer', height: 38 }}
              >
                <option value={1}>1 hour</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
          <button
            type="button"
            className="btn btnMuted"
            onClick={handleResetDefaults}
            style={{ padding: '12px 24px' }}
          >
            Reset Defaults
          </button>
          <button
            type="submit"
            className="btn btnPrimary"
            style={{ padding: '12px 28px' }}
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Styled Switches CSS */}
      <style>{`
        /* The switch - the box around the slider */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        /* Hide default HTML checkbox */
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        /* The slider */
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.08);
          transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--border-dark);
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        input:checked + .slider {
          background-color: var(--blue);
          border-color: rgba(37,99,235,0.2);
        }

        input:focus + .slider {
          box-shadow: var(--ring);
        }

        input:checked + .slider:before {
          transform: translateX(20px);
        }

        /* Rounded sliders */
        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Settings;
