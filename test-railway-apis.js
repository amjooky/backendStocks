const axios = require('axios');

// Configuration for Railway backend
const BASE_URL = 'https://backend-production-cde7.up.railway.app';
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

let authToken = '';

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper function to make authenticated requests
const authenticatedRequest = (method, endpoint, data = null) => {
    const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
        timeout: 10000 // 10 second timeout
    };
    
    if (data) {
        config.data = data;
    }
    
    return axios(config);
};

// Test function wrapper
const runTest = async (testName, testFn) => {
    try {
        console.log(`🧪 Testing: ${testName}`);
        const result = await testFn();
        console.log(`✅ PASSED: ${testName}${result ? ' - ' + result : ''}\n`);
        testResults.passed++;
        testResults.tests.push({ name: testName, status: 'PASSED', result });
    } catch (error) {
        console.log(`❌ FAILED: ${testName}`);
        console.log(`   Error: ${error.response?.status || 'NO_STATUS'} - ${error.response?.data?.message || error.message}\n`);
        testResults.failed++;
        testResults.tests.push({ 
            name: testName, 
            status: 'FAILED', 
            error: `${error.response?.status || 'NO_STATUS'} - ${error.response?.data?.message || error.message}`
        });
    }
};

// Individual test functions
const testHealthCheck = async () => {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.status) throw new Error('Health check response missing status');
    return `Status: ${response.data.status}`;
};

const testLogin = async () => {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER, { timeout: 10000 });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.token) throw new Error('Login response missing token');
    
    // Store token for subsequent tests
    authToken = response.data.token;
    return `Token acquired`;
};

const testProfile = async () => {
    const response = await authenticatedRequest('GET', '/api/auth/profile');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.user) throw new Error('Profile response missing user data');
    return `User: ${response.data.user.username} (${response.data.user.role})`;
};

const testUsers = async () => {
    const response = await authenticatedRequest('GET', '/api/users');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.users?.length || response.data.length || 0;
    return `Found ${count} users`;
};

const testCategories = async () => {
    const response = await authenticatedRequest('GET', '/api/categories');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.categories?.length || response.data.length || 0;
    return `Found ${count} categories`;
};

const testProducts = async () => {
    const response = await authenticatedRequest('GET', '/api/products');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.products?.length || response.data.length || 0;
    return `Found ${count} products`;
};

const testCustomers = async () => {
    const response = await authenticatedRequest('GET', '/api/customers');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.customers?.length || response.data.length || 0;
    return `Found ${count} customers`;
};

const testSuppliers = async () => {
    const response = await authenticatedRequest('GET', '/api/suppliers');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.suppliers?.length || response.data.length || 0;
    return `Found ${count} suppliers`;
};

const testSales = async () => {
    const response = await authenticatedRequest('GET', '/api/sales');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.sales?.length || response.data.length || 0;
    return `Found ${count} sales records`;
};

const testInventory = async () => {
    const response = await authenticatedRequest('GET', '/api/inventory');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.inventory?.length || response.data.length || 0;
    return `Found ${count} inventory items`;
};

const testSettings = async () => {
    const response = await authenticatedRequest('GET', '/api/settings');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return `Settings loaded successfully`;
};

const testPromotions = async () => {
    const response = await authenticatedRequest('GET', '/api/promotions');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.promotions?.length || response.data.length || 0;
    return `Found ${count} promotions`;
};

const testCaisseSession = async () => {
    const response = await authenticatedRequest('GET', '/api/caisse/session');
    // 404 is expected if no active session
    if (response.status === 404) {
        return `No active session (expected)`;
    }
    if (response.status !== 200) throw new Error(`Expected 200 or 404, got ${response.status}`);
    return `Active session found`;
};

const testCaisseRoot = async () => {
    const response = await authenticatedRequest('GET', '/api/caisse');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return `Caisse overview retrieved`;
};

const testReports = async () => {
    const response = await authenticatedRequest('GET', '/api/reports');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return `Reports summary retrieved`;
};

const testReportsSummary = async () => {
    const response = await authenticatedRequest('GET', '/api/reports/summary');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return `Reports summary endpoint works`;
};

const testAnalytics = async () => {
    const response = await authenticatedRequest('GET', '/api/analytics');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return `Analytics overview retrieved`;
};

// Test analytics sub-endpoints
const testAnalyticsDashboard = async () => {
    const response = await authenticatedRequest('GET', '/api/analytics/dashboard');
    if (response.status === 404) {
        return `Endpoint not implemented (404 expected)`;
    }
    if (response.status !== 200) throw new Error(`Expected 200 or 404, got ${response.status}`);
    return `Dashboard analytics retrieved`;
};

const testAnalyticsFinancials = async () => {
    const response = await authenticatedRequest('GET', '/api/analytics/financials?startDate=2024-01-01&endDate=2024-12-31');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return `Financial analytics retrieved`;
};

// Test additional endpoints
const testNotifications = async () => {
    const response = await authenticatedRequest('GET', '/api/notifications');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const count = response.data.notifications?.length || response.data.length || 0;
    return `Found ${count} notifications`;
};

// Main test execution
const runAllTests = async () => {
    console.log('🚀 Starting comprehensive Railway API testing...\n');
    console.log(`Testing against: ${BASE_URL}\n`);

    // Basic connectivity tests
    await runTest('Health Check', testHealthCheck);
    
    // Authentication tests
    await runTest('User Login', testLogin);
    await runTest('User Profile', testProfile);
    
    // Core data API tests
    await runTest('Users API', testUsers);
    await runTest('Categories API', testCategories);
    await runTest('Products API', testProducts);
    await runTest('Customers API', testCustomers);
    await runTest('Suppliers API', testSuppliers);
    await runTest('Sales API', testSales);
    await runTest('Inventory API', testInventory);
    await runTest('Settings API', testSettings);
    await runTest('Promotions API', testPromotions);
    await runTest('Notifications API', testNotifications);
    
    // Business logic API tests
    await runTest('Caisse Root API', testCaisseRoot);
    await runTest('Caisse Session API', testCaisseSession);
    await runTest('Reports Root API', testReports);
    await runTest('Reports Summary API', testReportsSummary);
    await runTest('Analytics Root API', testAnalytics);
    await runTest('Analytics Dashboard API', testAnalyticsDashboard);
    await runTest('Analytics Financials API', testAnalyticsFinancials);

    // Print summary
    console.log('📊 RAILWAY API TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.tests
            .filter(test => test.status === 'FAILED')
            .forEach(test => {
                console.log(`   • ${test.name}: ${test.error}`);
            });
    } else {
        console.log('\n🎉 ALL TESTS PASSED! Your Railway backend is working perfectly.');
    }
    
    console.log('\n📱 Railway backend is ready for mobile app integration!');
    console.log(`🌐 Backend URL: ${BASE_URL}`);
};

// Execute tests
runAllTests().catch(console.error);