const BASE = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post<{ accessToken: string; user: any }>('/auth/register', { email, password, name }),
  me: () => api.get<any>('/auth/me'),
};

// Products
export const productsApi = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/products${q}`);
  },
  get: (id: string) => api.get<any>(`/products/${id}`),
  create: (data: any) => api.post<any>('/products', data),
  update: (id: string, data: any) => api.put<any>(`/products/${id}`, data),
  delete: (id: string) => api.delete<any>(`/products/${id}`),
};

// Orders
export const ordersApi = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/orders${q}`);
  },
  get: (id: string) => api.get<any>(`/orders/${id}`),
  create: (data: any) => api.post<any>('/orders', data),
  updateStatus: (id: string, status: string) => api.put<any>(`/orders/${id}/status`, { status }),
  revenue: () => api.get<any>('/orders/revenue'),
};

// Customers
export const customersApi = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/customers${q}`);
  },
  get: (id: string) => api.get<any>(`/customers/${id}`),
};

// Leads
export const leadsApi = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/leads${q}`);
  },
};

// Categories
export const categoriesApi = {
  list: () => api.get<any[]>('/categories'),
  create: (data: any) => api.post<any>('/categories', data),
  update: (id: string, data: any) => api.put<any>(`/categories/${id}`, data),
  delete: (id: string) => api.delete<any>(`/categories/${id}`),
};

// Brands
export const brandsApi = {
  list: () => api.get<any[]>('/brands'),
  create: (data: any) => api.post<any>('/brands', data),
  delete: (id: string) => api.delete<any>(`/brands/${id}`),
};

// Inventory
export const inventoryApi = {
  byProduct: (id: string) => api.get<any[]>(`/inventory/product/${id}`),
  lowStock: () => api.get<any[]>('/inventory/low-stock'),
  value: () => api.get<any>('/inventory/value'),
  adjust: (data: any) => api.post<any>('/inventory/adjust', data),
};

// Payments
export const paymentsApi = {
  list: () => api.get<{ items: any[]; total: number }>('/payments'),
  stats: () => api.get<any>('/payments/stats'),
};

// Analytics
export const analyticsApi = {
  revenue: () => api.get<any>('/analytics/revenue'),
  leads: () => api.get<any>('/analytics/leads'),
  customers: () => api.get<any>('/analytics/customers'),
  ai: () => api.get<any>('/analytics/ai'),
};

// Agents
export const agentsApi = {
  masterKpi: () => api.get<any>('/agents/master/kpi'),
  runMaster: () => api.post('/agents/master/run'),
  runTrend: () => api.post('/agents/trend/run'),
  runContent: () => api.post('/agents/content/run'),
  runPublisher: () => api.post('/agents/publisher/run'),
  runLeadHunter: () => api.post('/agents/lead-hunter/run'),
  runCrm: () => api.post('/agents/crm/run'),
  runKnowledge: () => api.post('/agents/knowledge/sync'),
  publisherStats: () => api.get<any>('/agents/publisher/stats'),
  leadHunterStats: () => api.get<any>('/agents/lead-hunter/stats'),
  crmStats: () => api.get<any>('/agents/crm/stats'),
  knowledgeStats: () => api.get<any>('/agents/knowledge/stats'),
};

// Campaigns
export const campaignsApi = {
  list: () => api.get<any[]>('/campaigns'),
  create: (data: any) => api.post<any>('/campaigns', data),
};

// Suppliers
export const suppliersApi = {
  list: () => api.get<any[]>('/suppliers'),
  create: (data: any) => api.post<any>('/suppliers', data),
  update: (id: string, data: any) => api.put<any>(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete<any>(`/suppliers/${id}`),
  products: (supplierId: string) => api.get<any[]>(`/supplier-products/by-supplier/${supplierId}`),
  listProducts: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/supplier-products${q}`);
  },
  createProduct: (data: any) => api.post<any>('/supplier-products', data),
  updateProduct: (id: string, data: any) => api.put<any>(`/supplier-products/${id}`, data),
  deleteProduct: (id: string) => api.delete<any>(`/supplier-products/${id}`),
};

// Dropship
export const dropshipApi = {
  listProducts: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/dropship/products${q}`);
  },
  statsProducts: () => api.get<any>('/dropship/products/stats'),
  createProduct: (data: any) => api.post<any>('/dropship/products', data),
  updateProduct: (id: string, data: any) => api.put<any>(`/dropship/products/${id}`, data),
  deleteProduct: (id: string) => api.delete<any>(`/dropship/products/${id}`),
  listOrders: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/dropship/orders${q}`);
  },
  statsOrders: () => api.get<any>('/dropship/orders/stats'),
  createOrder: (data: any) => api.post<any>('/dropship/orders', data),
  updateOrderStatus: (id: string, status: string) => api.put<any>(`/dropship/orders/${id}/status`, { status }),
};

// Affiliate Portal
export const affiliatePortalApi = {
  listPartners: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/affiliate-portal/partners${q}`);
  },
  statsPartners: () => api.get<any>('/affiliate-portal/partners/stats'),
  createPartner: (data: any) => api.post<any>('/affiliate-portal/partners', data),
  updatePartner: (id: string, data: any) => api.put<any>(`/affiliate-portal/partners/${id}`, data),
  approvePartner: (id: string) => api.put<any>(`/affiliate-portal/partners/${id}/approve`, {}),
  suspendPartner: (id: string) => api.put<any>(`/affiliate-portal/partners/${id}/suspend`, {}),
  listConversions: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/affiliate-portal/conversions${q}`);
  },
  approveConversion: (id: string) => api.put<any>(`/affiliate-portal/conversions/${id}/approve`, {}),
  payConversion: (id: string) => api.put<any>(`/affiliate-portal/conversions/${id}/pay`, {}),
};

// Marketplace
export const marketplaceApi = {
  status: () => api.get<any>('/marketplace/status'),
  trending: (limit = 20) => api.get<any[]>(`/marketplace/trending?limit=${limit}`),
  search: (q: string, limit = 10) => api.get<any[]>(`/marketplace/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  generateLink: (url: string) => api.post<any>('/marketplace/affiliate-link', { url }),
};

// Users (RBAC)
export const usersApi = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(`/users${q}`);
  },
  stats: () => api.get<any>('/users/stats'),
  get: (id: string) => api.get<any>(`/users/${id}`),
  create: (data: any) => api.post<any>('/users', data),
  updateRole: (id: string, role: string) => api.put<any>(`/users/${id}/role`, { role }),
  updateStatus: (id: string, status: string) => api.put<any>(`/users/${id}/status`, { status }),
  resetPassword: (id: string, password: string) => api.put<any>(`/users/${id}/reset-password`, { password }),
  delete: (id: string) => api.delete<any>(`/users/${id}`),
};
