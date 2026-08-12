import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const CATEGORIES = ['BUG', 'SECURITY', 'FEATURE', 'PERFORMANCE'];

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ status: '', severity: '', category: '', search: '', page: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .listIssues({ ...filters, pageSize: 10 })
      .then((data) => {
        setIssues(data.issues);
        setPagination(data.pagination);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  function update(field, value) {
    setFilters((f) => ({ ...f, [field]: value, page: field === 'page' ? value : 1 }));
  }

  return (
    <div>
      <h1>Issues</h1>

      <div className="filter-bar">
        <input
          placeholder="Search title or description..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
        />
        <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filters.severity} onChange={(e) => update('severity', e.target.value)}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filters.category} onChange={(e) => update('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-center">Loading...</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Category</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <Link to={`/issues/${issue.id}`}>{issue.title}</Link>
                  </td>
                  <td><span className={`badge badge-sev-${issue.severity.toLowerCase()}`}>{issue.severity}</span></td>
                  <td>{issue.priority}</td>
                  <td>{issue.status}</td>
                  <td>{issue.category}</td>
                  <td>{issue.assignee ? issue.assignee.name : '—'}</td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">No issues found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => update('page', pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => update('page', pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
