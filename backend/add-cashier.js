const bcrypt = require('bcryptjs');
const { runQuery } = require('./config/database');

async function addCashierUser() {
    try {
        const hashedPassword = bcrypt.hashSync('cashier123', 10);
        
        const result = await runQuery(
            `INSERT INTO users (username, email, password, first_name, last_name, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['cashier1', 'cashier1@stocksystem.com', hashedPassword, 'Jane', 'Smith', 'cashier']
        );
        
        console.log('Cashier user created successfully:', result);
        console.log('Username: cashier1');
        console.log('Password: cashier123');
        console.log('Role: cashier');
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating cashier user:', error);
        process.exit(1);
    }
}

addCashierUser();
