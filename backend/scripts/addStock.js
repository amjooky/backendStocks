const axios = require('axios');

async function addStock() {
  try {
    // Login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful');

    // Configure axios with the token
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Add stock to products 1-7
    const products = [
      { id: 1, quantity: 100 },
      { id: 2, quantity: 75 },
      { id: 3, quantity: 50 },
      { id: 4, quantity: 25 },
      { id: 5, quantity: 30 },
      { id: 6, quantity: 20 },
      { id: 7, quantity: 80 }
    ];

    for (const product of products) {
      try {
        const response = await api.post('/api/inventory/movement', {
          product_id: product.id,
          movement_type: 'in',
          quantity: product.quantity,
          cost_per_unit: 10.00,
          reference: 'INITIAL_STOCK',
          notes: 'Adding initial stock for testing'
        });

        console.log(`✅ Added ${product.quantity} units to product ${product.id}`);
      } catch (error) {
        console.error(`❌ Failed to add stock to product ${product.id}:`, error.response?.data || error.message);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Stock addition completed!');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

addStock();
