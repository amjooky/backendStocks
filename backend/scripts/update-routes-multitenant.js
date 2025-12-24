const fs = require('fs');
const path = require('path');

/**
 * Script to update all existing routes to support multi-tenancy
 * This script applies data isolation patterns to API routes
 */

const routesDir = path.join(__dirname, '..', 'routes');

// Routes that need multi-tenant updates
const routesToUpdate = [
    'categories.js',
    'suppliers.js',
    'customers.js',
    'sales.js',
    'inventory.js',
    'caisse.js',
    'promotions.js',
    'reports.js',
    'analytics.js'
];

// Multi-tenant imports to add
const tenantImports = `const { 
    enforceAgencyIsolation, 
    addAgencyFilter, 
    validateResourceOwnership, 
    addAgencyToCreateData,
    logDataAccess,
    validateAgencyLimits
} = require('../middleware/tenant');`;

// Updated middleware usage
const middlewareUpdate = {
    from: 'router.use(authenticateToken);',
    to: `router.use(authenticateToken);
router.use(enforceAgencyIsolation);`
};

async function updateRoute(routeFile) {
    const filePath = path.join(routesDir, routeFile);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Route file not found: ${routeFile}`);
        return;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // Add tenant middleware imports if not already present
        if (!content.includes('enforceAgencyIsolation') && content.includes('const { authenticateToken')) {
            content = content.replace(
                /const \{ authenticateToken.*?\} = require\('\.\.\/middleware\/auth'\);/,
                (match) => match + '\n' + tenantImports
            );
            updated = true;
        }

        // Update router middleware
        if (content.includes('router.use(authenticateToken);') && !content.includes('enforceAgencyIsolation')) {
            content = content.replace(middlewareUpdate.from, middlewareUpdate.to);
            updated = true;
        }

        // Add agency filtering to GET routes
        content = updateGetRoutes(content, routeFile);

        // Add resource ownership validation to specific routes
        content = updateResourceOwnership(content, routeFile);

        // Add agency assignment to POST routes
        content = updatePostRoutes(content, routeFile);

        if (updated || content !== fs.readFileSync(filePath, 'utf8')) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated: ${routeFile}`);
        } else {
            console.log(`ℹ️  No changes needed: ${routeFile}`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${routeFile}:`, error.message);
    }
}

function updateGetRoutes(content, routeFile) {
    // Add agency filtering to list routes
    const listRoutePattern = /WHERE\s+.*?\s*=\s*1/g;
    
    if (content.includes('WHERE') && !content.includes('addAgencyFilter')) {
        // This is a simplified update - in practice, each route needs individual attention
        console.log(`📝 ${routeFile} needs manual GET route updates for agency filtering`);
    }
    
    return content;
}

function updateResourceOwnership(content, routeFile) {
    // Add resource ownership validation to PUT and DELETE routes
    const resourceName = routeFile.replace('.js', '');
    
    const putPattern = /router\.put\('\/:\w+', requireManager,/g;
    const deletePattern = /router\.delete\('\/:\w+', requireManager,/g;
    
    if (putPattern.test(content) && !content.includes('validateResourceOwnership')) {
        content = content.replace(
            putPattern,
            `router.put('/:id', requireManager, validateResourceOwnership('${resourceName}'),`
        );
    }
    
    if (deletePattern.test(content) && !content.includes('validateResourceOwnership')) {
        content = content.replace(
            deletePattern,
            `router.delete('/:id', requireManager, validateResourceOwnership('${resourceName}'),`
        );
    }
    
    return content;
}

function updatePostRoutes(content, routeFile) {
    // Add agency assignment to POST routes
    if (content.includes('router.post(') && !content.includes('addAgencyToCreateData')) {
        const postPattern = /router\.post\('\/', requireManager,/g;
        content = content.replace(
            postPattern,
            "router.post('/', requireManager, addAgencyToCreateData,"
        );
    }
    
    return content;
}

async function updateAllRoutes() {
    console.log('🚀 Starting multi-tenant route updates...\n');
    
    for (const routeFile of routesToUpdate) {
        await updateRoute(routeFile);
    }
    
    console.log('\n✅ Multi-tenant route updates completed!');
    console.log('\n📋 Manual tasks required:');
    console.log('1. Update WHERE clauses to use addAgencyFilter()');
    console.log('2. Add agency_id to INSERT statements');
    console.log('3. Update route-specific query logic');
    console.log('4. Add proper error handling for agency validation');
    console.log('5. Test all endpoints with different user roles');
}

// Run if called directly
if (require.main === module) {
    updateAllRoutes();
}

module.exports = { updateAllRoutes };