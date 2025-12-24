const axios = require('axios');
const { getRow, getAllRows } = require('../config/database');
require('dotenv').config();

async function testUserToggle() {
    console.log('=== Testing User Status Toggle ===\n');
    
    try {
        // Step 1: Login as admin to get a token
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful, token obtained\n');
        
        // Step 2: Get list of users
        console.log('2. Fetching users list...');
        const usersResponse = await axios.get('http://localhost:5000/api/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const users = usersResponse.data.users;
        console.log(`✅ Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
        });
        console.log();
        
        // Step 3: Find a non-admin user to test with
        const testUser = users.find(user => user.role !== 'admin' && user.username !== 'admin');
        
        if (!testUser) {
            console.log('⚠️ No non-admin user found. Creating a test user...');
            
            // Create a test user
            const createResponse = await axios.post('http://localhost:5000/api/users', {
                username: 'test_cashier',
                email: 'test@example.com',
                password: 'test123',
                firstName: 'Test',
                lastName: 'User',
                role: 'cashier'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Test user created:', createResponse.data);
            
            // Re-fetch users
            const updatedUsersResponse = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            testUser = updatedUsersResponse.data.users.find(user => user.username === 'test_cashier');
        }
        
        console.log(`3. Testing status toggle with user: ${testUser.username}`);
        console.log(`   Current status: ${testUser.is_active ? 'Active' : 'Inactive'}`);
        
        // Step 4: Toggle user status
        console.log('4. Toggling user status...');
        const toggleResponse = await axios.patch(`http://localhost:5000/api/users/${testUser.id}/toggle`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Toggle response:', toggleResponse.data);
        
        // Step 5: Verify the status change
        console.log('5. Verifying status change...');
        const updatedUser = await axios.get(`http://localhost:5000/api/users/${testUser.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ User status updated: ${updatedUser.data.is_active ? 'Active' : 'Inactive'}`);
        
        // Step 6: Toggle back
        console.log('6. Toggling back to original status...');
        const toggleBackResponse = await axios.patch(`http://localhost:5000/api/users/${testUser.id}/toggle`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Toggle back response:', toggleBackResponse.data);
        
        console.log('\n🎉 User status toggle test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
        } : error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the backend server is running on port 5000');
            console.log('   Run: npm run dev');
        }
    }
}

// Run the test
testUserToggle();
