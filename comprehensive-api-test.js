const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

let authToken = '';
let testResults = [];

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, requireAuth = true) {
    try {
        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (requireAuth && authToken) {
            config.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 0,
            error: error.response?.data?.message || error.message
        };
    }
}

// Test functions
async function testLogin() {
    console.log('🧪 Testing: Authentication');
    const result = await makeRequest('POST', '/auth/login', TEST_USER, false);
    
    if (result.success && result.data.token) {
        authToken = result.data.token;
        console.log('✅ PASSED: Authentication');
        testResults.push({ test: 'Authentication', status: 'PASSED' });
        return true;
    } else {
        console.log('❌ FAILED: Authentication -', result.error);
        testResults.push({ test: 'Authentication', status: 'FAILED', error: result.error });
        return false;
    }
}

async function testHealthCheck() {
    console.log('🧪 Testing: Health Check');
    try {
        const response = await axios.get('http://localhost:5000/health');
        if (response.status === 200) {
            console.log('✅ PASSED: Health Check');
            testResults.push({ test: 'Health Check', status: 'PASSED' });
        } else {
            console.log('❌ FAILED: Health Check - Wrong status code');
            testResults.push({ test: 'Health Check', status: 'FAILED', error: 'Wrong status code' });
        }
    } catch (error) {
        console.log('❌ FAILED: Health Check -', error.message);
        testResults.push({ test: 'Health Check', status: 'FAILED', error: error.message });
    }
}

async function testUserProfile() {
    console.log('🧪 Testing: User Profile');
    const result = await makeRequest('GET', '/auth/profile');
    
    if (result.success) {
        console.log('✅ PASSED: User Profile');
        testResults.push({ test: 'User Profile', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: User Profile -', result.error);
        testResults.push({ test: 'User Profile', status: 'FAILED', error: result.error });
    }
}

async function testCategories() {
    console.log('🧪 Testing: Categories API');
    const result = await makeRequest('GET', '/categories');
    
    if (result.success) {
        console.log('✅ PASSED: Categories API');
        console.log(`   Found ${result.data.categories?.length || 0} categories`);
        testResults.push({ test: 'Categories API', status: 'PASSED', count: result.data.categories?.length || 0 });
    } else {
        console.log('❌ FAILED: Categories API -', result.error);
        testResults.push({ test: 'Categories API', status: 'FAILED', error: result.error });
    }
}

async function testProducts() {
    console.log('🧪 Testing: Products API');
    const result = await makeRequest('GET', '/products');
    
    if (result.success) {
        console.log('✅ PASSED: Products API');
        console.log(`   Found ${result.data.products?.length || 0} products`);
        testResults.push({ test: 'Products API', status: 'PASSED', count: result.data.products?.length || 0 });
    } else {
        console.log('❌ FAILED: Products API -', result.error);
        testResults.push({ test: 'Products API', status: 'FAILED', error: result.error });
    }
}

async function testCustomers() {
    console.log('🧪 Testing: Customers API');
    const result = await makeRequest('GET', '/customers');
    
    if (result.success) {
        console.log('✅ PASSED: Customers API');
        console.log(`   Found ${result.data.customers?.length || 0} customers`);
        testResults.push({ test: 'Customers API', status: 'PASSED', count: result.data.customers?.length || 0 });
    } else {
        console.log('❌ FAILED: Customers API -', result.error);
        testResults.push({ test: 'Customers API', status: 'FAILED', error: result.error });
    }
}

async function testSuppliers() {
    console.log('🧪 Testing: Suppliers API');
    const result = await makeRequest('GET', '/suppliers');
    
    if (result.success) {
        console.log('✅ PASSED: Suppliers API');
        console.log(`   Found ${result.data.suppliers?.length || 0} suppliers`);
        testResults.push({ test: 'Suppliers API', status: 'PASSED', count: result.data.suppliers?.length || 0 });
    } else {
        console.log('❌ FAILED: Suppliers API -', result.error);
        testResults.push({ test: 'Suppliers API', status: 'FAILED', error: result.error });
    }
}

async function testSales() {
    console.log('🧪 Testing: Sales API');
    const result = await makeRequest('GET', '/sales');
    
    if (result.success) {
        console.log('✅ PASSED: Sales API');
        console.log(`   Found ${result.data.sales?.length || 0} sales`);
        testResults.push({ test: 'Sales API', status: 'PASSED', count: result.data.sales?.length || 0 });
    } else {
        console.log('❌ FAILED: Sales API -', result.error);
        testResults.push({ test: 'Sales API', status: 'FAILED', error: result.error });
    }
}

async function testInventory() {
    console.log('🧪 Testing: Inventory API');
    const result = await makeRequest('GET', '/inventory');
    
    if (result.success) {
        console.log('✅ PASSED: Inventory API');
        testResults.push({ test: 'Inventory API', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Inventory API -', result.error);
        testResults.push({ test: 'Inventory API', status: 'FAILED', error: result.error });
    }
}

async function testPromotions() {
    console.log('🧪 Testing: Promotions API');
    const result = await makeRequest('GET', '/promotions');
    
    if (result.success) {
        console.log('✅ PASSED: Promotions API');
        console.log(`   Found ${result.data.promotions?.length || 0} promotions`);
        testResults.push({ test: 'Promotions API', status: 'PASSED', count: result.data.promotions?.length || 0 });
    } else {
        console.log('❌ FAILED: Promotions API -', result.error);
        testResults.push({ test: 'Promotions API', status: 'FAILED', error: result.error });
    }
}

async function testSettings() {
    console.log('🧪 Testing: Settings API');
    const result = await makeRequest('GET', '/settings');
    
    if (result.success) {
        console.log('✅ PASSED: Settings API');
        testResults.push({ test: 'Settings API', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Settings API -', result.error);
        testResults.push({ test: 'Settings API', status: 'FAILED', error: result.error });
    }
}

async function testNotifications() {
    console.log('🧪 Testing: Notifications API');
    const result = await makeRequest('GET', '/notifications');
    
    if (result.success) {
        console.log('✅ PASSED: Notifications API');
        console.log(`   Found ${result.data.notifications?.length || 0} notifications`);
        testResults.push({ test: 'Notifications API', status: 'PASSED', count: result.data.notifications?.length || 0 });
    } else {
        console.log('❌ FAILED: Notifications API -', result.error);
        testResults.push({ test: 'Notifications API', status: 'FAILED', error: result.error });
    }
}

async function testCaisse() {
    console.log('🧪 Testing: Caisse API');
    const result = await makeRequest('GET', '/caisse');
    
    if (result.success) {
        console.log('✅ PASSED: Caisse API');
        testResults.push({ test: 'Caisse API', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Caisse API -', result.error);
        testResults.push({ test: 'Caisse API', status: 'FAILED', error: result.error });
    }
}

async function testReports() {
    console.log('🧪 Testing: Reports API');
    const result = await makeRequest('GET', '/reports');
    
    if (result.success) {
        console.log('✅ PASSED: Reports API');
        testResults.push({ test: 'Reports API', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Reports API -', result.error);
        testResults.push({ test: 'Reports API', status: 'FAILED', error: result.error });
    }
}

async function testAnalytics() {
    console.log('🧪 Testing: Analytics API');
    const result = await makeRequest('GET', '/analytics');
    
    if (result.success) {
        console.log('✅ PASSED: Analytics API');
        testResults.push({ test: 'Analytics API', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Analytics API -', result.error);
        testResults.push({ test: 'Analytics API', status: 'FAILED', error: result.error });
    }
}

async function testAnalyticsDashboard() {
    console.log('🧪 Testing: Analytics Dashboard');
    const result = await makeRequest('GET', '/analytics/dashboard');
    
    if (result.success) {
        console.log('✅ PASSED: Analytics Dashboard');
        testResults.push({ test: 'Analytics Dashboard', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Analytics Dashboard -', result.error);
        testResults.push({ test: 'Analytics Dashboard', status: 'FAILED', error: result.error });
    }
}

async function testProductBarcode() {
    console.log('🧪 Testing: Product Barcode Lookup');
    const result = await makeRequest('GET', '/products/barcode/123456789');
    
    if (result.status === 404) {
        console.log('✅ PASSED: Product Barcode Lookup (404 expected for test barcode)');
        testResults.push({ test: 'Product Barcode Lookup', status: 'PASSED', note: '404 expected for test barcode' });
    } else if (result.success) {
        console.log('✅ PASSED: Product Barcode Lookup');
        testResults.push({ test: 'Product Barcode Lookup', status: 'PASSED' });
    } else {
        console.log('❌ FAILED: Product Barcode Lookup -', result.error);
        testResults.push({ test: 'Product Barcode Lookup', status: 'FAILED', error: result.error });
    }
}

async function testProductCreation() {
    console.log('🧪 Testing: Product Creation');
    const productData = {
        name: `Test Product ${Date.now()}`,
        sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}`,
        description: 'Test product for API testing',
        costPrice: 10.99,
        sellingPrice: 19.99,
        taxRate: 0.2,
        reorderPoint: 10,
        initialStock: 100,
        unit: 'pcs'
    };
    
    const result = await makeRequest('POST', '/products', productData);
    
    if (result.success) {
        console.log('✅ PASSED: Product Creation');
        console.log(`   Created product with ID: ${result.data.id}`);
        testResults.push({ test: 'Product Creation', status: 'PASSED', productId: result.data.id });
    } else {
        console.log('❌ FAILED: Product Creation -', result.error);
        testResults.push({ test: 'Product Creation', status: 'FAILED', error: result.error });
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Comprehensive API Testing...\n');
    console.log(`Testing against: ${API_BASE}\n`);

    // Test health check first (no auth required)
    await testHealthCheck();
    
    // Test authentication
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        console.log('\n❌ Cannot proceed without authentication');
        return;
    }

    // Run all authenticated tests
    await testUserProfile();
    await testCategories();
    await testProducts();
    await testCustomers();
    await testSuppliers();
    await testSales();
    await testInventory();
    await testPromotions();
    await testSettings();
    await testNotifications();
    await testCaisse();
    await testReports();
    await testAnalytics();
    await testAnalyticsDashboard();
    await testProductBarcode();
    await testProductCreation();

    // Summary
    console.log('\n📊 COMPREHENSIVE API TEST SUMMARY');
    console.log('============================================================');
    
    const passed = testResults.filter(r => r.status === 'PASSED').length;
    const failed = testResults.filter(r => r.status === 'FAILED').length;
    const successRate = Math.round((passed / testResults.length) * 100);
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${successRate}%\n`);

    if (failed > 0) {
        console.log('❌ FAILED TESTS:');
        testResults.filter(r => r.status === 'FAILED').forEach(result => {
            console.log(`   • ${result.test}: ${result.error}`);
        });
    }

    console.log('\n📱 Local backend API testing complete!');
}

// Run the tests
runAllTests().catch(error => {
    console.error('Test runner error:', error);
});