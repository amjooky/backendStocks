const http = require('http');
const { URL } = require('url');

const API_BASE = 'http://localhost:5000/api';
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

let authToken = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const response = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData ? JSON.parse(responseData) : null
                    };
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Error parsing response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test login
async function testLogin() {
    console.log('Testing login...');
    try {
        const response = await makeRequest('POST', '/auth/login', {
            username: TEST_USER.username,
            password: TEST_USER.password
        });

        if (response.statusCode === 200 && response.data.token) {
            authToken = response.data.token;
            console.log('✅ Login successful');
            console.log('   Token:', authToken.substring(0, 20) + '...');
            return true;
        } else {
            console.error('❌ Login failed:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Error during login:', error.message);
        return false;
    }
}

// Test getting products
async function testGetProducts() {
    console.log('\nTesting get products...');
    try {
        const response = await makeRequest('GET', '/products', null, {
            'Authorization': `Bearer ${authToken}`
        });

        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log('✅ Successfully retrieved products');
            console.log(`   Found ${response.data.products.length} products`);
            return true;
        } else {
            console.error('❌ Failed to get products:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Error getting products:', error.message);
        return false;
    }
}

// Test creating a product
async function testCreateProduct() {
    console.log('\nTesting create product...');
    const productData = {
        name: `Test Product ${Date.now()}`,
        sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}`,
        description: 'Test product',
        category_id: 1,
        supplier_id: 1,
        cost_price: 10.99,
        selling_price: 19.99,
        tax_rate: 0.2,
        reorder_point: 10,
        initial_stock: 100,
        unit: 'pcs'
    };

    try {
        const response = await makeRequest(
            'POST', 
            '/products', 
            productData,
            {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        );

        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 201) {
            console.log('✅ Successfully created product');
            console.log('   Product ID:', response.data.id);
            return response.data.id;
        } else {
            console.error('❌ Failed to create product:', response.data);
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating product:', error.message);
        return null;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting API Tests\n');
    
    // 1. Test login
    const loggedIn = await testLogin();
    if (!loggedIn) {
        console.error('❌ Cannot proceed without authentication');
        return;
    }
    
    // 2. Test getting products
    await testGetProducts();
    
    // 3. Test creating a product
    const productId = await testCreateProduct();
    
    if (productId) {
        console.log('\n✅ Basic CRUD operations test completed successfully!');
    } else {
        console.error('\n❌ Some tests failed');
    }
}

// Run the tests
runTests();
