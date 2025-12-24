// Mock Dashboard Service for testing without backend
export const mockDashboardData = {
  today: {
    total_sales: 42,
    total_revenue: 15750.50,
    total_discounts: 325.00,
  },
  month: {
    total_sales: 856,
    total_revenue: 285640.75,
    total_discounts: 8450.25,
  },
  inventory: {
    total_products: 248,
    low_stock_count: 12,
    out_of_stock_count: 3,
    total_inventory_value: 125480.00,
  },
  topProducts: [
    {
      name: 'MacBook Pro M3 14"',
      sku: 'MBP-M3-14',
      total_sold: 45,
      total_revenue: 89550.00,
    },
    {
      name: 'iPhone 15 Pro Max',
      sku: 'IPH-15PM-256',
      total_sold: 128,
      total_revenue: 153600.00,
    },
    {
      name: 'AirPods Pro 2',
      sku: 'APP-2-2023',
      total_sold: 203,
      total_revenue: 50750.00,
    },
    {
      name: 'iPad Air M2',
      sku: 'IPA-M2-64',
      total_sold: 67,
      total_revenue: 40200.00,
    },
    {
      name: 'Apple Watch Series 9',
      sku: 'AW-S9-45',
      total_sold: 89,
      total_revenue: 35600.00,
    },
  ],
  lowStockProducts: [
    {
      id: 1,
      name: 'Samsung Galaxy S24 Ultra',
      sku: 'SGS-24U-512',
      current_stock: 3,
      min_stock_level: 10,
    },
    {
      id: 2,
      name: 'Dell XPS 13 Plus',
      sku: 'DXP-13P-I7',
      current_stock: 2,
      min_stock_level: 5,
    },
    {
      id: 3,
      name: 'Sony WH-1000XM5',
      sku: 'SNY-WH5-BK',
      current_stock: 5,
      min_stock_level: 15,
    },
    {
      id: 4,
      name: 'Logitech MX Master 3S',
      sku: 'LOG-MXM3S',
      current_stock: 8,
      min_stock_level: 20,
    },
    {
      id: 5,
      name: 'HP Spectre x360',
      sku: 'HP-SX360-14',
      current_stock: 1,
      min_stock_level: 5,
    },
  ],
  recentSales: [
    {
      id: 1001,
      sale_number: 'INV-2024-001001',
      total_amount: 2599.99,
      created_at: new Date().toISOString(),
      customer_name: 'John Smith',
      cashier_name: 'Sarah Johnson',
    },
    {
      id: 1002,
      sale_number: 'INV-2024-001002',
      total_amount: 899.50,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      customer_name: 'Emily Davis',
      cashier_name: 'Mike Wilson',
    },
    {
      id: 1003,
      sale_number: 'INV-2024-001003',
      total_amount: 349.99,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      customer_name: null,
      cashier_name: 'Sarah Johnson',
    },
    {
      id: 1004,
      sale_number: 'INV-2024-001004',
      total_amount: 1249.00,
      created_at: new Date(Date.now() - 10800000).toISOString(),
      customer_name: 'Robert Brown',
      cashier_name: 'Lisa Anderson',
    },
    {
      id: 1005,
      sale_number: 'INV-2024-001005',
      total_amount: 599.99,
      created_at: new Date(Date.now() - 14400000).toISOString(),
      customer_name: 'Jennifer Wilson',
      cashier_name: 'Mike Wilson',
    },
  ],
};

export const mockUserData = {
  id: 1,
  username: 'admin',
  email: 'admin@stockmanager.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  displayName: 'Admin User',
};

// Function to simulate API delay
export const simulateApiDelay = (ms: number = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock API endpoints
export const mockApi = {
  getDashboard: async () => {
    await simulateApiDelay(300);
    return mockDashboardData;
  },
  
  getCurrentUser: async () => {
    await simulateApiDelay(200);
    return mockUserData;
  },
  
  getFinancials: async () => {
    await simulateApiDelay(400);
    return {
      revenue: 285640.75,
      profit: 142820.38,
      taxes: 28564.08,
      cashFlow: 114256.30,
    };
  },
  
  getCustomerSegments: async () => {
    await simulateApiDelay(350);
    return {
      segments: [
        { name: 'Premium', customer_count: 45 },
        { name: 'Regular', customer_count: 234 },
        { name: 'New', customer_count: 89 },
        { name: 'VIP', customer_count: 12 },
      ],
    };
  },
};
