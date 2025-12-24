const axios = require('axios');

const backendUrl = 'https://backend-production-cde7.up.railway.app';

async function testBackendConnection() {
    console.log('🧪 Testing Frontend-Backend Connection...');
    console.log(`🔗 Backend URL: ${backendUrl}`);
    
    try {
        // Test health endpoint
        console.log('\n1. Testing Health Endpoint...');
        const healthResponse = await axios.get(`${backendUrl}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        
        // Test CORS configuration
        console.log('\n2. Testing CORS Configuration...');
        const corsResponse = await axios.get(`${backendUrl}/debug/cors-info`);
        console.log('✅ CORS Info:', {
            corsMode: corsResponse.data.server.corsMode,
            environment: corsResponse.data.server.environment
        });
        
        // Test API endpoint (categories - should work without auth)
        console.log('\n3. Testing API Endpoints (Categories)...');
        try {
            const categoriesResponse = await axios.get(`${backendUrl}/api/categories`);
            console.log('✅ Categories API:', `${categoriesResponse.data.categories?.length || 0} categories found`);
        } catch (apiError) {
            if (apiError.response?.status === 401) {
                console.log('⚠️  Categories API: Authentication required (expected)');
            } else {
                console.log('❌ Categories API Error:', apiError.response?.data?.message || apiError.message);
            }
        }
        
        // Test database status
        console.log('\n4. Testing Database Status...');
        const dbResponse = await axios.get(`${backendUrl}/debug/db-status`);
        console.log('✅ Database Status:', {
            userCount: dbResponse.data.userCount,
            adminCount: dbResponse.data.adminCount,
            tablesCount: dbResponse.data.tables?.length || 0
        });
        
        console.log('\n🎉 Backend Connection Test SUCCESSFUL!');
        console.log('✅ Frontend can successfully communicate with the deployed backend');
        
    } catch (error) {
        console.error('\n❌ Backend Connection Test FAILED!');
        console.error('Error:', error.response?.data?.message || error.message);
        console.error('Status:', error.response?.status);
        console.error('URL:', error.config?.url);
    }
}

// Run the test
testBackendConnection();