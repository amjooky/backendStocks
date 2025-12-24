import 'package:meta/meta.dart';

import 'base_service.dart';
import 'api_service.dart';

/// Service for generating various business analytics
@immutable
class AnalyticsService extends BaseService {
  static String get serviceName => 'AnalyticsService';

  /// Fetches dashboard analytics overview
  /// 
  /// Provides key metrics for the dashboard including:
  /// - Today's sales summary
  /// - Low stock alerts
  /// - Recent activity
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<Map<String, dynamic>> getDashboardAnalytics({String? requestId}) async {
    return BaseService.handleRequest('fetch dashboard analytics', () async {
      final response = await ApiService.get(
        '/analytics/dashboard',
        requestId: requestId,
      );
      return BaseService.parseItem(response);
    });
  }

  /// Fetches sales analytics for a given period
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [requestId] - Optional request ID for cancellation
  static Future<Map<String, dynamic>> getSalesAnalytics({
    required String startDate,
    required String endDate,
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    
    return BaseService.handleRequest('fetch sales analytics', () async {
      final response = await ApiService.get(
        '/analytics/sales',
        queryParams: {
          'start_date': startDate,
          'end_date': endDate,
        },
        requestId: requestId,
      );
      return BaseService.parseItem(response);
    });
  }

  /// Fetches inventory analytics
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<Map<String, dynamic>> getInventoryAnalytics({String? requestId}) async {
    return BaseService.handleRequest('fetch inventory analytics', () async {
      final response = await ApiService.get(
        '/analytics/inventory',
        requestId: requestId,
      );
      return BaseService.parseItem(response);
    });
  }

  /// Fetches product performance analytics
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [limit] - Maximum number of products to analyze
  /// [requestId] - Optional request ID for cancellation
  static Future<Map<String, dynamic>> getProductAnalytics({
    required String startDate,
    required String endDate,
    int limit = 10,
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    
    return BaseService.handleRequest('fetch product analytics', () async {
      final response = await ApiService.get(
        '/analytics/products',
        queryParams: {
          'start_date': startDate,
          'end_date': endDate,
          'limit': limit,
        },
        requestId: requestId,
      );
      return BaseService.parseItem(response);
    });
  }

  /// Fetches financial analytics
  /// 
  /// [startDate] - Start date in ISO format (YYYY-MM-DD)
  /// [endDate] - End date in ISO format (YYYY-MM-DD)
  /// [requestId] - Optional request ID for cancellation
  static Future<Map<String, dynamic>> getFinancials({
    required String startDate,
    required String endDate,
    String? requestId,
  }) async {
    BaseService.validateDate('startDate', startDate);
    BaseService.validateDate('endDate', endDate);
    
    return BaseService.handleRequest('fetch financial analytics', () async {
      final response = await ApiService.get(
        '/analytics/financial',
        queryParams: {
          'start_date': startDate,
          'end_date': endDate,
        },
        requestId: requestId,
      );
      return BaseService.parseItem(response);
    });
  }
}