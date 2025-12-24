const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

let authToken = '';
const testProduct = {
    name: `Test Product ${uuidv4().substring(0, 8)}`,
    sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}`,
    barcode: `BC-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    description: 'Test product for CRUD operations',
    category_id: 1, // Assuming category with ID 1 exists
    supplier_id: 1, // Assuming supplier with ID 1 exists
    cost_price: 10.99,
    selling_price: 19.99,
    tax_rate: 0.2,
    reorder_point: 10,
    initial_stock: 100,
    unit: 'pcs'
};

// Helper function to make authenticated requests
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add response interceptor to handle errors
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            console.error('API Error:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url,
                method: error.config.method
            });
        } else {
            console.error('Request Error:', error.message);
        }
        return Promise.reject(error);
    }
);

// Test suite
async function runTests() {
    try {
        console.log('🚀 Starting Product CRUD Tests\n');

        // 1. Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await api.post('/auth/login', {
            username: ADMIN_CREDENTIALS.username,
            password: ADMIN_CREDENTIALS.password
        });
        
        authToken = loginResponse.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        console.log('✅ Login successful\n');

        // 2. Create a new product
        console.log('2. Creating a new product...');
        const createResponse = await api.post('/products', testProduct);
        const createdProduct = createResponse.data;
        console.log('✅ Product created:', {
            id: createdProduct.id,
            name: createdProduct.name,
            sku: createdProduct.sku,
            stock: createdProduct.stock_quantity
        });

        // 3. Get the created product
        console.log('\n3. Getting the created product...');
        const getResponse = await api.get(`/products/${createdProduct.id}`);
        const fetchedProduct = getResponse.data;
        console.log('✅ Product retrieved:', {
            id: fetchedProduct.id,
            name: fetchedProduct.name,
            sku: fetchedProduct.sku,
            stock: fetchedProduct.stock_quantity
        });

        // 4. Update the product
        console.log('\n4. Updating the product...');
        const updatedData = {
            ...testProduct,
            name: `${testProduct.name} - UPDATED`,
            selling_price: 24.99,
            description: 'Updated description'
        };
        
        const updateResponse = await api.put(`/products/${createdProduct.id}`, updatedData);
        const updatedProduct = updateResponse.data;
        console.log('✅ Product updated:', {
            name: updatedProduct.name,
            price: updatedProduct.selling_price,
            description: updatedProduct.description
        });

        // 5. Test inventory operations
        console.log('\n5. Testing inventory operations...');
        
        // 5.1 Add stock
        const addStockResponse = await api.post(`/inventory/${createdProduct.id}/adjust`, {
            quantity: 50,
            type: 'in',
            reason: 'Initial stock addition',
            reference: 'TEST-001'
        });
        console.log('✅ Stock added:', {
            newQuantity: addStockResponse.data.new_quantity,
            movementId: addStockResponse.data.movement_id
        });

        // 5.2 Remove stock
        const removeStockResponse = await api.post(`/inventory/${createdProduct.id}/adjust`, {
            quantity: 10,
            type: 'out',
            reason: 'Test sale',
            reference: 'SALE-001'
        });
        console.log('✅ Stock removed:', {
            newQuantity: removeStockResponse.data.new_quantity,
            movementId: removeStockResponse.data.movement_id
        });

        // 6. Get product inventory history
        console.log('\n6. Getting inventory history...');
        const historyResponse = await api.get(`/inventory/${createdProduct.id}/history`);
        console.log(`✅ Retrieved ${historyResponse.data.length} inventory movements`);

        // 7. Search for products
        console.log('\n7. Searching for products...');
        const searchTerm = testProduct.name.split(' ')[0];
        const searchResponse = await api.get(`/products/search/${searchTerm}`);
        console.log(`✅ Found ${searchResponse.data.length} matching products`);

        // 8. List all products with pagination
        console.log('\n8. Listing products with pagination...');
        const listResponse = await api.get('/products?page=1&limit=5');
        console.log(`✅ Retrieved page 1 with ${listResponse.data.products.length} products`);
        console.log('   Total products:', listResponse.data.pagination.total);

        // 9. Delete the test product (soft delete)
        console.log('\n9. Deleting the test product...');
        await api.delete(`/products/${createdProduct.id}`);
        console.log('✅ Product marked as deleted');

        // 10. Verify soft delete
        console.log('\n10. Verifying soft delete...');
        try {
            await api.get(`/products/${createdProduct.id}`);
            console.error('❌ Product should not be accessible after deletion');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('✅ Product is no longer accessible (soft delete working)');
            } else {
                throw error;
            }
        }

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests();
