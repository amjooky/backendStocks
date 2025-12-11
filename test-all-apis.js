const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAllAPIs() {
    console.log('🧪 COMPREHENSIVE API TEST');
    console.log('=========================');
    
    let token = null;
    
    try {
        // 1. Login first
        console.log('\n1️⃣ Testing Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (loginResponse.status === 200) {
            token = loginResponse.data.token;
            console.log('✅ Login successful, token received');
        } else {
            console.log('❌ Login failed');
            return;
        }
        
        // Headers with auth token
        const authHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. Test Categories API
        console.log('\n2️⃣ Testing Categories API...');
        try {
            const categoriesResponse = await axios.get(`${BASE_URL}/api/categories`, { headers: authHeaders });
            console.log('✅ Categories API works:', categoriesResponse.data.categories?.length || 0, 'categories');
        } catch (error) {
            console.log('❌ Categories API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 3. Test Products API
        console.log('\n3️⃣ Testing Products API...');
        try {
            const productsResponse = await axios.get(`${BASE_URL}/api/products`, { headers: authHeaders });
            console.log('✅ Products API works:', productsResponse.data.products?.length || 0, 'products');
        } catch (error) {
            console.log('❌ Products API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 4. Test Settings API
        console.log('\n4️⃣ Testing Settings API...');
        try {
            const settingsResponse = await axios.get(`${BASE_URL}/api/settings/system`, { headers: authHeaders });
            console.log('✅ Settings API works');
        } catch (error) {
            console.log('❌ Settings API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 5. Test Users API
        console.log('\n5️⃣ Testing Users API...');
        try {
            const usersResponse = await axios.get(`${BASE_URL}/api/users`, { headers: authHeaders });
            console.log('✅ Users API works:', usersResponse.data.users?.length || 0, 'users');
        } catch (error) {
            console.log('❌ Users API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 6. Test Auth Profile API
        console.log('\n6️⃣ Testing Auth Profile API...');
        try {
            const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, { headers: authHeaders });
            console.log('✅ Auth Profile API works:', profileResponse.data.user?.username);
        } catch (error) {
            console.log('❌ Auth Profile API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 7. Test Customers API
        console.log('\n7️⃣ Testing Customers API...');
        try {
            const customersResponse = await axios.get(`${BASE_URL}/api/customers`, { headers: authHeaders });
            console.log('✅ Customers API works:', customersResponse.data.length || 0, 'customers');
        } catch (error) {
            console.log('❌ Customers API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 8. Test Suppliers API
        console.log('\n8️⃣ Testing Suppliers API...');
        try {
            const suppliersResponse = await axios.get(`${BASE_URL}/api/suppliers`, { headers: authHeaders });
            console.log('✅ Suppliers API works:', suppliersResponse.data.length || 0, 'suppliers');
        } catch (error) {
            console.log('❌ Suppliers API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 9. Test Sales API
        console.log('\n9️⃣ Testing Sales API...');
        try {
            const salesResponse = await axios.get(`${BASE_URL}/api/sales`, { headers: authHeaders });
            console.log('✅ Sales API works:', salesResponse.data.length || 0, 'sales records');
        } catch (error) {
            console.log('❌ Sales API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 10. Test Inventory API
        console.log('\n🔟 Testing Inventory API...');
        try {
            const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory`, { headers: authHeaders });
            console.log('✅ Inventory API works:', inventoryResponse.data.length || 0, 'inventory items');
        } catch (error) {
            console.log('❌ Inventory API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 11. Test Promotions API
        console.log('\n1️⃣1️⃣ Testing Promotions API...');
        try {
            const promotionsResponse = await axios.get(`${BASE_URL}/api/promotions`, { headers: authHeaders });
            console.log('✅ Promotions API works:', promotionsResponse.data.length || 0, 'promotions');
        } catch (error) {
            console.log('❌ Promotions API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 12. Test Caisse Session API
        console.log('\n1️⃣2️⃣ Testing Caisse Session API...');
        try {
            const caisseResponse = await axios.get(`${BASE_URL}/api/caisse/session`, { headers: authHeaders });
            console.log('✅ Caisse Session API works');
        } catch (error) {
            console.log('❌ Caisse Session API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 13. Test Analytics API
        console.log('\n1️⃣3️⃣ Testing Analytics API...');
        try {
            const analyticsResponse = await axios.get(`${BASE_URL}/api/analytics`, { headers: authHeaders });
            console.log('✅ Analytics API works');
        } catch (error) {
            console.log('❌ Analytics API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 14. Test Reports API
        console.log('\n1️⃣4️⃣ Testing Reports API...');
        try {
            const reportsResponse = await axios.get(`${BASE_URL}/api/reports/summary`, { headers: authHeaders });
            console.log('✅ Reports API works');
        } catch (error) {
            console.log('❌ Reports API failed:', error.response?.status, error.response?.data?.message);
        }
        
        // 15. Test Health Check (no auth required)
        console.log('\n1️⃣5️⃣ Testing Health Check API...');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/health`);
            console.log('✅ Health Check API works:', healthResponse.data.status);
        } catch (error) {
            console.log('❌ Health Check API failed:', error.response?.status, error.response?.data?.message);
        }
        
        console.log('\n🎯 COMPREHENSIVE API TEST COMPLETE!');
        console.log('📱 All critical APIs for mobile app functionality have been tested.');
        
    } catch (error) {
        console.error('❌ Critical error:', error.message);
    }
}

testAllAPIs();