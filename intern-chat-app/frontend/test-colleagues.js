// Simple test script to check if the company colleagues API is working
// Run this with: node test-colleagues.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testColleaguesAPI() {
    console.log('🔍 Testing Company Colleagues API...\n');

    try {
        // First, let's check if we can reach the server
        console.log('1. Testing server connection...');
        const healthCheck = await axios.get(BASE_URL + '/health').catch(() => null);
        if (!healthCheck) {
            console.log('❌ Cannot reach server at http://localhost:5000');
            console.log('   Make sure the backend is running with: npm start');
            return;
        }
        console.log('✅ Server is running');

        // Test with a dummy token (this will fail but show us if the route exists)
        console.log('\n2. Testing colleagues endpoint...');
        try {
            await axios.get(BASE_URL + '/users/company/colleagues', {
                headers: {
                    'Authorization': 'Bearer dummy-token'
                }
            });
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401) {
                    console.log('✅ Colleagues endpoint exists (returned 401 - needs auth)');
                    console.log('   Status:', error.response.status);
                    console.log('   Message:', error.response.data?.message || 'Unauthorized');
                } else if (error.response.status === 404) {
                    console.log('❌ Colleagues endpoint not found (404)');
                    console.log('   The route /api/users/company/colleagues does not exist');
                } else {
                    console.log('⚠️  Unexpected response:', error.response.status, error.response.data?.message);
                }
            } else {
                console.log('❌ Network error:', error.message);
            }
        }

        // Let's also check what routes are available
        console.log('\n3. Testing user routes...');
        try {
            await axios.get(BASE_URL + '/users', {
                headers: {
                    'Authorization': 'Bearer dummy-token'
                }
            });
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ User routes are working');
            } else if (error.response?.status === 404) {
                console.log('❌ User routes not found');
            }
        }

        console.log('\n📋 Next steps:');
        console.log('1. Make sure you have users with the same companyId in your database');
        console.log('2. Login to get a valid token');
        console.log('3. Use that token to test the colleagues endpoint');
        console.log('4. Check browser console for any frontend errors');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    testColleaguesAPI();
}

module.exports = { testColleaguesAPI };