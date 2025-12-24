const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend-production-cde7.up.railway.app';
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

let authToken = '';

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

async function createSalesData() {
    console.log('💰 Creating Sales Data for Mobile App Testing...\n');
    
    try {
        // Login
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
        authToken = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Get customers and products
        console.log('📋 Getting customers and products...');
        const customersRes = await api('GET', '/api/customers');
        const productsRes = await api('GET', '/api/products');
        
        const customers = customersRes.data;
        const products = productsRes.data.products || productsRes.data;
        
        console.log(`✅ Found ${customers.length} customers, ${products.length} products\n`);

        if (products.length === 0 || customers.length === 0) {
            console.log('❌ Need products and customers to create sales data');
            return;
        }

        // Create 20 sales with proper format
        console.log('🛒 Creating sales transactions...');
        let salesCreated = 0;
        
        for (let i = 0; i < 20; i++) {
            try {
                // Random customer
                const customer = customers[Math.floor(Math.random() * customers.length)];
                
                // Random 1-3 products
                const itemCount = Math.floor(Math.random() * 3) + 1;
                const saleItems = [];
                
                for (let j = 0; j < itemCount; j++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const quantity = Math.floor(Math.random() * 3) + 1;
                    
                    saleItems.push({
                        productId: product.id,
                        quantity: quantity,
                        unitPrice: product.selling_price || product.price || 5.99,
                        discountAmount: 0
                    });
                }
                
                const paymentMethods = ['cash', 'card', 'mobile'];
                const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                
                const saleData = {
                    items: saleItems,
                    customerId: customer.id,
                    paymentMethod: paymentMethod,
                    notes: `Test sale #${i + 1} via ${paymentMethod}`
                };
                
                const response = await api('POST', '/api/sales', saleData);
                salesCreated++;
                
                const total = saleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
                console.log(`✅ Sale #${salesCreated}: $${total.toFixed(2)} (${paymentMethod})`);
                
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.log(`⚠️ Failed to create sale #${i + 1}: ${error.response?.data?.message || error.message}`);
            }
        }
        
        console.log(`\n✅ Created ${salesCreated}/20 sales transactions\n`);
        
        // Test analytics after adding sales
        console.log('📊 Testing Analytics with New Sales Data...');
        try {
            const dashboardData = await api('GET', '/api/analytics/dashboard');
            const dashboard = dashboardData.data;
            
            console.log('📈 Updated Analytics:');
            console.log(`   Today's Sales: ${dashboard.today.sales} ($${dashboard.today.revenue})`);
            console.log(`   This Month's Sales: ${dashboard.thisMonth.sales} ($${dashboard.thisMonth.revenue})`);
            console.log(`   Total Products: ${dashboard.inventory.totalProducts}`);
            console.log(`   Top Products: ${dashboard.topProducts.length}`);
            console.log(`   Recent Sales: ${dashboard.recentSales.length}`);
            
            // Show top products if any
            if (dashboard.topProducts.length > 0) {
                console.log('\n🏆 Top Selling Products:');
                dashboard.topProducts.slice(0, 3).forEach((product, index) => {
                    console.log(`   ${index + 1}. ${product.name} (${product.total_sold} sold)`);
                });
            }
            
        } catch (error) {
            console.log('⚠️ Could not fetch updated analytics');
        }
        
        // Test recent sales
        console.log('\n📋 Testing Sales API...');
        try {
            const salesData = await api('GET', '/api/sales');
            console.log(`✅ Sales API working: Found ${salesData.data.sales?.length || salesData.data.length || 0} total sales`);
        } catch (error) {
            console.log('⚠️ Could not fetch sales data');
        }
        
        console.log('\n🎉 Sales Data Creation Complete!');
        console.log('📱 Your mobile app now has rich sales and analytics data');
        console.log('🎯 Test the following features in your mobile app:');
        console.log('   • Dashboard analytics');
        console.log('   • Sales history');
        console.log('   • Product performance');
        console.log('   • Customer transaction history');
        console.log('   • Inventory updates');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

createSalesData().catch(console.error);