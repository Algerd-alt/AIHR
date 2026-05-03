const API_BASE = import.meta.env.VITE_API_BASE || 'https://sd7pglkr5ecdfn0ifso5g.apigateway-cn-beijing.volceapi.com'

export const api = {
  get: (path) => fetch(`${API_BASE}${path}`),
  post: (path, body) => fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  put: (path, body) => fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  delete: (path) => fetch(`${API_BASE}${path}`, { method: 'DELETE' }),
}
