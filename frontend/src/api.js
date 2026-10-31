/**
 * Adaptive LLM Router - API Client Service
 * Connects frontend views to FastAPI backend.
 */

const API_BASE = '/api';

export async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Routing & Inference
  routeAndRun: (payload) => fetchJson('/route-and-run', { method: 'POST', body: JSON.stringify(payload) }),
  routeOnly: (payload) => fetchJson('/route', { method: 'POST', body: JSON.stringify(payload) }),
  inference: (payload) => fetchJson('/inference', { method: 'POST', body: JSON.stringify(payload) }),

  // System & Models
  getSystemState: () => fetchJson('/system-state'),
  setWorkloadMode: (mode) => fetchJson('/system-state/workload', { method: 'POST', body: JSON.stringify({ mode }) }),
  getModels: () => fetchJson('/models'),
  toggleModel: (tier, is_online) => fetchJson('/models/toggle', { method: 'POST', body: JSON.stringify({ tier, is_online }) }),

  // Observability & Telemetry
  getLiveMonitor: () => fetchJson('/live-monitor'),
  getAnalytics: () => fetchJson('/analytics'),
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/requests?${query}`);
  },
  getRequestDetail: (id) => fetchJson(`/requests/${id}`),

  // Policy
  getPolicy: () => fetchJson('/policy'),
  updatePolicy: (payload) => fetchJson('/policy', { method: 'PUT', body: JSON.stringify(payload) }),

  // Experiments
  getExperiments: () => fetchJson('/experiments'),
  runExperiment: (payload) => fetchJson('/experiments', { method: 'POST', body: JSON.stringify(payload) }),
  runBaselinesBenchmark: (payload) => fetchJson('/experiments/baselines', { method: 'POST', body: JSON.stringify(payload) }),
};
