const axios = require('axios');

async function debugPayment() {
  try {
    // Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Configure axios
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Test 1: Simple payment data
    console.log('\n2. Testing simple payment...');
    const simplePayload = {
      items: [{
        productId: 1,
        quantity: 1,
        unitPrice: 15.99,
        discountAmount: 0
      }],
      paymentMethod: 'cash',
      appliedPromotions: [],
      customerId: null,
      notes: 'Test payment'
    };

    console.log('Payload:', JSON.stringify(simplePayload, null, 2));

    try {
      const response = await api.post('/api/sales', simplePayload);
      console.log('✅ Payment successful!');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Payment failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.errors) {
        console.log('\nValidation errors:');
        error.response.data.errors.forEach((err, index) => {
          console.log(`${index + 1}. Field: ${err.path || err.param || 'unknown'}`);
          console.log(`   Message: ${err.msg || err.message}`);
          console.log(`   Value: ${JSON.stringify(err.value)}`);
          console.log('');
        });
      }
    }

    // Test 2: Check what the NEW frontend sends (without null fields)
    console.log('\n3. Testing NEW frontend-style payload (without null fields)...');
    const frontendPayload = {
      paymentMethod: 'cash',
      notes: 'Amount Paid: $15.99',
      items: [{
        productId: 1,
        quantity: 1,
        unitPrice: 15.99,
        discountAmount: 0
      }]
      // Note: customerId and appliedPromotions are not included when not needed
    };

    console.log('Frontend payload:', JSON.stringify(frontendPayload, null, 2));

    try {
      const response = await api.post('/api/sales', frontendPayload);
      console.log('✅ Frontend-style payment successful!');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Frontend-style payment failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.errors) {
        console.log('\nValidation errors:');
        error.response.data.errors.forEach((err, index) => {
          console.log(`${index + 1}. Field: ${err.path || err.param || 'unknown'}`);
          console.log(`   Message: ${err.msg || err.message}`);
          console.log(`   Value: ${JSON.stringify(err.value)}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('Script error:', error.message);
  }
}

debugPayment();
