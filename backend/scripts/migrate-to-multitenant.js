const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');

/**
 * Migration script to convert single-tenant system to multi-tenant with Superadmin support
 * This script adds agencies table and updates existing tables for multi-tenancy
 */

async function migrateToMultiTenant() {
    console.log('🚀 Starting Multi-Tenant Migration...');
    
    try {
        // 1. Create agencies table
        await createAgenciesTable();
        
        // 2. Update users table for superadmin role and agency association
        await updateUsersTable();
        
        // 3. Add agency_id to all existing tables
        await addAgencyIdToTables();
        
        // 4. Create default superadmin and agency
        await createDefaultSuperAdminAndAgency();
        
        // 5. Add GDPR compliance tables
        await createGDPRTables();
        
        // 6. Add audit logging
        await createAuditTable();
        
        console.log('✅ Multi-Tenant Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function createAgenciesTable() {
    console.log('📝 Creating agencies table...');
    
    await runQuery(`
        CREATE TABLE IF NOT EXISTS agencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            postal_code VARCHAR(20),
            country VARCHAR(100) DEFAULT 'Italy',
            tax_code VARCHAR(50),
            vat_number VARCHAR(50),
            
            -- Subscription info
            subscription_plan VARCHAR(50) DEFAULT 'basic',
            subscription_status VARCHAR(20) DEFAULT 'active',
            subscription_start_date DATE,
            subscription_end_date DATE,
            max_users INTEGER DEFAULT 10,
            max_products INTEGER DEFAULT 1000,
            
            -- GDPR Compliance
            data_retention_days INTEGER DEFAULT 1095,
            gdpr_consent BOOLEAN DEFAULT TRUE,
            gdpr_consent_date DATETIME,
            privacy_policy_accepted BOOLEAN DEFAULT TRUE,
            privacy_policy_version VARCHAR(20),
            
            -- Settings
            timezone VARCHAR(50) DEFAULT 'Europe/Rome',
            locale VARCHAR(10) DEFAULT 'it',
            currency VARCHAR(3) DEFAULT 'EUR',
            date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            
            UNIQUE(name)
        )
    `);
    
    // Create indexes separately
    await runQuery('CREATE INDEX IF NOT EXISTS idx_agencies_subscription_status ON agencies(subscription_status)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON agencies(is_active)');
}

async function updateUsersTable() {
    console.log('👥 Updating users table for multi-tenancy...');
    
    // Check if columns already exist
    const columns = await getAllRows("PRAGMA table_info(users)");
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('agency_id')) {
        await runQuery('ALTER TABLE users ADD COLUMN agency_id INTEGER');
    }
    
    // Check if we need to recreate the table to add superadmin role
    const tableSQL = await getRow("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    if (tableSQL.sql.includes("CHECK(role IN ('admin', 'manager', 'cashier'))")) {
        await recreateUsersTableWithSuperadmin();
        return; // Skip the rest as table was recreated
    }
    
    // Add new columns for enhanced user management
    const newColumns = [
        'last_login DATETIME',
        'login_attempts INTEGER DEFAULT 0',
        'locked_until DATETIME',
        'password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'must_change_password BOOLEAN DEFAULT FALSE',
        'two_factor_enabled BOOLEAN DEFAULT FALSE',
        'two_factor_secret VARCHAR(32)',
        'preferred_language VARCHAR(10) DEFAULT "it"',
        'timezone VARCHAR(50) DEFAULT "Europe/Rome"',
        'gdpr_consent BOOLEAN DEFAULT TRUE',
        'gdpr_consent_date DATETIME DEFAULT CURRENT_TIMESTAMP',
        'data_processing_consent BOOLEAN DEFAULT TRUE'
    ];
    
    for (const column of newColumns) {
        if (!columnNames.includes(column.split(' ')[0])) {
            await runQuery(`ALTER TABLE users ADD COLUMN ${column}`);
        }
    }
    
    // Add indexes
    await runQuery('CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)');
}

async function recreateUsersTableWithSuperadmin() {
    console.log('🔄 Recreating users table to support superadmin role...');
    
    // Disable foreign key constraints temporarily
    await runQuery('PRAGMA foreign_keys = OFF');
    
    // Begin transaction
    await runQuery('BEGIN TRANSACTION');
    
    try {
        // Create new users table with updated role constraint
        await runQuery(`
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                role TEXT CHECK(role IN ('superadmin', 'admin', 'manager', 'cashier')) DEFAULT 'cashier',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                agency_id INTEGER,
                last_login DATETIME,
                login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME,
                password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                must_change_password BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_secret VARCHAR(32),
                preferred_language VARCHAR(10) DEFAULT 'it',
                timezone VARCHAR(50) DEFAULT 'Europe/Rome',
                gdpr_consent BOOLEAN DEFAULT TRUE,
                gdpr_consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_processing_consent BOOLEAN DEFAULT TRUE
            )
        `);
        
        // Copy existing data
        await runQuery(`
            INSERT INTO users_new (id, username, email, password, first_name, last_name, role, is_active, created_at, updated_at, agency_id)
            SELECT id, username, email, password, first_name, last_name, role, is_active, created_at, updated_at, agency_id
            FROM users
        `);
        
        // Drop old table
        await runQuery('DROP TABLE users');
        
        // Rename new table
        await runQuery('ALTER TABLE users_new RENAME TO users');
        
        // Create indexes
        await runQuery('CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id)');
        await runQuery('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
        await runQuery('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)');
        
        // Commit transaction
        await runQuery('COMMIT');
        
        // Re-enable foreign key constraints
        await runQuery('PRAGMA foreign_keys = ON');
        
        console.log('   ✅ Successfully recreated users table with superadmin support');
        
    } catch (error) {
        await runQuery('ROLLBACK');
        await runQuery('PRAGMA foreign_keys = ON');
        throw error;
    }
}

async function addAgencyIdToTables() {
    console.log('🏢 Adding agency_id to existing tables...');
    
    const tables = [
        'products', 'categories', 'suppliers', 'inventory', 'customers', 
        'sales', 'sale_items', 'stock_movements', 'promotions', 'caisse_sessions'
    ];
    
    for (const table of tables) {
        try {
            // Check if table exists
            const tableExists = await getRow(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
                [table]
            );
            
            if (tableExists) {
                // Check if agency_id column already exists
                const columns = await getAllRows(`PRAGMA table_info(${table})`);
                const hasAgencyId = columns.some(col => col.name === 'agency_id');
                
                if (!hasAgencyId) {
                    await runQuery(`ALTER TABLE ${table} ADD COLUMN agency_id INTEGER`);
                    await runQuery(`CREATE INDEX IF NOT EXISTS idx_${table}_agency_id ON ${table}(agency_id)`);
                    console.log(`   ✅ Added agency_id to ${table}`);
                }
            }
        } catch (error) {
            console.log(`   ⚠️  Could not update ${table}: ${error.message}`);
        }
    }
}

async function createDefaultSuperAdminAndAgency() {
    console.log('👑 Creating default superadmin and agency...');
    
    // Create default agency
    const defaultAgency = await getRow('SELECT id FROM agencies WHERE name = ?', ['Default Agency']);
    let agencyId;
    
    if (!defaultAgency) {
        const result = await runQuery(`
            INSERT INTO agencies (
                name, email, phone, address, city, postal_code, country,
                subscription_plan, max_users, max_products, timezone, locale, currency,
                gdpr_consent, gdpr_consent_date, privacy_policy_accepted
            ) VALUES (
                'Default Agency', 'admin@stockmanagement.local', '+39 123 456 7890',
                'Via Roma 123', 'Rome', '00100', 'Italy',
                'enterprise', 100, 10000, 'Europe/Rome', 'it', 'EUR',
                TRUE, CURRENT_TIMESTAMP, TRUE
            )
        `);
        agencyId = result.id;
        console.log(`   ✅ Created default agency with ID: ${agencyId}`);
    } else {
        agencyId = defaultAgency.id;
    }
    
    // Update existing users to belong to default agency
    await runQuery('UPDATE users SET agency_id = ? WHERE agency_id IS NULL', [agencyId]);
    
    // Create/update superadmin user
    const superAdmin = await getRow('SELECT id FROM users WHERE role = ?', ['superadmin']);
    
    if (!superAdmin) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('SuperAdmin@2024', 12);
        
        await runQuery(`
            INSERT INTO users (
                username, email, password, first_name, last_name, role, agency_id,
                is_active, must_change_password, preferred_language, timezone,
                gdpr_consent, gdpr_consent_date, data_processing_consent
            ) VALUES (
                'superadmin', 'superadmin@stockmanagement.local', ?, 'Super', 'Administrator', 'superadmin', NULL,
                TRUE, TRUE, 'it', 'Europe/Rome',
                TRUE, CURRENT_TIMESTAMP, TRUE
            )
        `, [hashedPassword]);
        
        console.log('   ✅ Created superadmin user (username: superadmin, password: SuperAdmin@2024)');
    }
}

async function createGDPRTables() {
    console.log('🔒 Creating GDPR compliance tables...');
    
    // Data processing log
    await runQuery(`
        CREATE TABLE IF NOT EXISTS data_processing_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agency_id INTEGER,
            user_id INTEGER,
            data_subject VARCHAR(255),
            processing_purpose TEXT,
            data_categories TEXT,
            legal_basis VARCHAR(100),
            retention_period INTEGER,
            processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create indexes for data_processing_log
    await runQuery('CREATE INDEX IF NOT EXISTS idx_data_processing_agency ON data_processing_log(agency_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_data_processing_subject ON data_processing_log(data_subject)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_data_processing_date ON data_processing_log(processed_at)');
    
    // Data deletion requests (Right to be forgotten)
    await runQuery(`
        CREATE TABLE IF NOT EXISTS data_deletion_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agency_id INTEGER,
            requestor_email VARCHAR(255) NOT NULL,
            requestor_name VARCHAR(255),
            request_reason TEXT,
            data_types TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            processed_by INTEGER,
            notes TEXT
        )
    `);
    
    // Create indexes for data_deletion_requests
    await runQuery('CREATE INDEX IF NOT EXISTS idx_deletion_requests_agency ON data_deletion_requests(agency_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status)');
    
    // Consent management
    await runQuery(`
        CREATE TABLE IF NOT EXISTS consent_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agency_id INTEGER,
            email VARCHAR(255) NOT NULL,
            consent_type VARCHAR(50),
            consent_given BOOLEAN NOT NULL,
            consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            consent_method VARCHAR(50),
            ip_address VARCHAR(45),
            user_agent TEXT,
            withdrawn_at DATETIME
        )
    `);
    
    // Create indexes for consent_records
    await runQuery('CREATE INDEX IF NOT EXISTS idx_consent_agency ON consent_records(agency_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_consent_email ON consent_records(email)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type)');
}

async function createAuditTable() {
    console.log('📋 Creating audit logging table...');
    
    await runQuery(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agency_id INTEGER,
            user_id INTEGER,
            action VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50),
            resource_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create indexes for audit_log
    await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_agency ON audit_log(agency_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)');
}

// Export the main migration function
module.exports = { migrateToMultiTenant };

// Run migration if called directly
if (require.main === module) {
    migrateToMultiTenant()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}