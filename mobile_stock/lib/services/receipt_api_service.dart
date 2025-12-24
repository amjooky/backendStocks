import 'package:meta/meta.dart';

import '../models/receipt.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing receipts via backend API
@immutable
class ReceiptApiService extends BaseService {
  static String get serviceName => 'ReceiptApiService';

  /// Creates a new receipt on the backend
  /// 
  /// [receipt] - The receipt to create
  /// [requestId] - Optional request ID for cancellation
  static Future<Receipt> createReceipt(
    Receipt receipt, {
    String? requestId,
  }) async {
    return BaseService.handleRequest('create receipt', () async {
      final response = await ApiService.post(
        '/receipts',
        data: receipt.toJson(),
        requestId: requestId,
      );
      
      final data = BaseService.parseItem(response);
      return Receipt.fromJson(data);
    }, serviceName: serviceName);
  }

  /// Retrieves all receipts with pagination
  /// 
  /// [page] - The page number to fetch (1-based)
  /// [limit] - Number of items per page
  /// [search] - Optional search term to filter receipts
  /// [customerName] - Optional customer name filter
  /// [fromDate] - Optional start date filter
  /// [toDate] - Optional end date filter
  /// [paymentMethod] - Optional payment method filter
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Receipt>> getReceipts({
    int page = 1,
    int limit = 50,
    String? search,
    String? customerName,
    String? fromDate,
    String? toDate,
    String? paymentMethod,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    
    return BaseService.handleRequest('fetch receipts', () async {
      final response = await ApiService.get(
        '/receipts',
        queryParams: {
          'page': page,
          'limit': limit,
          if (search?.trim().isNotEmpty == true) 'search': search!.trim(),
          if (customerName?.trim().isNotEmpty == true) 'customer_name': customerName!.trim(),
          if (fromDate?.isNotEmpty == true) 'from_date': fromDate,
          if (toDate?.isNotEmpty == true) 'to_date': toDate,
          if (paymentMethod?.isNotEmpty == true) 'payment_method': paymentMethod,
        },
        requestId: requestId,
      );

      // Handle both direct array response and wrapped response
      if (response is List) {
        // Direct array response
        return (response as List<dynamic>)
            .map((item) => Receipt.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('receipts')) {
        // Wrapped response with pagination
        final receipts = response['receipts'] as List<dynamic>;
        return receipts
            .map((item) => Receipt.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException('Invalid response format for receipts');
      }
    }, serviceName: serviceName);
  }

  /// Retrieves a single receipt by ID
  /// 
  /// [id] - The ID of the receipt to fetch
  /// [requestId] - Optional request ID for cancellation
  static Future<Receipt> getReceipt(String id, {String? requestId}) async {
    BaseService.validateRequired('id', id);
    
    return BaseService.handleRequest('fetch receipt $id', () async {
      final response = await ApiService.get('/receipts/$id', requestId: requestId);
      
      // Handle both wrapped and direct response formats
      if (response.containsKey('receipt')) {
        // Wrapped response
        return Receipt.fromJson(response['receipt']);
      } else {
        // Direct response
        return Receipt.fromJson(response);
      }
    }, serviceName: serviceName);
  }

  /// Updates an existing receipt
  /// 
  /// [id] - The ID of the receipt to update
  /// [receipt] - The updated receipt data
  /// [requestId] - Optional request ID for cancellation
  static Future<Receipt> updateReceipt(
    String id,
    Receipt receipt, {
    String? requestId,
  }) async {
    BaseService.validateRequired('id', id);
    
    return BaseService.handleRequest('update receipt $id', () async {
      final response = await ApiService.put(
        '/receipts/$id',
        data: receipt.toJson(),
        requestId: requestId,
      );
      
      final data = BaseService.parseItem(response);
      return Receipt.fromJson(data);
    }, serviceName: serviceName);
  }

  /// Deletes a receipt by ID
  /// 
  /// [id] - The ID of the receipt to delete
  /// [requestId] - Optional request ID for cancellation
  static Future<void> deleteReceipt(String id, {String? requestId}) async {
    BaseService.validateRequired('id', id);
    
    return BaseService.handleRequest('delete receipt $id', () async {
      await ApiService.delete('/receipts/$id', requestId: requestId);
    }, serviceName: serviceName);
  }

  /// Gets receipt statistics
  /// 
  /// [fromDate] - Optional start date filter
  /// [toDate] - Optional end date filter
  /// [requestId] - Optional request ID for cancellation
  static Future<Map<String, dynamic>> getReceiptStats({
    String? fromDate,
    String? toDate,
    String? requestId,
  }) async {
    return BaseService.handleRequest('fetch receipt stats', () async {
      final response = await ApiService.get(
        '/receipts/stats',
        queryParams: {
          if (fromDate?.isNotEmpty == true) 'from_date': fromDate,
          if (toDate?.isNotEmpty == true) 'to_date': toDate,
        },
        requestId: requestId,
      );
      
      return BaseService.parseItem(response);
    }, serviceName: serviceName);
  }

  /// Exports receipts to specified format
  /// 
  /// [format] - Export format ('json', 'csv', 'pdf')
  /// [fromDate] - Optional start date filter
  /// [toDate] - Optional end date filter
  /// [requestId] - Optional request ID for cancellation
  static Future<String> exportReceipts({
    String format = 'json',
    String? fromDate,
    String? toDate,
    String? requestId,
  }) async {
    _validateExportFormat(format);
    
    return BaseService.handleRequest('export receipts', () async {
      final response = await ApiService.get(
        '/receipts/export',
        queryParams: {
          'format': format,
          if (fromDate?.isNotEmpty == true) 'from_date': fromDate,
          if (toDate?.isNotEmpty == true) 'to_date': toDate,
        },
        requestId: requestId,
      );
      
      final data = BaseService.parseItem(response);
      final downloadUrl = data['download_url'] as String?;
      
      if (downloadUrl == null || downloadUrl.isEmpty) {
        throw ApiException('Export failed: No download URL received');
      }
      
      return downloadUrl;
    }, serviceName: serviceName);
  }

  /// Searches receipts by various criteria
  /// 
  /// [query] - Search query string
  /// [filters] - Additional search filters
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Receipt>> searchReceipts(
    String query, {
    Map<String, dynamic>? filters,
    String? requestId,
  }) async {
    BaseService.validateRequired('query', query);
    
    return BaseService.handleRequest('search receipts', () async {
      final response = await ApiService.get(
        '/receipts/search',
        queryParams: {
          'q': query.trim(),
          ...?filters,
        },
        requestId: requestId,
      );
      
      return BaseService.parseList(response, key: 'results')
          .map(Receipt.fromJson)
          .toList();
    }, serviceName: serviceName);
  }

  /// Generates a new receipt number from backend
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<String> generateReceiptNumber({String? requestId}) async {
    return BaseService.handleRequest('generate receipt number', () async {
      final response = await ApiService.post(
        '/receipts/generate-number',
        data: {},
        requestId: requestId,
      );
      
      final data = BaseService.parseItem(response);
      final receiptNumber = data['receipt_number'] as String?;
      
      if (receiptNumber == null || receiptNumber.isEmpty) {
        throw ApiException('Failed to generate receipt number');
      }
      
      return receiptNumber;
    }, serviceName: serviceName);
  }

  /// Validates export format
  static void _validateExportFormat(String format) {
    const validFormats = {'json', 'csv', 'pdf'};
    if (!validFormats.contains(format)) {
      throw ArgumentError.value(
        format,
        'format',
        'Must be one of: ${validFormats.join(", ")}',
      );
    }
  }
}