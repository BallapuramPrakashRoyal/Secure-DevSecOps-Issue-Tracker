import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function IssueCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    category: 'BUG',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.createIssue(form);
      navigate(`/issues/${data.issue.id}`);
    } catch (err) {
      setError(err.details ? err.details.map((d) => d.message).join(', ') : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page">
      <h1>Create Issue</h1>
      <form className="card-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Title</label>
        <input value={form.title} onChange={(e) => update('title', e.target.value)} required maxLength={200} />

        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          required
          rows={5}
          maxLength={5000}
        />

        <div className="form-row">
          <div>
            <label>Severity</label>
            <select value={form.severity} onChange={(e) => update('severity', e.target.value)}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              {['BUG', 'SECURITY', 'FEATURE', 'PERFORMANCE'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Issue'}
        </button>
      </form>
    </div>
  );
}
