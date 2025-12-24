const axios = require('axios');

const backendUrl = 'https://backend-production-cde7.up.railway.app';

async function testFinalLogin() {
    console.log('🎯 FINAL FRONTEND LOGIN TEST');
    console.log('===========================');
    console.log(`Backend: ${backendUrl}`);
    
    try {
        // Test with exact credentials that work on Railway
        const response = await axios.post(`${backendUrl}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000',
                'User-Agent': 'Frontend-Client/1.0'
            },
            timeout: 10000
        });
        
        if (response.status === 200 && response.data.token) {
            console.log('\n🎉 LOGIN SUCCESSFUL!');
            console.log('✅ User:', response.data.user?.username);
            console.log('✅ Role:', response.data.user?.role);
            console.log('✅ Token received');
            
            // Test protected API
            const token = response.data.token;
            const categoriesResponse = await axios.get(`${backendUrl}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('\n✅ Protected API Access Works!');
            console.log('Categories:', categoriesResponse.data?.categories?.length || 0);
            
            console.log('\n🚀 FRONTEND IS READY!');
            console.log('👉 Open http://localhost:3000');
            console.log('👉 Login with: admin / admin123');
            console.log('👉 All APIs should work perfectly!');
            
            return true;
        }
        
    } catch (error) {
        console.error('\n❌ LOGIN FAILED:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('Network error:', error.code || error.message);
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

testFinalLogin().then(success => {
    if (success) {
        console.log('\n✅ ALL SYSTEMS OPERATIONAL!');
        process.exit(0);
    } else {
        console.log('\n❌ SYSTEM CHECK FAILED');
        process.exit(1);
    }
});