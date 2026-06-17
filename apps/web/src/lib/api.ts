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

// Enterprise (V5)
export const enterpriseApi = {
  list: () => api.get<any[]>('/enterprise'),
  stats: () => api.get<any>('/enterprise/stats'),
  get: (id: string) => api.get<any>(`/enterprise/${id}`),
  create: (data: any) => api.post<any>('/enterprise', data),
  update: (id: string, data: any) => api.patch<any>(`/enterprise/${id}`, data),
  updateUptime: (id: string, uptimePercent: number) => api.patch<any>(`/enterprise/${id}/uptime`, { uptimePercent }),
  delete: (id: string) => api.delete<any>(`/enterprise/${id}`),
  agentStats: () => api.get<any>('/agents/enterprise-health/stats'),
  agentRun: () => api.post<any>('/agents/enterprise-health/run'),
};

// White Label (V5)
export const whiteLabelApi = {
  list: () => api.get<any[]>('/white-label'),
  stats: () => api.get<any>('/white-label/stats'),
  get: (id: string) => api.get<any>(`/white-label/${id}`),
  create: (data: any) => api.post<any>('/white-label', data),
  update: (id: string, data: any) => api.patch<any>(`/white-label/${id}`, data),
  completeOnboarding: (id: string) => api.post<any>(`/white-label/${id}/complete-onboarding`),
  delete: (id: string) => api.delete<any>(`/white-label/${id}`),
  agentStats: () => api.get<any>('/agents/whitelabel-onboarding/stats'),
  agentRun: () => api.post<any>('/agents/whitelabel-onboarding/run'),
};

// Mobile (V5)
export const mobileApi = {
  stats: () => api.get<any>('/mobile/stats'),
  retention: () => api.get<any>('/mobile/retention'),
  agentStats: () => api.get<any>('/agents/mobile-engagement/stats'),
  agentRun: () => api.post<any>('/agents/mobile-engagement/run'),
};

// Business OS (BOS)
export const bosApi = {
  dashboard: () => api.get<any>('/business-os/dashboard'),
  funnel: () => api.get<any>('/business-os/funnel'),
  kpi: () => api.get<any>('/business-os/kpi'),
  intelligence: () => api.get<any>('/business-os/intelligence'),
  priorities: () => api.get<any[]>('/business-os/priorities'),
  plan: () => api.get<any>('/business-os/plan'),
  questions: () => api.get<any>('/business-os/questions'),
  dailyReport: () => api.get<any>('/business-os/report/daily'),
  weeklyReport: () => api.get<any>('/business-os/report/weekly'),
};

// Knowledge Brain
export const knowledgeBrainApi = {
  dashboard: () => api.get<any>('/knowledge-brain/dashboard'),
  productIntelligence: () => api.get<any>('/knowledge-brain/product-intelligence'),
  customerIntelligence: () => api.get<any>('/knowledge-brain/customer-intelligence'),
  businessIntelligence: () => api.get<any>('/knowledge-brain/business-intelligence'),
  marketIntelligence: () => api.get<any>('/knowledge-brain/market-intelligence'),
  operationalIntelligence: () => api.get<any>('/knowledge-brain/operational-intelligence'),
  executiveQuestions: () => api.get<any[]>('/knowledge-brain/executive-questions'),
  ask: (question: string, domains?: string[]) => api.post<any>('/knowledge-brain/ask', { question, domains }),
  ingest: (data: any) => api.post<any>('/knowledge-brain/ingest', data),
  stats: () => api.get<any>('/knowledge-brain/stats'),
};

// AI Board of Directors
export const aiBoardApi = {
  meeting: () => api.get<any>('/ai-board/meeting'),
  ceo: () => api.get<any>('/ai-board/ceo'),
  cfo: () => api.get<any>('/ai-board/cfo'),
  coo: () => api.get<any>('/ai-board/coo'),
  cto: () => api.get<any>('/ai-board/cto'),
  cmo: () => api.get<any>('/ai-board/cmo'),
  cro: () => api.get<any>('/ai-board/cro'),
  cso: () => api.get<any>('/ai-board/cso'),
};

// Inbox (Omnichannel)
export const inboxApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ conversations: any[]; total: number }>(`/inbox${q}`);
  },
  stats: () => api.get<any>('/inbox/stats'),
  get: (id: string) => api.get<any>(`/inbox/${id}`),
  assign: (id: string, agentId: string) => api.patch<any>(`/inbox/${id}/assign`, { agentId }),
  resolve: (id: string) => api.patch<any>(`/inbox/${id}/resolve`, {}),
  replyWeb: (id: string, text: string) =>
    api.post<any>(`/inbox/webchat/reply/${id}`, { text }),
  replyFacebook: (id: string, text: string) =>
    api.post<any>(`/inbox/facebook/reply/${id}`, { text }),
  replyTelegram: (id: string, text: string) =>
    api.post<any>(`/inbox/telegram/reply/${id}`, { text }),
};

// Reports
export const reportsApi = {
  revenue: (days?: number) => api.get<any>(`/orders/revenue${days ? '?days=' + days : ''}`),
  orderStats: () => api.get<any>('/orders/stats/summary'),
  fulfillment: () => api.get<any>('/orders/fulfillment/status'),
  customerStats: () => api.get<any>('/customers/retention/stats'),
  paymentStats: () => api.get<any>('/payments/stats'),
  analyticsRevenue: () => api.get<any>('/analytics/revenue'),
};

// Workflows
export const workflowsApi = {
  list: () => api.get<any[]>('/workflows'),
  create: (data: any) => api.post<any>('/workflows', data),
  update: (id: string, data: any) => api.put<any>(`/workflows/${id}`, data),
  delete: (id: string) => api.delete<any>(`/workflows/${id}`),
  run: (id: string) => api.post<any>(`/workflows/${id}/run`),
  logs: (id: string) => api.get<any[]>(`/workflows/${id}/logs`),
};

// Self-Improvement Loop
export const selfImprovementApi = {
  dashboard: () => api.get<any>('/self-improvement/dashboard'),
  observe: () => api.get<any>('/self-improvement/observe'),
  evaluate: () => api.get<any>('/self-improvement/evaluate'),
  dailyLoop: () => api.get<any>('/self-improvement/daily-loop'),
  weeklyRetrospective: () => api.get<any>('/self-improvement/weekly-retrospective'),
  monthlyEvolution: () => api.get<any>('/self-improvement/monthly-evolution'),
  improvementPlan: () => api.get<any>('/self-improvement/improvement-plan'),
  scorecard: (period?: string) => api.get<any>(`/self-improvement/scorecard${period ? '?period=' + period : ''}`),
  scorecardToday: () => api.get<any>('/self-improvement/scorecard/today'),
  scorecardHistory: (period?: string, limit?: number) =>
    api.get<any[]>(`/self-improvement/scorecard/history?${period ? 'period=' + period + '&' : ''}${limit ? 'limit=' + limit : ''}`),
  decisions: (area?: string) => api.get<any[]>(`/self-improvement/decisions${area ? '?area=' + area : ''}`),
  createDecision: (data: any) => api.post<any>('/self-improvement/decisions', data),
  updateDecisionOutcome: (id: string, data: any) => api.put<any>(`/self-improvement/decisions/${id}/outcome`, data),
  experiments: (status?: string) => api.get<any[]>(`/self-improvement/experiments${status ? '?status=' + status : ''}`),
  createExperiment: (data: any) => api.post<any>('/self-improvement/experiments', data),
  updateExperiment: (id: string, data: any) => api.put<any>(`/self-improvement/experiments/${id}`, data),
  lessons: (type?: string, domain?: string) =>
    api.get<any[]>(`/self-improvement/lessons?${type ? 'type=' + type + '&' : ''}${domain ? 'domain=' + domain : ''}`),
  winningStrategies: () => api.get<any[]>('/self-improvement/lessons/winning-strategies'),
  failedStrategies: () => api.get<any[]>('/self-improvement/lessons/failed-strategies'),
  provenPatterns: () => api.get<any[]>('/self-improvement/lessons/proven-patterns'),
};

// Storefront (Customer-facing)
export const storefrontApi = {
  products: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ items: any[]; total: number; page: number; limit: number; totalPages: number }>(`/storefront/products${q}`);
  },
  product: (id: string) => api.get<{ product: any; related: any[] }>(`/storefront/products/${id}`),
  categories: () => api.get<any[]>('/storefront/categories'),
  checkout: (data: {
    name: string; phone: string; email?: string;
    address: string; city: string; note?: string;
    paymentMethod: 'cod' | 'bank_transfer';
    items: Array<{ productId: string; quantity: number }>;
  }) => api.post<{ success: boolean; orderCode: string; orderId: string; total: number; message: string }>('/storefront/checkout', data),
  track: (phone: string, orderCode?: string) => {
    const q = new URLSearchParams({ phone });
    if (orderCode) q.set('orderCode', orderCode);
    return api.get<{ found: boolean; customerName?: string; orders?: any[]; message?: string }>(`/storefront/track?${q}`);
  },
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
