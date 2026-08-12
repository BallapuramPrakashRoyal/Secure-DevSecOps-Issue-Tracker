import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ROLES = ['ADMIN', 'DEVELOPER', 'VIEWER'];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'VIEWER' });
  const [creating, setCreating] = useState(false);

  function load() {
    api.listUsers().then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleRoleChange(id, role) {
    try {
      await api.updateUserRole(id, role);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.createUser(newUser);
      setNewUser({ name: '', email: '', password: '', role: 'VIEWER' });
      load();
    } catch (err) {
      setError(err.details ? err.details.map((d) => d.message).join(', ') : err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>User Management</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <h2>Create User</h2>
      <form className="card-form inline-form" onSubmit={handleCreate}>
        <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} required />
        <input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} required />
        <input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} required minLength={8} />
        <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create'}
        </button>
      </form>

      <h2>Users</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} disabled={u.id === currentUser.id} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="btn btn-danger" disabled={u.id === currentUser.id} onClick={() => handleDelete(u.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
