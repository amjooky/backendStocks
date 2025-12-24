const axios = require('axios');

const backendUrl = 'https://backend-production-cde7.up.railway.app';

async function testAdminLogin() {
    console.log('🔐 Testing Admin Login...');
    console.log(`🔗 Backend URL: ${backendUrl}`);
    
    try {
        // Test login with the default admin credentials
        const loginResponse = await axios.post(`${backendUrl}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            }
        });
        
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('User:', loginResponse.data.user);
        console.log('Token received:', !!loginResponse.data.token);
        
        // Test protected API with token
        const token = loginResponse.data.token;
        console.log('\n🔒 Testing Protected API Access...');
        
        const categoriesResponse = await axios.get(`${backendUrl}/api/categories`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Categories API Access Successful!');
        console.log('Categories:', categoriesResponse.data.categories?.length || 0, 'items');
        
        // Test products API
        const productsResponse = await axios.get(`${backendUrl}/api/products`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Products API Access Successful!');
        console.log('Products:', productsResponse.data.products?.length || 0, 'items');
        
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('✅ Login works with admin/admin123');
        console.log('✅ Token authentication works');
        console.log('✅ Protected APIs are accessible');
        
        return { success: true, token, user: loginResponse.data.user };
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        return { success: false, error };
    }
}

testAdminLogin();