import { useMemo, useState } from 'react';

const defaultValues = {
  client_id: '',
  asset_id: '',
  issue_type: '',
  error_code: '',
  assigned_tech: '',
  description: '',
};

function TicketForm({ onSubmit, defaultClientId = '' }) {
  const [values, setValues] = useState({
    ...defaultValues,
    client_id: defaultClientId,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validation = useMemo(() => {
    const errs = {};
    if (!values.client_id) errs.client_id = 'Client ID is required.';
    if (!values.issue_type) errs.issue_type = 'Issue Type is required.';
    if (!values.description) errs.description = 'Description is required.';
    return errs;
  }, [values]);

  const hasErrors = Object.keys(validation).length > 0;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setError(null);
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
      onSubmit={handleSubmit}
      style={{ marginBottom: 24, background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}
    >
      <h2>New Ticket</h2>

      <label style={{ display: 'block' }}>
        Client ID
        <input
          name="client_id"
          value={values.client_id}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 6 }}
        />
      </label>
      {validation.client_id && <div style={{ color: '#b91c1c', marginTop: -2, marginBottom: 10, fontSize: 13 }}>{validation.client_id}</div>}

      <label style={{ display: 'block' }}>
        Asset ID
        <input
          name="asset_id"
          value={values.asset_id}
          onChange={handleChange}
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
        />
      </label>

      <label style={{ display: 'block' }}>
        Issue Type
        <input
          name="issue_type"
          value={values.issue_type}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 6 }}
        />
      </label>
      {validation.issue_type && <div style={{ color: '#b91c1c', marginTop: -2, marginBottom: 10, fontSize: 13 }}>{validation.issue_type}</div>}

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

