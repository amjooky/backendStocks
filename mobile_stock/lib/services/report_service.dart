import 'package:meta/meta.dart';
import 'dart:developer' as developer;

import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';
import 'inventory_service.dart';
import 'product_service.dart';

/// Service for generating various business reports
@immutable
class ReportService extends BaseService {
  static String get serviceName => 'ReportService';

  /// Fetches dashboard overview data
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<DashboardData> getDashboard({String? requestId}) async {
    return BaseService.handleRequest('fetch dashboard data', () async {
      try {
        // Use real stock management backend API
        final response = await ApiService.get(
          '/analytics/dashboard',
          queryParams: {'period': 'month'},
          requestId: requestId,
        );
        return DashboardData.fromJson(response);
      } catch (e) {
        // If analytics endpoint fails, create fallback dashboard
        developer.log('Analytics endpoint failed, creating fallback dashboard', name: serviceName);
        return _createFallbackDashboard();
      }
    }, serviceName: serviceName);
  }

  /// Creates a fallback dashboard using available inventory data
  static Future<DashboardData> _createFallbackDashboard() async {
    try {
      developer.log('🔧 Creating fallback dashboard from inventory data...', name: serviceName);
      
      // Get real data from working endpoints
      final inventoryOverview = await InventoryService.getOverview();
      final lowStockProducts = await InventoryService.getLowStockProducts(limit: 10);
      
      // Use the actual inventory stats from the working API
      // (this data comes from /inventory/overview which is working)
      return DashboardData(
        inventory: inventoryOverview.stats, // Use real stats from API
        lowStockProducts: lowStockProducts, // Use real low stock products
        topProducts: [], // Empty since we don't have sales data
        today: DashboardStats(),
        month: DashboardStats(),
      );
    } catch (e) {
      developer.log('❌ Fallback dashboard creation failed: $e', name: serviceName);
      // Return empty dashboard data as last resort
      return DashboardData();
    }
  }

  /// Fetches sales report data
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [groupBy] - Grouping interval ('day', 'week', 'month', 'year')
  /// [requestId] - Optional request ID for cancellation
  static Future<SalesReport> getSalesReport({
    required String startDate,
    required String endDate,
    String groupBy = 'day',
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    _validateGroupBy(groupBy);

    return BaseService.handleRequest('fetch sales report', () async {
      final response = await ApiService.get(
        '/reports/sales',
        queryParams: {
          'start_date': startDate,
          'end_date': endDate,
          'group_by': groupBy,
        },
        requestId: requestId,
      );
      return SalesReport.fromJson(BaseService.parseItem(response));
    }, serviceName: serviceName);
  }

  /// Fetches inventory report data
  /// 
  /// Shows current stock levels, low stock items, and recent movements
  /// [requestId] - Optional request ID for cancellation
  static Future<InventoryReport> getInventoryReport({String? requestId}) async {
    return BaseService.handleRequest('fetch inventory report', () async {
      final response = await ApiService.get(
        '/reports/inventory',
        requestId: requestId,
      );
      return InventoryReport.fromJson(BaseService.parseItem(response));
    }, serviceName: serviceName);
  }

  /// Fetches product performance report
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [limit] - Maximum number of products to include
  /// [requestId] - Optional request ID for cancellation
  static Future<ProductPerformanceReport> getProductPerformanceReport({
    required String startDate,
    required String endDate,
    int limit = 20,
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);

    return BaseService.handleRequest('fetch product performance report', () async {
      try {
        final response = await ApiService.get(
          '/reports/performance',
          queryParams: {
            'start_date': startDate,
            'end_date': endDate,
            'limit': limit,
          },
          requestId: requestId,
        );
        return ProductPerformanceReport.fromJson(BaseService.parseItem(response));
      } catch (e) {
        developer.log('Performance endpoint failed, creating fallback report', name: serviceName);
        return _createFallbackPerformanceReport(limit);
      }
    }, serviceName: serviceName);
  }

  /// Creates a fallback performance report using available product data
  static Future<ProductPerformanceReport> _createFallbackPerformanceReport(int limit) async {
    try {
      developer.log('🔧 Creating fallback performance report...', name: serviceName);
      
      // Get real inventory report which contains top value products
      final inventoryReport = await getInventoryReport();
      
      // Extract available product information from inventory report
      // The inventory report has real product data with stock and pricing
      final allProducts = await ProductService.getProducts(limit: limit);
      
      // Convert products to performance format using real data
      final performanceItems = allProducts
          .take(limit)
          .map((product) => ProductSummary(
                productId: product.id,
                name: product.name,
                sku: product.sku,
                revenue: 0.0, // No sales data available from missing endpoints
                cost: product.costPrice,
                profit: 0.0, // No sales data available from missing endpoints
                quantity: product.currentStock, // Real current stock from API
              ))
          .toList();
      
      return ProductPerformanceReport(
        topProducts: performanceItems,
        lowPerforming: [],
        averageRevenue: 0.0,
        totalProducts: performanceItems.length,
      );
    } catch (e) {
      developer.log('❌ Fallback performance report creation failed: $e', name: serviceName);
      return ProductPerformanceReport(topProducts: [], lowPerforming: [], averageRevenue: 0.0, totalProducts: 0);
    }
  }

  /// Fetches supplier performance report
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [limit] - Maximum number of suppliers to include
  /// [requestId] - Optional request ID for cancellation
  static Future<SupplierPerformanceReport> getSupplierPerformanceReport({
    required String startDate,
    required String endDate,
    int limit = 20,
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);

    return BaseService.handleRequest('fetch supplier performance report', () async {
      final response = await ApiService.get(
        '/reports/suppliers',
        queryParams: {
          'start_date': startDate,
          'end_date': endDate,
          'limit': limit,
        },
        requestId: requestId,
      );
      return SupplierPerformanceReport.fromJson(BaseService.parseItem(response));
    }, serviceName: serviceName);
  }

  /// Fetches financial report
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [groupBy] - Grouping interval ('day', 'week', 'month', 'year')
  /// [requestId] - Optional request ID for cancellation
  static Future<FinancialReport> getFinancialReport({
    required String startDate,
    required String endDate,
    String groupBy = 'day',
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    _validateGroupBy(groupBy);

    return BaseService.handleRequest('fetch financial report', () async {
      try {
        // Use real stock management backend API
        final response = await ApiService.get(
          '/reports/sales-summary',
          queryParams: {
            'startDate': startDate,
            'endDate': endDate,
            'groupBy': groupBy,
          },
          requestId: requestId,
        );
        return FinancialReport.fromJson(response);
      } catch (e) {
        developer.log('Financial endpoint failed, creating fallback report', name: serviceName);
        return _createFallbackFinancialReport();
      }
    }, serviceName: serviceName);
  }

  /// Creates a fallback financial report using available inventory data
  static Future<FinancialReport> _createFallbackFinancialReport() async {
    try {
      developer.log('🔧 Creating fallback financial report...', name: serviceName);
      
      // Get available inventory overview
      final inventoryOverview = await InventoryService.getOverview();
      
      // Use inventory value as the only available financial metric
      final inventoryValue = inventoryOverview.stats.inventoryValue;
      
      return FinancialReport(
        totalRevenue: 0.0, // No sales data available
        totalCost: inventoryValue, // Use inventory value as cost estimate
        grossProfit: 0.0, // No sales data available
        profitMargin: 0.0, // No sales data available
        dailySummary: [], // No time series data available
        byCategory: [], // No category breakdown available
        topProducts: [], // No product sales data available
      );
    } catch (e) {
      developer.log('❌ Fallback financial report creation failed: $e', name: serviceName);
      return FinancialReport(
        totalRevenue: 0.0,
        totalCost: 0.0,
        grossProfit: 0.0,
        profitMargin: 0.0,
        dailySummary: [],
        byCategory: [],
        topProducts: [],
      );
    }
  }

  /// Fetches comprehensive business report
  /// 
  /// Includes summary of:
  /// - Sales performance
  /// - Inventory status
  /// - Financial metrics
  /// - Top products
  /// - Top suppliers
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [requestId] - Optional request ID for cancellation
  static Future<BusinessReport> getBusinessReport({
    required String startDate,
    required String endDate,
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);

    return BaseService.handleRequest('fetch business report', () async {
      final response = await ApiService.get(
        '/reports/business',
        queryParams: {
          'start_date': startDate,
          'end_date': endDate,
        },
        requestId: requestId,
      );
      return BusinessReport.fromJson(BaseService.parseItem(response));
    }, serviceName: serviceName);
  }

  /// Generates and exports a report in the specified format
  /// 
  /// [reportType] - Type of report to generate
  /// [format] - Export format ('pdf', 'excel', 'csv')
  /// [startDate] - Optional start date for time-based reports
  /// [endDate] - Optional end date for time-based reports
  /// [requestId] - Optional request ID for cancellation
  static Future<String> exportReport({
    required String reportType,
    required String format,
    String? startDate,
    String? endDate,
    String? requestId,
  }) async {
    _validateReportType(reportType);
    _validateExportFormat(format);
    if (startDate != null) BaseService.validateDate('startDate', startDate);
    if (endDate != null) BaseService.validateDate('endDate', endDate);

    return BaseService.handleRequest('export $reportType report', () async {
      final response = await ApiService.get(
        '/reports/export/$reportType',
        queryParams: {
          'format': format,
          if (startDate != null) 'start_date': startDate,
          if (endDate != null) 'end_date': endDate,
        },
        requestId: requestId,
      );
      
      final data = BaseService.parseItem(response);
      final downloadUrl = data['download_url'] as String?;
      
      if (downloadUrl == null || downloadUrl.isEmpty) {
        throw ApiException('Export failed: No download URL received');
      }
      
      return downloadUrl;
    });
  }

  /// Validates grouping interval
  static void _validateGroupBy(String groupBy) {
    const validIntervals = {'day', 'week', 'month', 'year'};
    if (!validIntervals.contains(groupBy)) {
      throw ArgumentError.value(
        groupBy,
        'groupBy',
        'Must be one of: ${validIntervals.join(", ")}',
      );
    }
  }

  /// Validates report type
  static void _validateReportType(String reportType) {
    const validTypes = {
      'sales',
      'inventory',
      'financial',
      'products',
      'suppliers',
      'business',
    };
    if (!validTypes.contains(reportType)) {
      throw ArgumentError.value(
        reportType,
        'reportType',
        'Must be one of: ${validTypes.join(", ")}',
      );
    }
  }

  /// Validates export format
  static void _validateExportFormat(String format) {
    const validFormats = {'pdf', 'excel', 'csv'};
    if (!validFormats.contains(format)) {
      throw ArgumentError.value(
        format,
        'format',
        'Must be one of: ${validFormats.join(", ")}',
      );
    }
  }
}
