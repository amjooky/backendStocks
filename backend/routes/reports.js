const express = require('express');
const { query, validationResult } = require('express-validator');
const { getAllRows, getRow } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { 
    enforceAgencyIsolation, 
    addAgencyFilter, 
    validateResourceOwnership, 
    addAgencyToCreateData,
    logDataAccess,
    validateAgencyLimits
} = require('../middleware/tenant');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Reports summary - root endpoint
router.get('/', async (req, res) => {
    try {
        // Basic reports summary
        const summary = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(AVG(total_amount), 0) as average_sale
            FROM sales 
            WHERE DATE(created_at) >= DATE('now', '-30 days')
        `);
        
        res.json({
            period: 'Last 30 days',
            ...summary
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Error fetching reports' });
    }
});

// Reports summary endpoint (alias for backward compatibility)
router.get('/summary', async (req, res) => {
    try {
        // Same as root endpoint
        const summary = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(AVG(total_amount), 0) as average_sale
            FROM sales 
            WHERE DATE(created_at) >= DATE('now', '-30 days')
        `);
        
        res.json({
            period: 'Last 30 days',
            ...summary
        });
    } catch (error) {
        console.error('Error fetching reports summary:', error);
        res.status(500).json({ message: 'Error fetching reports summary' });
    }
});

// Dashboard overview
router.get('/dashboard', async (req, res) => {
    try {
        // Today's sales summary
        const todayStats = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discounts
            FROM sales 
            WHERE DATE(created_at) = DATE('now')
        `);

        // This month's stats
        const monthStats = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discounts
            FROM sales 
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `);

        // Inventory stats
        const inventoryStats = await getRow(`
            SELECT 
                COUNT(p.id) as total_products,
                SUM(CASE WHEN i.current_stock <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN i.current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
                COALESCE(SUM(i.current_stock * p.cost_price), 0) as total_inventory_value
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
        `);

        // Top selling products this month
        const topProducts = await getAllRows(`
            SELECT 
                p.name,
                p.sku,
                SUM(si.quantity) as total_sold,
                SUM(si.total_price) as total_revenue
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE strftime('%Y-%m', s.created_at) = strftime('%Y-%m', 'now')
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_sold DESC
            LIMIT 5
        `);

        // Recent sales
        const recentSales = await getAllRows(`
            SELECT 
                s.id,
                s.sale_number,
                s.total_amount,
                s.created_at,
                c.name as customer_name,
                u.username as cashier_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.cashier_id = u.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `);

        // Low stock alerts
        const lowStockProducts = await getAllRows(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                i.current_stock,
                p.min_stock_level
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1 
            AND i.current_stock <= p.min_stock_level
            ORDER BY i.current_stock ASC
            LIMIT 5
        `);

        res.json({
            today: todayStats,
            month: monthStats,
            inventory: inventoryStats,
            topProducts,
            recentSales,
            lowStockProducts
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Sales report by date range
router.get('/sales', [
    query('startDate').notEmpty().withMessage('Start date is required'),
    query('endDate').notEmpty().withMessage('End date is required'),
    query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid groupBy value')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { startDate, endDate, groupBy } = req.query;

        let dateFormat;
        switch (groupBy) {
            case 'week':
                dateFormat = "strftime('%Y-W%W', created_at)";
                break;
            case 'month':
                dateFormat = "strftime('%Y-%m', created_at)";
                break;
            default:
                dateFormat = "DATE(created_at)";
        }

        // Sales summary by period
        const salesSummary = await getAllRows(`
            SELECT 
                ${dateFormat} as period,
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                SUM(discount_amount) as total_discounts,
                AVG(total_amount) as average_sale,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY ${dateFormat}
            ORDER BY period ASC
        `, [startDate, endDate]);

        // Payment method breakdown
        const paymentMethods = await getAllRows(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(total_amount) as total_revenue
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY payment_method
        `, [startDate, endDate]);

        // Top selling products in period
        const topProducts = await getAllRows(`
            SELECT 
                p.name,
                p.sku,
                SUM(si.quantity) as total_sold,
                SUM(si.total_price) as total_revenue,
                COUNT(DISTINCT si.sale_id) as times_sold
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_sold DESC
            LIMIT 10
        `, [startDate, endDate]);

        // Sales by cashier
        const cashierPerformance = await getAllRows(`
            SELECT 
                u.username,
                u.first_name,
                u.last_name,
                COUNT(*) as total_sales,
                SUM(s.total_amount) as total_revenue
            FROM sales s
            LEFT JOIN users u ON s.cashier_id = u.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY u.id, u.username, u.first_name, u.last_name
            ORDER BY total_revenue DESC
        `, [startDate, endDate]);

        res.json({
            salesSummary,
            paymentMethods,
            topProducts,
            cashierPerformance,
            period: { startDate, endDate, groupBy: groupBy || 'day' }
        });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ message: 'Error generating sales report' });
    }
});

// Inventory report
router.get('/inventory', async (req, res) => {
    try {
        // Inventory overview
        const overview = await getRow(`
            SELECT 
                COUNT(p.id) as total_products,
                SUM(CASE WHEN i.current_stock > p.min_stock_level THEN 1 ELSE 0 END) as in_stock,
                SUM(CASE WHEN i.current_stock <= p.min_stock_level AND i.current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN i.current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(i.current_stock * p.cost_price) as total_cost_value,
                SUM(i.current_stock * p.selling_price) as total_selling_value
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
        `);

        // Inventory by category
        const byCategory = await getAllRows(`
            SELECT 
                c.name as category_name,
                COUNT(p.id) as product_count,
                SUM(i.current_stock) as total_stock,
                SUM(i.current_stock * p.cost_price) as total_value
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE c.is_active = 1
            GROUP BY c.id, c.name
            ORDER BY total_value DESC
        `);

        // Low stock products
        const lowStockProducts = await getAllRows(`
            SELECT 
                p.name,
                p.sku,
                c.name as category_name,
                s.name as supplier_name,
                i.current_stock,
                p.min_stock_level,
                (p.min_stock_level - i.current_stock) as shortage
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1 
            AND i.current_stock <= p.min_stock_level
            ORDER BY shortage DESC
            LIMIT 20
        `);

        // Top value products
        const topValueProducts = await getAllRows(`
            SELECT 
                p.name,
                p.sku,
                i.current_stock,
                p.cost_price,
                p.selling_price,
                (i.current_stock * p.cost_price) as total_cost_value,
                (i.current_stock * p.selling_price) as total_selling_value
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
            AND i.current_stock > 0
            ORDER BY total_selling_value DESC
            LIMIT 10
        `);

        // Recent stock movements
        const recentMovements = await getAllRows(`
            SELECT 
                sm.*,
                p.name as product_name,
                p.sku,
                u.username as user_name
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.user_id = u.id
            ORDER BY sm.created_at DESC
            LIMIT 20
        `);

        res.json({
            overview,
            byCategory,
            lowStockProducts,
            topValueProducts,
            recentMovements
        });

    } catch (error) {
        console.error('Error generating inventory report:', error);
        res.status(500).json({ message: 'Error generating inventory report' });
    }
});

// Product performance report
router.get('/product-performance', [
    query('startDate').notEmpty().withMessage('Start date is required'),
    query('endDate').notEmpty().withMessage('End date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { startDate, endDate } = req.query;

        // Product sales performance
        const productPerformance = await getAllRows(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.cost_price,
                p.selling_price,
                c.name as category_name,
                COALESCE(SUM(si.quantity), 0) as units_sold,
                COALESCE(SUM(si.total_price), 0) as total_revenue,
                COALESCE(SUM(si.quantity * p.cost_price), 0) as total_cost,
                COALESCE(SUM(si.total_price) - SUM(si.quantity * p.cost_price), 0) as gross_profit,
                COALESCE(COUNT(DISTINCT si.sale_id), 0) as times_sold,
                i.current_stock,
                p.min_stock_level
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN sale_items si ON p.id = si.product_id
            LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ?
            WHERE p.is_active = 1
            GROUP BY p.id, p.name, p.sku, p.cost_price, p.selling_price, c.name, i.current_stock, p.min_stock_level
            ORDER BY total_revenue DESC
        `, [startDate, endDate]);

        // Calculate additional metrics
        const enrichedData = productPerformance.map(product => ({
            ...product,
            profit_margin: product.total_revenue > 0 
                ? ((product.gross_profit / product.total_revenue) * 100).toFixed(2) 
                : 0,
            stock_turnover: product.current_stock > 0 
                ? (product.units_sold / product.current_stock).toFixed(2) 
                : 'N/A'
        }));

        // Category performance summary
        const categoryPerformance = await getAllRows(`
            SELECT 
                c.name as category_name,
                COUNT(DISTINCT p.id) as product_count,
                SUM(si.quantity) as units_sold,
                SUM(si.total_price) as total_revenue,
                SUM(si.quantity * p.cost_price) as total_cost,
                (SUM(si.total_price) - SUM(si.quantity * p.cost_price)) as gross_profit
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
            LEFT JOIN sale_items si ON p.id = si.product_id
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            AND c.is_active = 1
            GROUP BY c.id, c.name
            HAVING units_sold > 0
            ORDER BY total_revenue DESC
        `, [startDate, endDate]);

        res.json({
            productPerformance: enrichedData,
            categoryPerformance,
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('Error generating product performance report:', error);
        res.status(500).json({ message: 'Error generating product performance report' });
    }
});

// Performance report for Flutter app
router.get('/performance', [
    query('start_date').notEmpty().withMessage('Start date is required'),
    query('end_date').notEmpty().withMessage('End date is required'),
    query('limit').optional().isInt().withMessage('Limit must be an integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { start_date, end_date, limit = 20 } = req.query;

        // Top performing products
        const topProducts = await getAllRows(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.cost_price,
                p.selling_price,
                c.name as category_name,
                COALESCE(SUM(si.quantity), 0) as units_sold,
                COALESCE(SUM(si.total_price), 0) as total_revenue,
                COALESCE(SUM(si.quantity * p.cost_price), 0) as total_cost,
                COALESCE(SUM(si.total_price) - SUM(si.quantity * p.cost_price), 0) as gross_profit,
                i.current_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN sale_items si ON p.id = si.product_id
            LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ?
            WHERE p.is_active = 1
            GROUP BY p.id, p.name, p.sku, p.cost_price, p.selling_price, c.name, i.current_stock
            ORDER BY total_revenue DESC
            LIMIT ?
        `, [start_date, end_date, limit]);

        // Performance summary
        const summary = await getRow(`
            SELECT 
                COUNT(DISTINCT p.id) as total_products_analyzed,
                COUNT(DISTINCT s.id) as total_sales,
                COALESCE(SUM(si.total_price), 0) as total_revenue,
                COALESCE(SUM(si.quantity), 0) as total_units_sold
            FROM products p
            LEFT JOIN sale_items si ON p.id = si.product_id
            LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ?
            WHERE p.is_active = 1
        `, [start_date, end_date]);

        res.json({
            period: { start_date, end_date },
            summary,
            top_products: topProducts
        });

    } catch (error) {
        console.error('Error generating performance report:', error);
        res.status(500).json({ message: 'Error generating performance report' });
    }
});

// Sales summary report for Flutter app
router.get('/sales-summary', [
    query('startDate').notEmpty().withMessage('Start date is required'),
    query('endDate').notEmpty().withMessage('End date is required'),
    query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid groupBy value')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { startDate, endDate, groupBy = 'day' } = req.query;

        let dateFormat;
        let dateLabel;
        switch (groupBy) {
            case 'week':
                dateFormat = "strftime('%Y-W%W', created_at)";
                dateLabel = 'week';
                break;
            case 'month':
                dateFormat = "strftime('%Y-%m', created_at)";
                dateLabel = 'month';
                break;
            default:
                dateFormat = "DATE(created_at)";
                dateLabel = 'day';
        }

        // Daily/Weekly/Monthly sales summary
        const salesData = await getAllRows(`
            SELECT 
                ${dateFormat} as date,
                COUNT(*) as sales_count,
                SUM(total_amount) as revenue,
                SUM(discount_amount) as discounts,
                AVG(total_amount) as average_order_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY ${dateFormat}
            ORDER BY date ASC
        `, [startDate, endDate]);

        // Overall summary
        const totalSummary = await getRow(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_revenue,
                SUM(discount_amount) as total_discounts,
                AVG(total_amount) as average_order_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
        `, [startDate, endDate]);

        // Payment method breakdown
        const paymentMethods = await getAllRows(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(total_amount) as total_amount
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY payment_method
            ORDER BY total_amount DESC
        `, [startDate, endDate]);

        res.json({
            period: { startDate, endDate, groupBy },
            sales_summary: totalSummary,
            daily_sales: salesData,
            sales_by_payment_method: paymentMethods
        });

    } catch (error) {
        console.error('Error generating sales summary:', error);
        res.status(500).json({ message: 'Error generating sales summary' });
    }
});

// Customer report (Manager+ only)
router.get('/customers', requireManager, [
    query('startDate').notEmpty().withMessage('Start date is required'),
    query('endDate').notEmpty().withMessage('End date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { startDate, endDate } = req.query;

        // Customer purchase summary
        const customerSummary = await getAllRows(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.phone,
                c.loyalty_points,
                COUNT(s.id) as total_purchases,
                SUM(s.total_amount) as total_spent,
                AVG(s.total_amount) as average_purchase,
                MAX(s.created_at) as last_purchase_date,
                MIN(s.created_at) as first_purchase_date
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id 
            WHERE c.is_active = 1
            AND DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY c.id, c.name, c.email, c.phone, c.loyalty_points
            HAVING total_purchases > 0
            ORDER BY total_spent DESC
        `, [startDate, endDate]);

        // New customers in period
        const newCustomers = await getAllRows(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.created_at as registration_date,
                COUNT(s.id) as purchases_made,
                COALESCE(SUM(s.total_amount), 0) as total_spent
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE DATE(c.created_at) BETWEEN ? AND ?
            GROUP BY c.id, c.name, c.email, c.created_at
            ORDER BY c.created_at DESC
        `, [startDate, endDate]);

        // Customer loyalty stats
        const loyaltyStats = await getRow(`
            SELECT 
                COUNT(*) as total_customers,
                AVG(loyalty_points) as avg_loyalty_points,
                SUM(CASE WHEN loyalty_points > 100 THEN 1 ELSE 0 END) as high_loyalty_customers,
                SUM(CASE WHEN loyalty_points = 0 THEN 1 ELSE 0 END) as no_loyalty_points
            FROM customers 
            WHERE is_active = 1
        `);

        res.json({
            customerSummary,
            newCustomers,
            loyaltyStats,
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('Error generating customer report:', error);
        res.status(500).json({ message: 'Error generating customer report' });
    }
});

// Financial report (Manager+ only)
router.get('/financial', requireManager, [
    query('startDate').notEmpty().withMessage('Start date is required'),
    query('endDate').notEmpty().withMessage('End date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { startDate, endDate } = req.query;

        // Revenue and profit summary
        const financialSummary = await getRow(`
            SELECT 
                COUNT(s.id) as total_transactions,
                SUM(s.total_amount) as total_revenue,
                SUM(s.discount_amount) as total_discounts,
                SUM(si.quantity * p.cost_price) as total_cogs,
                (SUM(s.total_amount) - SUM(si.quantity * p.cost_price)) as gross_profit
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
        `, [startDate, endDate]);

        // Daily financial breakdown
        const dailyFinancials = await getAllRows(`
            SELECT 
                DATE(s.created_at) as date,
                COUNT(s.id) as transactions,
                SUM(s.total_amount) as revenue,
                SUM(s.discount_amount) as discounts,
                SUM(si.quantity * p.cost_price) as cogs,
                (SUM(s.total_amount) - SUM(si.quantity * p.cost_price)) as gross_profit
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY DATE(s.created_at)
            ORDER BY date ASC
        `, [startDate, endDate]);

        // Calculate additional financial metrics
        const enrichedSummary = {
            ...financialSummary,
            gross_profit_margin: financialSummary.total_revenue > 0 
                ? ((financialSummary.gross_profit / financialSummary.total_revenue) * 100).toFixed(2)
                : 0,
            average_transaction_value: financialSummary.total_transactions > 0
                ? (financialSummary.total_revenue / financialSummary.total_transactions).toFixed(2)
                : 0,
            discount_percentage: financialSummary.total_revenue > 0
                ? ((financialSummary.total_discounts / financialSummary.total_revenue) * 100).toFixed(2)
                : 0
        };

        res.json({
            summary: enrichedSummary,
            dailyBreakdown: dailyFinancials,
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).json({ message: 'Error generating financial report' });
    }
});

// Comprehensive report endpoint
router.get('/comprehensive', [
    query('start_date').notEmpty().withMessage('Start date is required'),
    query('end_date').notEmpty().withMessage('End date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { start_date, end_date, report_type } = req.query;

        // Sales summary
        const salesSummary = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(AVG(total_amount), 0) as average_order_value,
                COUNT(*) as total_transactions
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
        `, [start_date, end_date]);

        // Inventory summary
        const inventorySummary = await getRow(`
            SELECT 
                COUNT(p.id) as total_products,
                SUM(CASE WHEN i.current_stock <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN i.current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
                COALESCE(SUM(i.current_stock * p.cost_price), 0) as total_inventory_value
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
        `);

        // Customer summary
        const customerSummary = await getRow(`
            SELECT 
                COUNT(DISTINCT c.id) as total_customers,
                COUNT(DISTINCT CASE WHEN DATE(c.created_at) BETWEEN ? AND ? THEN c.id END) as new_customers,
                COUNT(DISTINCT CASE WHEN DATE(c.created_at) < ? THEN c.id END) as returning_customers,
                CASE 
                    WHEN COUNT(DISTINCT c.id) > 0 
                    THEN (COUNT(DISTINCT CASE WHEN DATE(c.created_at) < ? THEN c.id END) * 100.0 / COUNT(DISTINCT c.id))
                    ELSE 0 
                END as customer_retention_rate
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE c.is_active = 1
            AND DATE(s.created_at) BETWEEN ? AND ?
        `, [start_date, end_date, start_date, start_date, start_date, end_date]);

        // Promotion summary
        const activePromotionsCount = await getRow(`
            SELECT COUNT(*) as active_promotions
            FROM promotions p
            WHERE p.is_active = 1
        `);

        const promotionUsage = await getRow(`
            SELECT 
                COALESCE(SUM(sp.discount_amount), 0) as total_discount_given,
                COUNT(DISTINCT sp.sale_id) as promotion_usage,
                p.name as most_used_promotion
            FROM sale_promotions sp
            LEFT JOIN promotions p ON sp.promotion_id = p.id
            LEFT JOIN sales s ON sp.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY p.id, p.name
            ORDER BY COUNT(sp.sale_id) DESC
            LIMIT 1
        `, [start_date, end_date]);

        const promotionSummary = {
            active_promotions: activePromotionsCount?.active_promotions || 0,
            total_discount_given: promotionUsage?.total_discount_given || 0,
            promotion_usage: promotionUsage?.promotion_usage || 0,
            most_used_promotion: promotionUsage?.most_used_promotion || 'None'
        };

        // Default promotion summary if no promotions found
        const finalPromotionSummary = promotionSummary || {
            active_promotions: 0,
            total_discount_given: 0,
            promotion_usage: 0,
            most_used_promotion: 'None'
        };

        // Top products
        const topProducts = await getAllRows(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                SUM(si.quantity) as quantity_sold,
                SUM(si.total_price) as revenue
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            GROUP BY p.id, p.name, p.sku
            ORDER BY quantity_sold DESC
            LIMIT 10
        `, [start_date, end_date]);

        // Sales by payment method
        const salesByPaymentMethod = await getAllRows(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(total_amount) as total_amount
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY payment_method
            ORDER BY count DESC
        `, [start_date, end_date]);

        // Daily sales
        const dailySales = await getAllRows(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as sales_count,
                SUM(total_amount) as revenue
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [start_date, end_date]);

        res.json({
            sales_summary: salesSummary,
            inventory_summary: inventorySummary,
            customer_summary: customerSummary,
            promotion_summary: finalPromotionSummary,
            top_products: topProducts,
            sales_by_payment_method: salesByPaymentMethod,
            daily_sales: dailySales
        });

    } catch (error) {
        console.error('Error generating comprehensive report:', error);
        res.status(500).json({ message: 'Error generating comprehensive report' });
    }
});

// Export report endpoint
router.get('/export', [
    query('start_date').notEmpty().withMessage('Start date is required'),
    query('end_date').notEmpty().withMessage('End date is required'),
    query('format').optional().isIn(['json', 'csv', 'pdf', 'excel']).withMessage('Invalid format'),
    query('report_type').optional().isIn(['summary', 'detailed', 'financial']).withMessage('Invalid report type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { start_date, end_date, format = 'json', report_type = 'summary' } = req.query;

        let reportData;
        
        switch (report_type) {
            case 'financial':
                // Get financial report data
                reportData = await getRow(`
                    SELECT 
                        COUNT(s.id) as total_transactions,
                        SUM(s.total_amount) as total_revenue,
                        SUM(s.discount_amount) as total_discounts,
                        AVG(s.total_amount) as avg_transaction
                    FROM sales s
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                `, [start_date, end_date]);
                break;
                
            case 'detailed':
                // Get detailed sales data
                reportData = await getAllRows(`
                    SELECT 
                        s.sale_number,
                        s.total_amount,
                        s.payment_method,
                        s.created_at,
                        c.name as customer_name,
                        u.username as cashier
                    FROM sales s
                    LEFT JOIN customers c ON s.customer_id = c.id
                    LEFT JOIN users u ON s.cashier_id = u.id
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                    ORDER BY s.created_at DESC
                `, [start_date, end_date]);
                break;
                
            default: // 'summary'
                // Get summary data
                reportData = {
                    sales: await getRow(`
                        SELECT 
                            COUNT(*) as total_sales,
                            SUM(total_amount) as total_revenue,
                            AVG(total_amount) as avg_order_value
                        FROM sales 
                        WHERE DATE(created_at) BETWEEN ? AND ?
                    `, [start_date, end_date]),
                    
                    inventory: await getRow(`
                        SELECT 
                            COUNT(p.id) as total_products,
                            SUM(CASE WHEN i.current_stock <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_count
                        FROM products p
                        LEFT JOIN inventory i ON p.id = i.product_id
                        WHERE p.is_active = 1
                    `),
                    
                    period: { start_date, end_date }
                };
        }

        // Handle different export formats
        switch (format) {
            case 'csv':
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="report_${report_type}_${start_date}_${end_date}.csv"`);
                
                // Simple CSV conversion (you might want to use a proper CSV library)
                if (Array.isArray(reportData)) {
                    const headers = Object.keys(reportData[0] || {}).join(',');
                    const rows = reportData.map(row => Object.values(row).join(','));
                    res.send([headers, ...rows].join('\n'));
                } else {
                    const headers = Object.keys(reportData).join(',');
                    const values = Object.values(reportData).join(',');
                    res.send([headers, values].join('\n'));
                }
                break;
                
            case 'excel':
                // For Excel, return CSV-like format with .xlsx extension
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="report_${report_type}_${start_date}_${end_date}.xlsx"`);
                
                // For now, return CSV format (you'd need a library like exceljs for proper Excel files)
                if (Array.isArray(reportData)) {
                    const headers = Object.keys(reportData[0] || {}).join('\t'); // Tab-separated for Excel
                    const rows = reportData.map(row => Object.values(row).join('\t'));
                    res.send([headers, ...rows].join('\n'));
                } else {
                    const flatData = JSON.stringify(reportData, null, 2);
                    res.send(flatData);
                }
                break;
                
            case 'pdf':
                // For PDF, return JSON with instructions (you'd need a PDF library like puppeteer or pdfkit)
                res.json({
                    message: 'PDF generation not implemented yet',
                    data: reportData,
                    instructions: 'Use a PDF generation service or library to convert this data'
                });
                break;
                
            default: // 'json'
                res.json({
                    report_type,
                    period: { start_date, end_date },
                    generated_at: new Date().toISOString(),
                    data: reportData
                });
        }

    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ message: 'Error exporting report' });
    }
});

module.exports = router;
