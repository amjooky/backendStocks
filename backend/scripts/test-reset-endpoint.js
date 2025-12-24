const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000';

async function testResetEndpoint() {
    try {
        console.log('🧪 Testing Database Reset Endpoint...');
        console.log(`📡 URL: ${BASE_URL}/api/admin/reset-database`);

        // 1. Test with invalid confirmation
        try {
            console.log('\n❌ Case 1: Testing invalid confirmation...');
            await axios.post(`${BASE_URL}/api/admin/reset-database`, {
                confirmReset: 'WRONG_TOKEN'
            });
            console.error('FAILED: Should have rejected invalid token');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Success: Invalid token rejected correctly');
            } else {
                console.error('FAILED: Unexpected error for invalid token', error.message);
            }
        }

        // 2. Test with valid confirmation
        console.log('\n✅ Case 2: Testing valid confirmation...');
        const response = await axios.post(`${BASE_URL}/api/admin/reset-database`, {
            confirmReset: 'YES_RESET_ALL_DATA'
        });

        if (response.status === 200) {
            console.log('✅ Success: Database reset request accepted');
            console.log('Response:', response.data);
        } else {
            console.error('FAILED: Update failed', response.status, response.data);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testResetEndpoint();
