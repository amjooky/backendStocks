import 'package:meta/meta.dart';

import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing inventory operations
@immutable
class InventoryService extends BaseService {
  static String get serviceName => 'InventoryService';

  /// Fetches inventory overview data
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<InventoryOverview> getOverview({String? requestId}) async {
    return BaseService.handleRequest('fetch inventory overview', () async {
      final response = await ApiService.get(
        '/inventory/overview',
        requestId: requestId,
      );
      return InventoryOverview.fromJson(response);
    });
  }

  /// Fetches stock movement history with filtering and pagination
  /// 
  /// [page] - The page number to fetch (1-based)
  /// [limit] - Number of items per page
  /// [productId] - Optional filter by product ID
  /// [startDate] - Optional start date (YYYY-MM-DD)
  /// [endDate] - Optional end date (YYYY-MM-DD)
  /// [requestId] - Optional request ID for cancellation
  static Future<List<StockMovement>> getMovements({
    int page = 1,
    int limit = 20,
    int? productId,
    String? startDate,
    String? endDate,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    if (productId != null) BaseService.validateNumeric('product_id', productId, min: 1);
    if (startDate != null) BaseService.validateDate('start_date', startDate);
    if (endDate != null) BaseService.validateDate('end_date', endDate);
    
    return BaseService.handleRequest('fetch stock movements', () async {
      final response = await ApiService.get(
        '/inventory/movements',
        queryParams: {
          'page': page,
          'limit': limit,
          if (productId != null) 'productId': productId,
          if (startDate != null) 'startDate': startDate,
          if (endDate != null) 'endDate': endDate,
        },
        requestId: requestId,
      );

      return BaseService.parseList(response, key: 'movements')
          .map((item) => StockMovement.fromJson(item))
          .toList();
    });
  }

  /// Records a stock-in movement
  /// 
  /// [productId] - The ID of the product
  /// [quantity] - The quantity to add
  /// [reference] - Optional reference number
  /// [notes] - Optional notes about the movement
  /// [requestId] - Optional request ID for cancellation
  static Future<void> stockIn({
    required int productId,
    required int quantity,
    String? reference,
    String? notes,
    String? requestId,
  }) async {
    BaseService.validateNumeric('product_id', productId, min: 1);
    BaseService.validateNumeric('quantity', quantity, min: 1);
    
    return BaseService.handleRequest('add stock', () async {
      await ApiService.post(
        '/inventory/stock-in',
        data: {
          'productId': productId,
          'quantity': quantity,
          if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
          if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
        },
        requestId: requestId,
      );
    });
  }

  /// Records a stock-out movement
  /// 
  /// [productId] - The ID of the product
  /// [quantity] - The quantity to remove
  /// [reference] - Optional reference number
  /// [notes] - Optional notes about the movement
  /// [requestId] - Optional request ID for cancellation
  static Future<void> stockOut({
    required int productId,
    required int quantity,
    String? reference,
    String? notes,
    String? requestId,
  }) async {
    BaseService.validateNumeric('product_id', productId, min: 1);
    BaseService.validateNumeric('quantity', quantity, min: 1);
    
    return BaseService.handleRequest('remove stock', () async {
      await ApiService.post(
        '/inventory/stock-out',
        data: {
          'productId': productId,
          'quantity': quantity,
          if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
          if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
        },
        requestId: requestId,
      );
    });
  }

  /// Adjusts stock level for a product
  /// 
  /// [productId] - The ID of the product
  /// [newStock] - The new stock level
  /// [reference] - Optional reference number
  /// [notes] - Optional notes about the adjustment
  /// [requestId] - Optional request ID for cancellation
  static Future<void> adjustStock({
    required int productId,
    required int newStock,
    String? reference,
    String? notes,
    String? requestId,
  }) async {
    BaseService.validateNumeric('product_id', productId, min: 1);
    BaseService.validateNumeric('new_stock', newStock, min: 0);
    
    return BaseService.handleRequest('adjust stock', () async {
      // Strategy 1: Try /inventory/adjust endpoint first
      try {
        await ApiService.post(
          '/inventory/adjust',
          data: {
            'productId': productId,
            'newQuantity': newStock,
            if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
            if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
          },
          requestId: requestId,
        );
        return; // Success, exit early
      } catch (e) {
        // Strategy 1 failed, try other endpoints
        if (!e.toString().contains('404') && !e.toString().contains('Route not found')) {
          rethrow; // If it's not a 404, rethrow the error
        }
      }

      // Strategy 2: Try /inventory/adjustment with newStock field
      try {
        await ApiService.post(
          '/inventory/adjustment',
          data: {
            'productId': productId,
            'newStock': newStock,
            'type': 'adjustment',
            if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
            if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
          },
          requestId: requestId,
        );
        return; // Success, exit early
      } catch (e) {
        // Strategy 2 failed, continue to next strategy
        if (!e.toString().contains('404') && !e.toString().contains('Route not found')) {
          // If it's not a 404 error, this might be the working endpoint but with wrong payload
        }
      }

      // Strategy 3: Try /inventory/stock-adjustment (original endpoint)
      try {
        await ApiService.post(
          '/inventory/stock-adjustment',
          data: {
            'productId': productId,
            'newQuantity': newStock,
            if (reference?.trim().isNotEmpty == true) 'reason': reference!.trim(),
            if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
          },
          requestId: requestId,
        );
        return; // Success, exit early
      } catch (e) {
        // Strategy 3 failed, continue to next
      }

      // Strategy 4: Try using PUT method instead of POST
      try {
        await ApiService.put(
          '/inventory/adjustment',
          data: {
            'productId': productId,
            'newStock': newStock,
            if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
            if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
          },
          requestId: requestId,
        );
        return; // Success, exit early
      } catch (e) {
        // Strategy 4 failed, continue to final strategy
      }

      // Final Strategy: Try to use the generic movement endpoint
      await ApiService.post(
        '/inventory/movements',
        data: {
          'productId': productId,
          'type': 'adjustment',
          'quantity': newStock,
          'newStock': newStock,
          if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
          if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
        },
        requestId: requestId,
      );
    });
  }

  /// Gets a list of products with low stock
  /// 
  /// [page] - The page number to fetch (1-based)
  /// [limit] - Number of items per page
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Product>> getLowStockProducts({
    int page = 1,
    int limit = 20,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    
    return BaseService.handleRequest('fetch low stock products', () async {
      final response = await ApiService.get(
        '/products',
        queryParams: {
          'page': page,
          'limit': limit,
          'lowStock': true,
        },
        requestId: requestId,
      );

      return BaseService.parseList(response, key: 'products')
          .map(Product.fromJson)
          .toList();
    });
  }
}