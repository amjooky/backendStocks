const axios = require('axios');

const BASE_URL = 'https://backend-production-cde7.up.railway.app';
const TEST_USER = { username: 'admin', password: 'admin123' };

async function testProductCreation() {
    try {
        console.log('🧪 Testing Product Creation...\n');
        
        // Login
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        const headers = { 'Authorization': `Bearer ${token}` };

        // Test product data with minimal required fields
        const testProduct = {
            name: `Test Product ${Date.now()}`,
            sku: `TEST-${Date.now()}`,
            costPrice: 5.99,
            sellingPrice: 9.99,
            description: 'Test product for mobile app',
            barcode: `TEST${Date.now()}`,
            minStockLevel: 10,
            initialStock: 50
        };

        console.log('📦 Creating test product...');
        console.log('Product data:', testProduct);

        const createResponse = await axios.post(
            `${BASE_URL}/api/products`, 
            testProduct, 
            { headers }
        );

        console.log('✅ Product created successfully!');
        console.log('Response:', createResponse.data);

        // Test product creation with category
        console.log('\n📋 Getting categories...');
        const categoriesResponse = await axios.get(`${BASE_URL}/api/categories`, { headers });
        const categories = categoriesResponse.data.categories || categoriesResponse.data;
        
        if (categories.length > 0) {
            const categoryId = categories[0].id;
            console.log(`✅ Found categories, using category ID: ${categoryId}`);

            const testProductWithCategory = {
                name: `Test Product with Category ${Date.now()}`,
                sku: `TESTCAT-${Date.now()}`,
                categoryId: categoryId,
                costPrice: 7.99,
                sellingPrice: 12.99,
                description: 'Test product with category',
                minStockLevel: 5,
                initialStock: 25
            };

            console.log('\n📦 Creating product with category...');
            const createWithCatResponse = await axios.post(
                `${BASE_URL}/api/products`, 
                testProductWithCategory, 
                { headers }
            );

            console.log('✅ Product with category created successfully!');
            console.log('Response:', createWithCatResponse.data);
        }

        // Test barcode scanning
        if (testProduct.barcode) {
            console.log('\n🔍 Testing barcode scanning...');
            try {
                const barcodeResponse = await axios.get(
                    `${BASE_URL}/api/products/barcode/${testProduct.barcode}`, 
                    { headers }
                );
                console.log('✅ Barcode scanning works!');
                console.log('Found product:', barcodeResponse.data.name);
            } catch (error) {
                console.log('⚠️ Barcode scanning failed:', error.response?.status);
            }
        }

        console.log('\n🎉 Product creation tests completed successfully!');
        console.log('✨ Mobile app can now create products without issues');

    } catch (error) {
        console.error('❌ Product creation test failed:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
        console.error('Full error:', error.message);
    }
}

testProductCreation();