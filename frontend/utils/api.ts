const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Reseller {
  id: string;
  name: string;
  plan_mbps: number;
  threshold: number;
  phone?: string;
}

export interface UsagePoint {
  ts: string;
  reseller_id: string;
  rx_mbps: number;
  tx_mbps: number;
}

export interface Alert {
  id: string;
  reseller_id?: string;
  level: string;
  message: string;
  sent_at: string;
}

export interface VLAN {
  vlan_id: number;
  interface_name?: string;
  capacity_mbps: number;
  enabled?: boolean;
  rx_bytes?: string;
  tx_bytes?: string;
  description?: string;
}

export interface LinkState {
  reseller_id: string;
  state: string;
  since: string;
}

export interface CreateResellerRequest {
  name: string;
  plan_mbps: number;
  threshold?: number;
  phone: string;
  router_id: string;
  target_ip: string;
}

export interface UpdateResellerRequest {
  name?: string;
  plan_mbps?: number;
  threshold?: number;
  phone?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }

  async getResellers(): Promise<Reseller[]> {
    try {
      return await this.request<Reseller[]>('/api/resellers');
    } catch (error) {
      console.error('Error fetching resellers:', error);
      throw error;
    }
  }

  async getReseller(id: string): Promise<Reseller> {
    return this.request<Reseller>(`/api/resellers/${id}`);
  }

  async getResellerUsage(id: string, hours: number = 24): Promise<UsagePoint[]> {
    return this.request<UsagePoint[]>(`/api/resellers/${id}/usage?hours=${hours}`);
  }

  async getAlerts(limit: number = 50): Promise<Alert[]> {
    return this.request<Alert[]>(`/api/alerts?limit=${limit}`);
  }

  async getResellerAlerts(id: string, limit: number = 20): Promise<Alert[]> {
    return this.request<Alert[]>(`/api/resellers/${id}/alerts?limit=${limit}`);
  }

  async getLinkStates(): Promise<LinkState[]> {
    return this.request<LinkState[]>('/api/link-states');
  }

  async createReseller(data: CreateResellerRequest): Promise<Reseller> {
    const response = await fetch(`${this.baseUrl}/api/resellers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create reseller error response:', errorText);
      let errorMessage = `Failed to create reseller: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // Use default error message if parsing fails
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async updateReseller(id: string, data: UpdateResellerRequest): Promise<Reseller> {
    const response = await fetch(`${this.baseUrl}/api/resellers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update reseller error response:', errorText);
      let errorMessage = `Failed to update reseller: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // Use default error message if parsing fails
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getRouterVLANs(routerId: string): Promise<VLAN[]> {
    return this.request<{ router_id: string; router_name: string; devices: VLAN[] }>(`/api/routers/${routerId}/devices?type=vlan`).then(r => r.devices);
  }

  async syncRouterVLANs(routerId: string): Promise<VLAN[]> {
    const response = await fetch(`${this.baseUrl}/api/vlans/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ router_id: routerId, force_sync: false })
    });
    if (!response.ok) {
      throw new Error(`Failed to sync VLANs: ${response.statusText}`);
    }
    const data = await response.json();
    return data.vlans || [];
  }

  async deleteReseller(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/resellers/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete reseller error response:', errorText);
      let errorMessage = `Failed to delete reseller: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // Use default error message if parsing fails
      }
      throw new Error(errorMessage);
    }
  }
}

export const apiClient = new ApiClient(); 