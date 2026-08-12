import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const canEdit = user && (user.role === 'ADMIN' || user.role === 'DEVELOPER');

  const load = useCallback(() => {
    api.getIssue(id).then(setIssue).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    if (canEdit) {
      api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
    }
  }, [load, canEdit]);

  async function handleStatusChange(status) {
    try {
      const data = await api.updateIssue(id, { status });
      setIssue(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAssign(assigneeId) {
    try {
      const data = await api.assignIssue(id, assigneeId || null);
      setIssue(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this issue permanently?')) return;
    try {
      await api.deleteIssue(id);
      navigate('/issues');
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!issue) return <div className="page-center">Loading...</div>;

  const i = issue.issue;

  return (
    <div className="issue-detail">
      <h1>{i.title}</h1>
      <div className="badges-row">
        <span className={`badge badge-sev-${i.severity.toLowerCase()}`}>{i.severity}</span>
        <span className="badge">{i.priority}</span>
        <span className="badge">{i.status}</span>
        <span className="badge">{i.category}</span>
      </div>

      <p className="issue-description">{i.description}</p>

      <div className="issue-meta">
        <div><strong>Reporter:</strong> {i.reporter.name} ({i.reporter.email})</div>
        <div><strong>Assignee:</strong> {i.assignee ? `${i.assignee.name} (${i.assignee.email})` : 'Unassigned'}</div>
        <div><strong>Created:</strong> {new Date(i.createdAt).toLocaleString()}</div>
        <div><strong>Updated:</strong> {new Date(i.updatedAt).toLocaleString()}</div>
      </div>

      {canEdit && (
        <div className="issue-actions">
          <div>
            <label>Change status</label>
            <select value={i.status} onChange={(e) => handleStatusChange(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Assign to</label>
            <select value={i.assignee?.id || ''} onChange={(e) => handleAssign(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          {user.role === 'ADMIN' && (
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete Issue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
