import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listAuditLogs({ page, pageSize: 20 })
      .then((d) => {
        setLogs(d.logs);
        setPagination(d.pagination);
      })
      .catch((e) => setError(e.message));
  }, [page]);

  return (
    <div>
      <h1>Audit Logs</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Entity</th>
            <th>IP</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td><span className="badge">{log.action}</span></td>
              <td>{log.actor ? `${log.actor.name} (${log.actor.role})` : 'system'}</td>
              <td>{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</td>
              <td>{log.ipAddress || '—'}</td>
              <td className="mono small">{log.metadata ? JSON.stringify(log.metadata) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn btn-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
