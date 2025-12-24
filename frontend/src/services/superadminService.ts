import axios from '../config/api';

export interface Agency {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  tax_code?: string;
  vat_number?: string;
  subscription_plan: 'basic' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  max_users: number;
  max_products: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
  product_count?: number;
  supplier_count?: number;
  customer_count?: number;
  recent_activity?: any[];
}

export interface CreateAgencyData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  subscription_plan: 'basic' | 'pro' | 'enterprise';
  max_users: number;
  max_products: number;
}

export interface UpdateAgencyData extends Partial<CreateAgencyData> {
  is_active?: boolean;
}

export interface SuperAdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'manager' | 'cashier';
  is_active: boolean;
  locked_until?: string;
  last_login?: string;
  created_at: string;
  agency_name?: string;
  subscription_plan?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'cashier';
  agency_id: number;
}

export interface SystemAnalytics {
  overview: {
    total_agencies: number;
    total_users: number;
    total_products: number;
    today_sales: number;
    today_revenue: number;
    week_sales: number;
    week_revenue: number;
    month_sales: number;
    month_revenue: number;
  };
  top_agencies: Array<{
    id: number;
    name: string;
    subscription_plan: string;
    sales_count: number;
    total_revenue: number;
    user_count: number;
  }>;
  subscription_distribution: Array<{
    subscription_plan: string;
    count: number;
    percentage: number;
  }>;
  sales_trend: Array<{
    date: string;
    sales_count: number;
    revenue: number;
  }>;
}

export interface AuditLog {
  id: number;
  user_id: number;
  agency_id?: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  agency_name?: string;
}

export interface AuditLogFilters {
  agency_id?: number;
  user_id?: number;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

class SuperadminService {
  // Agency Management
  async getAgencies(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await axios.get(`/api/superadmin/agencies?${queryParams}`);
    return response.data;
  }

  async getAgency(id: number): Promise<Agency> {
    const response = await axios.get(`/api/superadmin/agencies/${id}`);
    return response.data;
  }

  async createAgency(agencyData: CreateAgencyData): Promise<{ 
    message: string; 
    agencyId: number; 
    adminCredentials: {
      username: string;
      password: string;
      email: string;
      changePasswordRequired: boolean;
    };
  }> {
    const response = await axios.post('/api/superadmin/agencies', agencyData);
    return response.data;
  }

  async updateAgency(id: number, agencyData: UpdateAgencyData): Promise<{ message: string; agency: Agency }> {
    const response = await axios.put(`/api/superadmin/agencies/${id}`, agencyData);
    return response.data;
  }

  async suspendAgency(id: number, reason?: string): Promise<{ message: string }> {
    const response = await axios.post(`/api/superadmin/agencies/${id}/suspend`, {
      reason
    });
    return response.data;
  }

  async activateAgency(id: number): Promise<{ message: string }> {
    const response = await axios.post(`/api/superadmin/agencies/${id}/activate`);
    return response.data;
  }

  // User Management
  async getUsers(params?: {
    agency_id?: number;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.agency_id) queryParams.append('agency_id', params.agency_id.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await axios.get(`/api/superadmin/users?${queryParams}`);
    return response.data;
  }

  async createUser(userData: CreateUserData): Promise<{ message: string; id: number; user: SuperAdminUser }> {
    const response = await axios.post('/api/superadmin/users', userData);
    return response.data;
  }

  async updateUser(id: number, userData: Partial<CreateUserData>): Promise<{ message: string }> {
    const response = await axios.put(`/api/superadmin/users/${id}`, userData);
    return response.data;
  }

  async lockUser(id: number, duration_hours?: number, reason?: string): Promise<{ message: string }> {
    const response = await axios.patch(`/api/superadmin/users/${id}/lock`, {
      locked: true,
      duration_hours,
      reason
    });
    return response.data;
  }

  async unlockUser(id: number): Promise<{ message: string }> {
    const response = await axios.patch(`/api/superadmin/users/${id}/lock`, {
      locked: false
    });
    return response.data;
  }

  // System Analytics
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    const response = await axios.get('/api/superadmin/analytics');
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(filters?: AuditLogFilters) {
    const queryParams = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await axios.get(`/api/superadmin/audit-log?${queryParams}`);
    return response.data;
  }

  // Helper methods
  getSubscriptionPlans() {
    return [
      { value: 'basic', label: 'Basic', description: 'Basic features for small businesses' },
      { value: 'pro', label: 'Pro', description: 'Advanced features for growing businesses' },
      { value: 'enterprise', label: 'Enterprise', description: 'Full features for large organizations' }
    ];
  }

  getRoles() {
    return [
      { value: 'admin', label: 'Admin', description: 'Full agency management' },
      { value: 'manager', label: 'Manager', description: 'Manage operations and reports' },
      { value: 'cashier', label: 'Cashier', description: 'POS operations only' }
    ];
  }

  formatCurrency(amount: number, currency = 'EUR') {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency
    }).format(amount);
  }
}

const superadminService = new SuperadminService();
export default superadminService;