// Centralized API client with JWT interception

const BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('quickdesk_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If token invalid/expired and not a login request, clear storage
    if (!endpoint.includes('/auth/login')) {
      localStorage.removeItem('quickdesk_token');
      localStorage.removeItem('quickdesk_user');
      window.dispatchEvent(new Event('quickdesk_auth_change'));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  auth: {
    login: (email, password) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (userData) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => apiRequest('/auth/me'),
  },

  tickets: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.category && params.category !== 'all') query.append('category', params.category);
      if (params.priority && params.priority !== 'all') query.append('priority', params.priority);
      if (params.search) query.append('search', params.search);

      const qs = query.toString() ? `?${query.toString()}` : '';
      return apiRequest(`/tickets${qs}`);
    },
    get: (id) => apiRequest(`/tickets/${id}`),
    create: (ticketData) =>
      apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketData),
      }),
    override: (id, fieldName, newValue) =>
      apiRequest(`/tickets/${id}/override`, {
        method: 'PATCH',
        body: JSON.stringify({ field_name: fieldName, new_value: newValue }),
      }),
    getOverrides: (id) => apiRequest(`/tickets/${id}/overrides`),
    regenerateDraft: (id) =>
      apiRequest(`/tickets/${id}/generate-draft`, {
        method: 'POST',
      }),
    sendReply: (id, reply) =>
      apiRequest(`/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      }),
  },

  metrics: {
    get: () => apiRequest('/metrics'),
  },
};
