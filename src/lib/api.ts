const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ msg: string; param: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load tokens from localStorage on initialization
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data: ApiResponse<{ accessToken: string; refreshToken: string }> = await response.json();
        if (data.success && data.data) {
          this.setTokens(data.data.accessToken, data.data.refreshToken);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }

    this.clearTokens();
    return false;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response: Response;
    
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error: any) {
      // Network error (connection refused, CORS, etc.)
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Unable to connect to server. Please ensure the backend is running on http://localhost:5000');
      }
      throw error;
    }

    // If unauthorized, try to refresh token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        try {
          response = await fetch(url, {
            ...options,
            headers,
          });
        } catch (error: any) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Unable to connect to server. Please ensure the backend is running on http://localhost:5000');
          }
          throw error;
        }
      }
    }

    // Handle non-JSON responses
    let data: ApiResponse<T>;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (error) {
        // If JSON parsing fails, it's likely a server error
        throw new Error(`Server returned invalid response. Status: ${response.status}`);
      }
    } else {
      // If response is not JSON, create a generic error response
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    if (!response.ok) {
      // Handle validation errors
      if (data.errors && data.errors.length > 0) {
        const errorMessages = data.errors.map(err => err.msg).join(', ');
        throw new Error(errorMessages || data.message || 'Request failed');
      }
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  async register(data: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    role?: string;
  }) {
    return this.request<{
      userId: string;
      email: string;
      mobile: string;
      isMobileVerified: boolean;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyMobile(data: { mobile: string; otp: string }) {
    return this.request('/auth/verify-mobile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    console.log('API Client: Login request for', email);
    try {
      const response = await this.request<{
        user: {
          id: string;
          name: string;
          email: string;
          mobile: string;
          role: string;
        };
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('API Client: Login response received', response);

      if (response.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        console.log('API Client: Tokens saved');
      }

      return response;
    } catch (error: any) {
      console.error('API Client: Login error', error);
      throw error;
    }
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.clearTokens();
    return response;
  }

  async resendOTP(mobile: string) {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  }

  // Medicine endpoints
  async getMedicines(params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.category) queryParams.append('category', params.category);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);

      const query = queryParams.toString();
      console.log('API Client: getMedicines called with params:', params);
      const response = await this.request<Array<any>>(`/medicines${query ? `?${query}` : ''}`);
      console.log('API Client: getMedicines response:', response);
      return response;
    } catch (error: any) {
      console.error('API Client: getMedicines error', error);
      throw error;
    }
  }

  async getMedicine(id: string) {
    return this.request(`/medicines/${id}`);
  }

  async createMedicine(data: any) {
    return this.request('/medicines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMedicine(id: string, data: any) {
    return this.request(`/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMedicine(id: string) {
    return this.request(`/medicines/${id}`, {
      method: 'DELETE',
    });
  }

  async searchByBarcode(barcode: string) {
    return this.request(`/medicines/barcode/${barcode}`);
  }

  // Billing endpoints (for cashiers)
  async searchMedicinesForBilling(query: string, barcode?: string) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (barcode) params.append('barcode', barcode);
    return this.request(`/billing/medicines/search?${params.toString()}`);
  }

  async getMedicineBatches(medicineId: string) {
    return this.request(`/billing/medicines/${medicineId}/batches`);
  }

  // User endpoints
  async getCurrentUser() {
    return this.request<{
      _id?: string;
      id?: string;
      name: string;
      email: string;
      mobile: string;
      role: string;
    }>('/users/me');
  }

  // Inventory endpoints
  async getInventory(params?: {
    page?: number;
    limit?: number;
    medicine?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.medicine) queryParams.append('medicine', params.medicine);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request<Array<any>>(`/inventory${query ? `?${query}` : ''}`);
  }

  async getLowStock() {
    return this.request<Array<any>>('/inventory/alerts/low-stock');
  }

  async getExpired() {
    return this.request<Array<any>>('/inventory/alerts/expired');
  }

  async getNearingExpiry() {
    return this.request<Array<any>>('/inventory/alerts/nearing-expiry');
  }

  async addInventory(data: any) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventory(id: string, data: any) {
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async stockAdjustment(id: string, adjustment: number, reason: string) {
    return this.request(`/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ adjustment, reason }),
    });
  }

  // Sales endpoints
  async getSales(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    customerMobile?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.customerMobile) queryParams.append('customerMobile', params.customerMobile);

    const query = queryParams.toString();
    return this.request<Array<any>>(`/sales${query ? `?${query}` : ''}`);
  }

  async getSale(id: string) {
    return this.request(`/sales/${id}`);
  }

  async createSale(data: any) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Supplier endpoints
  async getSuppliers(params?: {
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

    const query = queryParams.toString();
    return this.request<Array<any>>(`/suppliers${query ? `?${query}` : ''}`);
  }

  async createSupplier(data: any) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Customer endpoints
  async getCustomers(params?: {
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

    const query = queryParams.toString();
    return this.request<Array<any>>(`/customers${query ? `?${query}` : ''}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async getCustomerByMobile(mobile: string) {
    return this.request(`/customers/mobile/${mobile}`);
  }

  async createCustomer(data: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async getTopCustomers(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<Array<any>>(`/customers/top${query}`);
  }

  async updateSupplier(id: string, data: any) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // User endpoints (Admin only)
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request<Array<any>>(`/users${query ? `?${query}` : ''}`);
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Report endpoints
  async getDailySalesReport(date?: string) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/reports/daily-sales${query}`);
  }

  async getMonthlySalesReport(month?: string, year?: string) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/reports/monthly-sales${query}`);
  }

  async getInventoryValuation() {
    return this.request('/reports/inventory-valuation');
  }

  async getExpiredStockReport() {
    return this.request('/reports/expired-stock');
  }

  async getProfitLossSummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/reports/profit-loss${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
