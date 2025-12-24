import axios from '../config/api';

export interface SystemSettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  tax_rate: number;
  currency: string;
  language: string;
}

export interface TaxSettings {
  default_tax_rate: number;
  tax_inclusive: boolean;
  tax_groups: Array<{
    name: string;
    rate: number;
  }>;
}

class SettingsService {
  private systemSettings: SystemSettings | null = null;
  private taxSettings: TaxSettings | null = null;

  // Get system settings
  async getSystemSettings(): Promise<SystemSettings> {
    if (this.systemSettings) {
      return this.systemSettings;
    }

    try {
      const response = await axios.get('/api/settings/system');
      this.systemSettings = response.data;
      return this.systemSettings!; // Use non-null assertion since we just assigned it
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
      // Return default settings on error
      const defaultSettings: SystemSettings = {
        company_name: 'Stock Management System',
        address: '',
        phone: '',
        email: '',
        tax_rate: 0.0,
        currency: 'USD',
        language: 'en'
      };
      this.systemSettings = defaultSettings;
      return defaultSettings;
    }
  }

  // Update system settings
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
      await axios.put('/api/settings/system', settings);
      // Refresh cached settings
      this.systemSettings = null;
      await this.getSystemSettings();
    } catch (error) {
      console.error('Failed to update system settings:', error);
      throw error;
    }
  }

  // Get tax settings
  async getTaxSettings(): Promise<TaxSettings> {
    if (this.taxSettings) {
      return this.taxSettings;
    }

    try {
      const response = await axios.get('/api/settings/taxes');
      this.taxSettings = response.data;
      return this.taxSettings!; // Use non-null assertion since we just assigned it
    } catch (error) {
      console.error('Failed to fetch tax settings:', error);
      // Return default tax settings on error
      const defaultTaxSettings: TaxSettings = {
        default_tax_rate: 0.0,
        tax_inclusive: false,
        tax_groups: []
      };
      this.taxSettings = defaultTaxSettings;
      return defaultTaxSettings;
    }
  }

  // Update tax settings
  async updateTaxSettings(settings: Partial<TaxSettings>): Promise<void> {
    try {
      await axios.put('/api/settings/taxes', settings);
      // Refresh cached settings
      this.taxSettings = null;
      await this.getTaxSettings();
    } catch (error) {
      console.error('Failed to update tax settings:', error);
      throw error;
    }
  }

  // Get current tax rate (convenience method)
  async getTaxRate(): Promise<number> {
    const systemSettings = await this.getSystemSettings();
    const taxSettings = await this.getTaxSettings();
    
    // Prefer tax settings over system settings
    return taxSettings.default_tax_rate || systemSettings.tax_rate || 0.0;
  }

  // Calculate tax amount
  async calculateTax(subtotal: number): Promise<number> {
    const taxRate = await this.getTaxRate();
    return subtotal * taxRate;
  }

  // Calculate total with tax
  async calculateTotalWithTax(subtotal: number): Promise<{ subtotal: number; tax: number; total: number }> {
    const tax = await this.calculateTax(subtotal);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  // Check if tax is inclusive
  async isTaxInclusive(): Promise<boolean> {
    const taxSettings = await this.getTaxSettings();
    return taxSettings.tax_inclusive;
  }

  // Clear cache (call when settings might have changed)
  clearCache(): void {
    this.systemSettings = null;
    this.taxSettings = null;
  }

  // Format currency
  async formatCurrency(amount: number): Promise<string> {
    const settings = await this.getSystemSettings();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency
    }).format(amount);
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
export default settingsService;
