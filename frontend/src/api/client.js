const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  listIssues: (params) => request('/issues', { params }),
  getIssue: (id) => request(`/issues/${id}`),
  createIssue: (body) => request('/issues', { method: 'POST', body }),
  updateIssue: (id, body) => request(`/issues/${id}`, { method: 'PATCH', body }),
  deleteIssue: (id) => request(`/issues/${id}`, { method: 'DELETE' }),
  assignIssue: (id, assigneeId) => request(`/issues/${id}/assign`, { method: 'POST', body: { assigneeId } }),
  getStats: () => request('/issues/stats'),

  listUsers: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body }),
  updateUserRole: (id, role) => request(`/users/${id}`, { method: 'PATCH', body: { role } }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  listAuditLogs: (params) => request('/audit-logs', { params }),
};
