const axios = require('axios');
const fs = require('fs');

async function testLogin() {
    try {
        console.log('Testing login endpoint...');
        
        // Test with correct credentials
        console.log('\n1. Testing with correct credentials (admin/admin123)...');
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                username: 'admin',
                password: 'admin123'
            });
            console.log('✅ Login successful!');
            console.log('Response:', {
                status: response.status,
                data: {
                    ...response.data,
                    token: response.data.token ? '***TOKEN_RECEIVED***' : 'NO_TOKEN'
                }
            });
        } catch (error) {
            console.error('❌ Login failed with correct credentials:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        }

        // Test with incorrect credentials
        console.log('\n2. Testing with incorrect credentials...');
        try {
            await axios.post('http://localhost:5000/api/auth/login', {
                username: 'admin',
                password: 'wrongpassword'
            });
        } catch (error) {
            console.log('✅ Expected failure with incorrect credentials:', {
                status: error.response.status,
                data: error.response.data
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLogin();
