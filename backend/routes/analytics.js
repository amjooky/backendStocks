const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
    enforceAgencyIsolation, 
    addAgencyFilter, 
    validateResourceOwnership, 
    addAgencyToCreateData,
    logDataAccess,
    validateAgencyLimits
} = require('../middleware/tenant');
const { getAllRows, getRow } = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Advanced reporting and analytics
 */

// All routes require authentication
router.use(authenticateToken);

// Analytics overview - root endpoint
router.get('/', async (req, res) => {
    try {
        // Basic analytics overview
        const overview = await getRow(`
            SELECT 
                COUNT(DISTINCT s.id) as total_sales,
                COALESCE(SUM(s.total_amount), 0) as total_revenue,
                COUNT(DISTINCT p.id) as total_products,
                COUNT(DISTINCT c.id) as total_customers
            FROM sales s
            LEFT JOIN products p ON p.is_active = 1
            LEFT JOIN customers c ON c.is_active = 1
            WHERE s.created_at >= datetime('now', '-30 days')
        `);
        
        res.json({
            period: 'Last 30 days',
            ...overview
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

// Analytics dashboard - comprehensive overview
router.get('/dashboard', async (req, res) => {
    try {
        // Get today's metrics
        const todayMetrics = await getRow(`
            SELECT 
                COUNT(*) as total_sales_today,
                COALESCE(SUM(total_amount), 0) as revenue_today
            FROM sales 
            WHERE DATE(created_at) = DATE('now')
        `);
        
        // Get this month's metrics
        const monthMetrics = await getRow(`
            SELECT 
                COUNT(*) as total_sales_month,
                COALESCE(SUM(total_amount), 0) as revenue_month
            FROM sales 
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `);
        
        // Get inventory status
        const inventoryMetrics = await getRow(`
            SELECT 
                COUNT(p.id) as total_products,
                SUM(CASE WHEN COALESCE(i.current_stock, 0) <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_products,
                SUM(CASE WHEN COALESCE(i.current_stock, 0) = 0 THEN 1 ELSE 0 END) as out_of_stock_products
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
        `);
        
        // Get top selling products this month
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
        
        // Get recent sales
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
        
        res.json({
            today: {
                sales: todayMetrics.total_sales_today || 0,
                revenue: todayMetrics.revenue_today || 0
            },
            thisMonth: {
                sales: monthMetrics.total_sales_month || 0,
                revenue: monthMetrics.revenue_month || 0
            },
            inventory: {
                totalProducts: inventoryMetrics.total_products || 0,
                lowStockProducts: inventoryMetrics.low_stock_products || 0,
                outOfStockProducts: inventoryMetrics.out_of_stock_products || 0
            },
            topProducts: topProducts || [],
            recentSales: recentSales || []
        });
        
    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({ message: 'Error fetching dashboard analytics' });
    }
});

/**
 * @swagger
 * /api/analytics/financials:
 *   get:
 *     tags: [Analytics]
 *     summary: Financial overview
 *     description: Returns revenue, profit, taxes, and cash flow summaries for a given period
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 revenue:
 *                   type: number
 *                 profit:
 *                   type: number
 *                 taxes:
 *                   type: number
 *                 cashFlow:
 *                   type: number
 */
router.get('/financials', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    // Calculate revenue from sales
    const revenueResult = await getRow(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COUNT(*) as total_sales
      FROM sales 
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Calculate cost of goods sold (COGS) from sale items
    const cogsResult = await getRow(`
      SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) as total_cogs
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    const revenue = parseFloat(revenueResult.total_revenue) || 0;
    const cogs = parseFloat(cogsResult.total_cogs) || 0;
    const grossProfit = revenue - cogs;
    
    // Estimate taxes (10% of gross profit - this should be configurable)
    const taxRate = 0.10;
    const estimatedTaxes = grossProfit > 0 ? grossProfit * taxRate : 0;
    
    // Net profit after taxes
    const netProfit = grossProfit - estimatedTaxes;
    
    // Cash flow approximation (revenue - expenses)
    // For now, we'll use gross profit as cash flow
    const cashFlow = grossProfit;

    res.json({
      revenue: revenue,
      profit: netProfit,
      taxes: estimatedTaxes,
      cashFlow: cashFlow,
      // Additional metrics for debugging
      _debug: {
        grossProfit: grossProfit,
        cogs: cogs,
        totalSales: revenueResult.total_sales,
        totalDiscounts: revenueResult.total_discounts
      }
    });

  } catch (error) {
    console.error('Error calculating financials:', error);
    res.status(500).json({ message: 'Error calculating financial data' });
  }
});

/**
 * @swagger
 * /api/analytics/inventory/forecast:
 *   get:
 *     tags: [Analytics]
 *     summary: Inventory forecasting
 *     description: Predicts stock-out dates and recommended reorder quantities
 *     parameters:
 *       - in: query
 *         name: horizonDays
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Forecast results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 forecasts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: integer
 *                       days_to_stockout:
 *                         type: number
 *                       recommended_reorder_qty:
 *                         type: integer
 */
router.get('/inventory/forecast', async (req, res) => {
  res.json({ forecasts: [] });
});

/**
 * @swagger
 * /api/analytics/customers/segments:
 *   get:
 *     tags: [Analytics]
 *     summary: Customer segmentation
 *     description: Returns customer segments (RFM or tier-based)
 *     responses:
 *       200:
 *         description: Segmentation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 segments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       customer_count:
 *                         type: integer
 */
router.get('/customers/segments', async (req, res) => {
  try {
    // Get customer segments based on purchase frequency
    const segments = await getAllRows(`
      SELECT 
        CASE 
          WHEN purchase_count >= 10 THEN 'VIP'
          WHEN purchase_count >= 5 THEN 'Regular'
          WHEN purchase_count >= 2 THEN 'Occasional'
          ELSE 'New'
        END as segment_name,
        COUNT(*) as customer_count
      FROM (
        SELECT 
          c.id,
          c.name,
          COUNT(s.id) as purchase_count
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE c.is_active = 1
        GROUP BY c.id
      ) customer_stats
      GROUP BY segment_name
      ORDER BY 
        CASE segment_name
          WHEN 'VIP' THEN 1
          WHEN 'Regular' THEN 2  
          WHEN 'Occasional' THEN 3
          WHEN 'New' THEN 4
        END
    `);

    // Format the response
    const formattedSegments = segments.map(segment => ({
      name: segment.segment_name,
      customer_count: segment.customer_count
    }));

    res.json({ segments: formattedSegments });

  } catch (error) {
    console.error('Error calculating customer segments:', error);
    res.status(500).json({ message: 'Error calculating customer segments' });
  }
});

module.exports = router;

