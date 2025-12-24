const { runQuery, createTables } = require('../config/database');

// SQL to create notifications table
const createNotificationsTableSQL = `
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    data TEXT, -- JSON data for additional context
    status VARCHAR(20) DEFAULT 'active', -- active, read, archived, resolved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`;

// SQL to create notification settings table
const createNotificationSettingsTableSQL = `
  CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    emailEnabled BOOLEAN DEFAULT 1,
    smsEnabled BOOLEAN DEFAULT 0,
    pushEnabled BOOLEAN DEFAULT 1,
    stockAlerts BOOLEAN DEFAULT 1,
    lowStockThreshold INTEGER DEFAULT 10,
    autoStockAlerts BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`;

// SQL to create indexes for better performance
const createIndexesSQL = [
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id)`
];

async function setupNotificationTables() {
  try {
    console.log('🔨 Setting up notification system tables...');

    // Create notifications table
    console.log('Creating notifications table...');
    await runQuery(createNotificationsTableSQL);
    console.log('✅ Notifications table created successfully');

    // Create notification settings table
    console.log('Creating notification settings table...');
    await runQuery(createNotificationSettingsTableSQL);
    console.log('✅ Notification settings table created successfully');

    // Create indexes
    console.log('Creating database indexes...');
    for (const indexSQL of createIndexesSQL) {
      await runQuery(indexSQL);
    }
    console.log('✅ Database indexes created successfully');

    // Insert default notification settings for existing users (if any)
    console.log('Setting up default notification settings for existing users...');
    const defaultSettingsSQL = `
      INSERT OR IGNORE INTO notification_settings (user_id, emailEnabled, smsEnabled, pushEnabled, stockAlerts, lowStockThreshold, autoStockAlerts)
      SELECT id, 1, 0, 1, 1, 10, 1 FROM users WHERE id NOT IN (SELECT user_id FROM notification_settings)
    `;
    await runQuery(defaultSettingsSQL);
    console.log('✅ Default notification settings configured');

    console.log('🎉 Notification system setup completed successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  - notifications');
    console.log('  - notification_settings');
    console.log('');
    console.log('🔧 Features enabled:');
    console.log('  - Real-time stock alerts');
    console.log('  - Low stock warnings');
    console.log('  - Out of stock (rupture de stock) alerts');
    console.log('  - Push notifications');
    console.log('  - Notification management UI');
    console.log('  - Automatic stock monitoring');

  } catch (error) {
    console.error('❌ Error setting up notification system:', error);
    process.exit(1);
  }
}

// Run the setup if called directly
if (require.main === module) {
  setupNotificationTables()
    .then(() => {
      console.log('Notification system setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupNotificationTables };