import axios from 'axios';

const BASE_URL = 'https://greenbus-prod-production.up.railway.app/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth');
  if (raw) {
    try {
      const auth = JSON.parse(raw);
      if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; display_name: string; gender?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: Partial<{ display_name: string; gender: string }>) =>
    api.patch('/auth/profile', data),
};

export const routesApi = {
  getAll: (params?: { type?: string; tourist?: boolean }) =>
    api.get('/routes', { params }),
  getById: (id: string) => api.get(`/routes/${id}`),
  getStops: () => api.get('/stops'),
  getStopETA: (stopId: string) => api.get(`/stops/${stopId}/eta`),
};

export const busApi = {
  getAll: () => api.get('/buses'),
  getByRoute: (routeId: string) => api.get(`/buses/route/${routeId}`),
  getById: (id: string) => api.get(`/buses/${id}`),
  getStats: () => api.get('/buses/stats'),
  updateLocation: (data: { bus_id: string; latitude: number; longitude: number; occupied_seats?: number }) =>
    api.patch('/buses/location', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/buses/${id}/status`, { status }),
  assignDriver: (busId: string, driver_id: string) =>
    api.patch(`/buses/${busId}/assign-driver`, { driver_id }),
};

export const ticketApi = {
  buy: (route_id: string) => api.post('/tickets/buy', { route_id }),
  getMyTickets: (status?: string) => api.get('/tickets', { params: { status } }),
  validate: (ticket_id: string, bus_id?: string) =>
    api.post('/tickets/validate', { ticket_id, bus_id }),
  topUp: (amount: number) => api.post('/wallet/topup', { amount }),
  getWalletHistory: () => api.get('/wallet/history'),
};

export const alertApi = {
  getActive: () => api.get('/alerts'),
  create: (data: { type: string; message: string; route_id?: string }) =>
    api.post('/alerts', data),
  deactivate: (id: string) => api.delete(`/alerts/${id}`),
};

export const feedbackApi = {
  submit: (data: { bus_id?: string; rating: number; comment?: string }) =>
    api.post('/feedback', data),
  getAll: (bus_id?: string) => api.get('/feedback', { params: { bus_id } }),
  getStats: () => api.get('/feedback/stats'),
};

export const newsApi = {
  getAll: () => api.get('/news'),
  create: (data: { title: string; content: string }) => api.post('/news', data),
};

export const adminApi = {
  getAnalytics: () => api.get('/admin/analytics'),
};
