import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/dashboard">🛡️ Issue Tracker</Link>
        </div>
        {user && (
          <div className="navbar-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/issues">Issues</Link>
            {(user.role === 'ADMIN' || user.role === 'DEVELOPER') && <Link to="/issues/create">New Issue</Link>}
            {user.role === 'ADMIN' && <Link to="/admin/users">Users</Link>}
            {user.role === 'ADMIN' && <Link to="/admin/audit-logs">Audit Logs</Link>}
            <span className="navbar-user">
              {user.name} <span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span>
            </span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
