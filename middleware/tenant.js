const { logAuth } = require('./auth');

/**
 * Multi-tenant data isolation middleware
 * Ensures users can only access data from their own agency
 */

/**
 * Middleware to enforce agency-based data isolation
 * Automatically adds agency_id filters to database queries
 */
const enforceAgencyIsolation = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin can access all agencies or specify a specific agency
    if (req.user.role === 'superadmin') {
        // Allow superadmin to specify agency via query parameter
        req.agencyFilter = req.query.agencyId || req.body.agencyId || null;
        req.allowCrossAgency = true;
        return next();
    }

    // Regular users are restricted to their own agency
    req.agencyFilter = req.user.agencyId;
    req.allowCrossAgency = false;
    
    // Ensure agency ID is present for non-superadmin users
    if (!req.agencyFilter) {
        return res.status(403).json({ 
            message: 'User must belong to an agency',
            userRole: req.user.role 
        });
    }

    next();
};

/**
 * Helper function to add agency filter to WHERE clause
 * @param {string} baseWhere - Base WHERE clause
 * @param {Array} params - Query parameters array
 * @param {number|null} agencyId - Agency ID to filter by
 * @param {string} tableAlias - Table alias (default: empty string)
 * @returns {Object} Updated WHERE clause and parameters
 */
const addAgencyFilter = (baseWhere, params, agencyId, tableAlias = '') => {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    
    if (agencyId === null) {
        // Superadmin accessing all agencies - no filter needed
        return { whereClause: baseWhere, params };
    }

    const whereClause = baseWhere + ` AND ${prefix}agency_id = ?`;
    // Ensure params is an array before spreading
    const paramsArray = Array.isArray(params) ? params : (params ? [params] : []);
    const newParams = [...paramsArray, agencyId];
    
    return { whereClause, params: newParams };
};

/**
 * Middleware to validate resource ownership
 * Ensures user can only access resources from their agency
 */
const validateResourceOwnership = (resourceType, idParam = 'id') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Superadmin can access any resource
        if (req.user.role === 'superadmin') {
            return next();
        }

        const resourceId = req.params[idParam];
        if (!resourceId) {
            return res.status(400).json({ message: 'Resource ID required' });
        }

        try {
            const { getRow } = require('../config/database');
            
            // Check if resource belongs to user's agency
            const resource = await getRow(
                `SELECT agency_id FROM ${resourceType} WHERE id = ?`,
                [resourceId]
            );

            if (!resource) {
                return res.status(404).json({ message: 'Resource not found' });
            }

            if (resource.agency_id !== req.user.agencyId) {
                await logAuth(req.user.id, req.user.agencyId, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
                    resourceType,
                    resourceId,
                    resourceAgencyId: resource.agency_id,
                    userAgencyId: req.user.agencyId,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(403).json({ 
                    message: 'Access denied: Resource belongs to different agency',
                    resourceAgency: resource.agency_id,
                    userAgency: req.user.agencyId
                });
            }

            next();
        } catch (error) {
            console.error('Error validating resource ownership:', error);
            res.status(500).json({ message: 'Error validating resource access' });
        }
    };
};

/**
 * Middleware to automatically add agency_id to create operations
 */
const addAgencyToCreateData = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // For superadmin, they must explicitly specify agency
    if (req.user.role === 'superadmin') {
        if (!req.body.agencyId && !req.query.agencyId) {
            return res.status(400).json({ 
                message: 'Superadmin must specify agencyId for create operations' 
            });
        }
        req.body.agencyId = req.body.agencyId || req.query.agencyId;
    } else {
        // Regular users: force their agency ID
        req.body.agencyId = req.user.agencyId;
    }

    next();
};

/**
 * Middleware to log data access for audit purposes
 */
const logDataAccess = (operation, resourceType) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next();
        }

        try {
            await logAuth(req.user.id, req.user.agencyId, `${operation}_${resourceType.toUpperCase()}`, {
                resourceType,
                operation,
                params: req.params,
                query: req.query,
                agencyFilter: req.agencyFilter,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        } catch (error) {
            console.error('Error logging data access:', error);
        }

        next();
    };
};

/**
 * Get query builder with agency isolation
 */
const buildAgencyQuery = (baseQuery, agencyId, tableAlias = '') => {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    
    if (agencyId === null) {
        // Superadmin - return base query
        return baseQuery;
    }

    // Add agency filter
    if (baseQuery.toLowerCase().includes(' where ')) {
        return baseQuery + ` AND ${prefix}agency_id = ${agencyId}`;
    } else {
        return baseQuery + ` WHERE ${prefix}agency_id = ${agencyId}`;
    }
};

/**
 * Validate agency limits (users, products, etc.)
 */
const validateAgencyLimits = (limitType) => {
    return async (req, res, next) => {
        if (!req.user || req.user.role === 'superadmin') {
            return next();
        }

        try {
            const { getRow } = require('../config/database');
            
            // Get agency limits
            const agency = await getRow(
                'SELECT max_users, max_products FROM agencies WHERE id = ?',
                [req.user.agencyId]
            );

            if (!agency) {
                return res.status(403).json({ message: 'Agency not found' });
            }

            let currentCount = 0;
            let limit = 0;

            switch (limitType) {
                case 'users':
                    const userCount = await getRow(
                        'SELECT COUNT(*) as count FROM users WHERE agency_id = ? AND is_active = 1',
                        [req.user.agencyId]
                    );
                    currentCount = userCount.count;
                    limit = agency.max_users;
                    break;

                case 'products':
                    const productCount = await getRow(
                        'SELECT COUNT(*) as count FROM products WHERE agency_id = ? AND is_active = 1',
                        [req.user.agencyId]
                    );
                    currentCount = productCount.count;
                    limit = agency.max_products;
                    break;

                default:
                    return next();
            }

            if (currentCount >= limit) {
                return res.status(403).json({
                    message: `Agency has reached maximum ${limitType} limit`,
                    current: currentCount,
                    limit: limit,
                    limitType
                });
            }

            next();
        } catch (error) {
            console.error('Error validating agency limits:', error);
            res.status(500).json({ message: 'Error validating agency limits' });
        }
    };
};

module.exports = {
    enforceAgencyIsolation,
    addAgencyFilter,
    validateResourceOwnership,
    addAgencyToCreateData,
    logDataAccess,
    buildAgencyQuery,
    validateAgencyLimits
};