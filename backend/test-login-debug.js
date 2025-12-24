const axios = require('axios');

async function testLogin() {
    console.log('🔐 Testing login with detailed debugging...');
    
    try {
        const response = await axios.post('https://backend-production-cde7.up.railway.app/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: () => true // Don't throw on any status code
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        
        if (response.status === 200) {
            console.log('✅ LOGIN SUCCESSFUL!');
            return true;
        } else {
            console.log('❌ LOGIN FAILED with status:', response.status);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return false;
    }
}

testLogin();