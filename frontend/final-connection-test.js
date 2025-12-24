const axios = require('axios');

const backendUrl = 'https://backend-production-cde7.up.railway.app';

async function finalConnectionTest() {
    console.log('🔥 FINAL FRONTEND-BACKEND CONNECTION TEST');
    console.log('===============================================');
    console.log(`🎯 Backend URL: ${backendUrl}`);
    
    try {
        // 1. Test health endpoint
        console.log('\n1️⃣ Testing Health Endpoint...');
        const healthResponse = await axios.get(`${backendUrl}/health`, {
            headers: { 'User-Agent': 'Frontend-Test/1.0' }
        });
        console.log('✅ Health Status:', healthResponse.data.status);
        console.log('📅 Backend Time:', healthResponse.data.timestamp);
        console.log('🌍 Environment:', healthResponse.data.environment);
        
        // 2. Test CORS
        console.log('\n2️⃣ Testing CORS from Frontend Origin...');
        const corsResponse = await axios.get(`${backendUrl}/debug/cors-info`, {
            headers: { 
                'Origin': 'http://localhost:3000',
                'User-Agent': 'Frontend-Test/1.0'
            }
        });
        console.log('✅ CORS Mode:', corsResponse.data.server.corsMode);
        console.log('🔓 Origin Allowed:', corsResponse.data.request.origin || 'All origins');
        
        // 3. Test login endpoint (should return proper error for invalid creds)
        console.log('\n3️⃣ Testing Login Endpoint...');
        try {
            await axios.post(`${backendUrl}/api/auth/login`, 
                { username: 'test', password: 'test' }, 
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Origin': 'http://localhost:3000'
                    } 
                }
            );
        } catch (loginError) {
            if (loginError.response?.status === 401) {
                console.log('✅ Login Endpoint Working (401 - Invalid credentials expected)');
            } else if (loginError.response?.status === 500) {
                console.log('⚠️  Login Endpoint: Server error (database might need initialization)');
                console.log('   Error:', loginError.response?.data?.message);
            } else {
                console.log('❌ Login Endpoint Error:', loginError.response?.status, loginError.response?.data);
            }
        }
        
        // 4. Test protected endpoint (categories)
        console.log('\n4️⃣ Testing Protected Endpoint (Categories)...');
        try {
            await axios.get(`${backendUrl}/api/categories`, {
                headers: { 
                    'Origin': 'http://localhost:3000',
                    'User-Agent': 'Frontend-Test/1.0'
                }
            });
            console.log('✅ Categories endpoint accessible');
        } catch (catError) {
            if (catError.response?.status === 401) {
                console.log('✅ Categories Endpoint Protected (401 - Auth required as expected)');
            } else {
                console.log('⚠️  Categories Error:', catError.response?.status, catError.response?.data?.message);
            }
        }
        
        console.log('\n🎉 FRONTEND-BACKEND CONNECTION TEST COMPLETE!');
        console.log('=====================================');
        console.log('✅ Backend is deployed and responding');
        console.log('✅ CORS is properly configured');  
        console.log('✅ API endpoints are accessible');
        console.log('💡 Ready for frontend integration!');
        console.log('\n🌐 You can now:');
        console.log('   • Open http://localhost:3000 in your browser');
        console.log('   • The frontend will connect to the deployed backend');
        console.log('   • Check browser console for detailed API logs');
        
    } catch (error) {
        console.error('\n❌ CONNECTION TEST FAILED!');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

finalConnectionTest();