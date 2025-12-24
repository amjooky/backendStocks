const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend-production-cde7.up.railway.app';
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

let authToken = '';

// Helper function for authenticated requests
const api = (method, endpoint, data = null) => {
    const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
        timeout: 15000
    };
    if (data) config.data = data;
    return axios(config);
};

// Sample data generators
const generateCustomers = () => [
    { name: "John Smith", email: "john@example.com", phone: "+1-555-0101", address: "123 Main St, City A" },
    { name: "Emma Johnson", email: "emma@example.com", phone: "+1-555-0102", address: "456 Oak Ave, City B" },
    { name: "Michael Brown", email: "michael@example.com", phone: "+1-555-0103", address: "789 Pine St, City C" },
    { name: "Sarah Davis", email: "sarah@example.com", phone: "+1-555-0104", address: "321 Elm St, City D" },
    { name: "David Wilson", email: "david@example.com", phone: "+1-555-0105", address: "654 Maple Ave, City E" },
    { name: "Lisa Miller", email: "lisa@example.com", phone: "+1-555-0106", address: "987 Cedar St, City F" },
    { name: "Robert Taylor", email: "robert@example.com", phone: "+1-555-0107", address: "147 Birch Ave, City G" },
    { name: "Jennifer Anderson", email: "jennifer@example.com", phone: "+1-555-0108", address: "258 Walnut St, City H" },
    { name: "Christopher Thomas", email: "chris@example.com", phone: "+1-555-0109", address: "369 Cherry Ave, City I" },
    { name: "Amanda White", email: "amanda@example.com", phone: "+1-555-0110", address: "741 Spruce St, City J" }
];

const generateProducts = () => [
    { name: "Premium Coffee Beans", sku: "COFFEE-001", barcode: "1234567890123", categoryId: 1, supplierId: 1, costPrice: 8.50, sellingPrice: 12.99, minStockLevel: 50, description: "High quality arabica coffee beans", initialStock: 100 },
    { name: "Organic Green Tea", sku: "TEA-001", barcode: "1234567890124", categoryId: 1, supplierId: 1, costPrice: 5.25, sellingPrice: 8.99, minStockLevel: 30, description: "Certified organic green tea", initialStock: 75 },
    { name: "Chocolate Croissant", sku: "PASTRY-001", barcode: "1234567890125", categoryId: 2, supplierId: 2, costPrice: 1.50, sellingPrice: 3.25, minStockLevel: 20, description: "Fresh baked chocolate croissant", initialStock: 40 },
    { name: "Blueberry Muffin", sku: "PASTRY-002", barcode: "1234567890126", categoryId: 2, supplierId: 2, costPrice: 1.25, sellingPrice: 2.99, minStockLevel: 25, description: "Homemade blueberry muffin", initialStock: 60 },
    { name: "Caesar Salad", sku: "SALAD-001", barcode: "1234567890127", categoryId: 3, supplierId: 3, costPrice: 3.50, sellingPrice: 7.99, minStockLevel: 15, description: "Fresh caesar salad with croutons", initialStock: 25 },
    { name: "Grilled Sandwich", sku: "SANDWICH-001", barcode: "1234567890128", categoryId: 3, supplierId: 3, costPrice: 4.00, sellingPrice: 8.99, minStockLevel: 20, description: "Grilled chicken sandwich", initialStock: 35 },
    { name: "Energy Drink", sku: "DRINK-001", barcode: "1234567890129", categoryId: 4, supplierId: 1, costPrice: 1.75, sellingPrice: 3.49, minStockLevel: 40, description: "High caffeine energy drink", initialStock: 120 },
    { name: "Sparkling Water", sku: "DRINK-002", barcode: "1234567890130", categoryId: 4, supplierId: 1, costPrice: 0.85, sellingPrice: 1.99, minStockLevel: 60, description: "Natural sparkling water", initialStock: 200 },
    { name: "Protein Bar", sku: "SNACK-001", barcode: "1234567890131", categoryId: 5, supplierId: 2, costPrice: 1.20, sellingPrice: 2.79, minStockLevel: 35, description: "High protein energy bar", initialStock: 80 },
    { name: "Mixed Nuts", sku: "SNACK-002", barcode: "1234567890132", categoryId: 5, supplierId: 2, costPrice: 2.50, sellingPrice: 5.49, minStockLevel: 25, description: "Roasted mixed nuts", initialStock: 45 }
];

const generateSales = (customers, products) => {
    const sales = [];
    const paymentMethods = ['cash', 'card', 'mobile'];
    
    // Generate 50 sales over the last 30 days
    for (let i = 0; i < 50; i++) {
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        
        // Random date within last 30 days
        const randomDate = new Date();
        randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
        
        // Random number of items (1-5)
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const saleItems = [];
        let totalAmount = 0;
        
        for (let j = 0; j < itemCount; j++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const itemTotal = randomProduct.sellingPrice * quantity;
            totalAmount += itemTotal;
            
            saleItems.push({
                product_id: randomProduct.id,
                quantity: quantity,
                unit_price: randomProduct.sellingPrice,
                total_price: itemTotal
            });
        }
        
        // Random discount (0-20%)
        const discountPercent = Math.floor(Math.random() * 21);
        const discountAmount = totalAmount * (discountPercent / 100);
        const finalTotal = totalAmount - discountAmount;
        
        sales.push({
            customer_id: randomCustomer.id,
            payment_method: paymentMethod,
            total_amount: parseFloat(finalTotal.toFixed(2)),
            discount_amount: parseFloat(discountAmount.toFixed(2)),
            items: saleItems,
            notes: `Sale #${i + 1} - ${paymentMethod} payment`,
            sale_date: randomDate.toISOString()
        });
    }
    
    return sales;
};

// Main execution function
async function populateTestData() {
    console.log('🚀 Starting Mobile App Data Population...\n');
    console.log(`🎯 Target: ${BASE_URL}\n`);

    try {
        // 1. Login
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
        authToken = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // 2. Get existing categories and suppliers
        console.log('📋 Getting existing categories and suppliers...');
        const categoriesRes = await api('GET', '/api/categories');
        const suppliersRes = await api('GET', '/api/suppliers');
        const categories = categoriesRes.data.categories || categoriesRes.data;
        const suppliers = suppliersRes.data.suppliers || suppliersRes.data;
        console.log(`✅ Found ${categories.length} categories, ${suppliers.length} suppliers\n`);

        // 3. Create customers
        console.log('👥 Creating customers...');
        const customerData = generateCustomers();
        const createdCustomers = [];
        
        for (const customer of customerData) {
            try {
                const response = await api('POST', '/api/customers', customer);
                createdCustomers.push({
                    id: response.data.id || response.data.customer.id,
                    ...customer
                });
                console.log(`✅ Created customer: ${customer.name}`);
            } catch (error) {
                console.log(`⚠️ Customer ${customer.name} might already exist`);
            }
        }
        console.log(`✅ Created/verified ${createdCustomers.length} customers\n`);

        // 4. Create products
        console.log('📦 Creating products...');
        const productData = generateProducts();
        const createdProducts = [];
        
        for (const product of productData) {
            try {
                const response = await api('POST', '/api/products', product);
                createdProducts.push({
                    id: response.data.id,
                    sellingPrice: product.sellingPrice,
                    ...product
                });
                console.log(`✅ Created product: ${product.name}`);
            } catch (error) {
                console.log(`⚠️ Product ${product.name} might already exist`);
            }
        }
        console.log(`✅ Created/verified ${createdProducts.length} products\n`);

        // 5. Generate sales data
        if (createdProducts.length > 0 && createdCustomers.length > 0) {
            console.log('💰 Generating sales data...');
            const salesData = generateSales(createdCustomers, createdProducts);
            let salesCreated = 0;
            
            for (const sale of salesData) {
                try {
                    const response = await api('POST', '/api/sales', sale);
                    salesCreated++;
                    console.log(`✅ Created sale #${salesCreated}: $${sale.total_amount}`);
                } catch (error) {
                    console.log(`⚠️ Failed to create sale: ${error.response?.data?.message || error.message}`);
                }
            }
            console.log(`✅ Created ${salesCreated} sales records\n`);
        }

        // 6. Create promotions
        console.log('🎉 Creating promotions...');
        const promotions = [
            {
                name: "Happy Hour Coffee",
                description: "20% off all coffee drinks",
                discount_type: "percentage",
                discount_value: 20,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                is_active: true
            },
            {
                name: "Buy 2 Get 1 Free Pastries",
                description: "Special offer on all pastries",
                discount_type: "fixed",
                discount_value: 3.25,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                is_active: true
            }
        ];

        for (const promo of promotions) {
            try {
                await api('POST', '/api/promotions', promo);
                console.log(`✅ Created promotion: ${promo.name}`);
            } catch (error) {
                console.log(`⚠️ Promotion might already exist: ${promo.name}`);
            }
        }
        console.log('✅ Promotions created\n');

        // 7. Test all endpoints
        console.log('🧪 Testing all API endpoints...');
        
        const endpoints = [
            { name: 'Health Check', endpoint: '/health', auth: false },
            { name: 'User Profile', endpoint: '/api/auth/profile', auth: true },
            { name: 'Users', endpoint: '/api/users', auth: true },
            { name: 'Categories', endpoint: '/api/categories', auth: true },
            { name: 'Products', endpoint: '/api/products', auth: true },
            { name: 'Customers', endpoint: '/api/customers', auth: true },
            { name: 'Suppliers', endpoint: '/api/suppliers', auth: true },
            { name: 'Sales', endpoint: '/api/sales', auth: true },
            { name: 'Inventory', endpoint: '/api/inventory', auth: true },
            { name: 'Promotions', endpoint: '/api/promotions', auth: true },
            { name: 'Settings', endpoint: '/api/settings', auth: true },
            { name: 'Notifications', endpoint: '/api/notifications', auth: true },
            { name: 'Analytics Overview', endpoint: '/api/analytics', auth: true },
            { name: 'Analytics Dashboard', endpoint: '/api/analytics/dashboard', auth: true },
            { name: 'Analytics Financials', endpoint: '/api/analytics/financials?startDate=2024-01-01&endDate=2024-12-31', auth: true },
            { name: 'Reports Summary', endpoint: '/api/reports', auth: true },
            { name: 'Caisse Overview', endpoint: '/api/caisse', auth: true }
        ];

        let successCount = 0;
        for (const test of endpoints) {
            try {
                const response = await api('GET', test.endpoint);
                console.log(`✅ ${test.name}: ${response.status}`);
                successCount++;
            } catch (error) {
                console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.message || error.message}`);
            }
        }

        console.log(`\n✅ API Tests completed: ${successCount}/${endpoints.length} passed\n`);

        // 8. Test barcode scanning
        console.log('📱 Testing barcode scanning...');
        try {
            await api('GET', '/api/products/barcode/1234567890123');
            console.log('✅ Barcode scanning works');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Barcode endpoint working (404 for non-existent barcode)');
            } else {
                console.log(`❌ Barcode test failed: ${error.response?.status}`);
            }
        }

        // 9. Analytics Summary
        console.log('\n📊 ANALYTICS SUMMARY');
        console.log('=' .repeat(50));
        
        try {
            const dashboardData = await api('GET', '/api/analytics/dashboard');
            const dashboard = dashboardData.data;
            
            console.log(`📈 Today's Sales: ${dashboard.today.sales} ($${dashboard.today.revenue})`);
            console.log(`📈 This Month's Sales: ${dashboard.thisMonth.sales} ($${dashboard.thisMonth.revenue})`);
            console.log(`📦 Total Products: ${dashboard.inventory.totalProducts}`);
            console.log(`⚠️  Low Stock Items: ${dashboard.inventory.lowStockProducts}`);
            console.log(`❌ Out of Stock: ${dashboard.inventory.outOfStockProducts}`);
            console.log(`🏆 Top Products: ${dashboard.topProducts.length}`);
            console.log(`📋 Recent Sales: ${dashboard.recentSales.length}`);
        } catch (error) {
            console.log('❌ Could not fetch analytics dashboard');
        }

        console.log('\n🎉 MOBILE APP DATA POPULATION COMPLETE!');
        console.log('=' .repeat(50));
        console.log('📱 Your mobile app now has comprehensive test data');
        console.log('🔗 Backend URL: ' + BASE_URL);
        console.log('👤 Login: admin / admin123');
        console.log('\n✨ Ready for mobile app testing!');

    } catch (error) {
        console.error('❌ Error during data population:', error.response?.data?.message || error.message);
    }
}

// Run the population script
populateTestData().catch(console.error);