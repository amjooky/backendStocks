// Test script to create demo users with the same company ID
// Run this with: node create-test-users.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const testUsers = [
    {
        email: 'alice@webnexus.com',
        companyId: 'WEBNEXUS',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'intern',
        department: 'Engineering'
    },
    {
        email: 'bob@webnexus.com',
        companyId: 'WEBNEXUS',
        password: 'password123',
        firstName: 'Bob',
        lastName: 'Johnson',
        role: 'intern',
        department: 'Marketing'
    },
    {
        email: 'charlie@webnexus.com',
        companyId: 'WEBNEXUS',
        password: 'password123',
        firstName: 'Charlie',
        lastName: 'Wilson',
        role: 'supervisor',
        department: 'Engineering'
    }
];

async function createTestUsers() {
    console.log('🧪 Creating test users...\n');

    for (const userData of testUsers) {
        try {
            console.log(`Creating user: ${userData.firstName} ${userData.lastName} (${userData.email})`);
            
            const response = await axios.post(`${BASE_URL}/auth/register`, userData);
            
            if (response.status === 201) {
                console.log(`✅ Successfully created ${userData.firstName} ${userData.lastName}`);
                console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
                console.log(`   User ID: ${response.data.user._id || response.data.user.id}`);
            }
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
                console.log(`⚠️  User ${userData.firstName} ${userData.lastName} already exists`);
            } else {
                console.error(`❌ Failed to create ${userData.firstName} ${userData.lastName}:`);
                console.error(`   Status: ${error.response?.status}`);
                console.error(`   Message: ${error.response?.data?.message || error.message}`);
            }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📋 Test users summary:');
    console.log('Company: WEBNEXUS');
    console.log('Users: Alice Smith, Bob Johnson, Charlie Wilson');
    console.log('Password for all: password123');
    console.log('\nNow you can:');
    console.log('1. Login with any user at http://localhost:3001/login');
    console.log('2. Test the company colleagues feature');
    console.log('3. Create company chats');
    console.log('4. Test logout functionality');
}

async function testLogin(email, password) {
    try {
        console.log(`\n🔐 Testing login for ${email}...`);
        
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            identifier: email,
            password: password
        });

        if (response.status === 200) {
            console.log(`✅ Login successful for ${email}`);
            console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
            
            // Test colleagues API
            try {
                const colleaguesResponse = await axios.get(`${BASE_URL}/users/company/colleagues`, {
                    headers: {
                        'Authorization': `Bearer ${response.data.token}`
                    }
                });
                
                console.log(`✅ Colleagues API working - Found ${colleaguesResponse.data.colleagues?.length || 0} colleagues`);
            } catch (error) {
                console.error(`❌ Colleagues API failed: ${error.response?.data?.message || error.message}`);
            }
        }
        
        return response.data.token;
    } catch (error) {
        console.error(`❌ Login failed for ${email}:`);
        console.error(`   Status: ${error.response?.status}`);
        console.error(`   Message: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function runTests() {
    console.log('🚀 Starting comprehensive test...\n');

    // Step 1: Create users
    await createTestUsers();

    // Step 2: Test login and colleagues API
    await testLogin('alice@webnexus.com', 'password123');
    await testLogin('bob@webnexus.com', 'password123');

    console.log('\n✅ Tests completed!');
}

// Run if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { createTestUsers, testLogin };