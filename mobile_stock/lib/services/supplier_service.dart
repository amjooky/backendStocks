import 'package:meta/meta.dart';

import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing supplier operations
@immutable
class SupplierService extends BaseService {
  static String get serviceName => 'SupplierService';

  /// Fetches all suppliers
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Supplier>> getAllSuppliers({String? requestId}) async {
    return BaseService.handleRequest('fetch all suppliers', () async {
      final response = await ApiService.get('/suppliers', requestId: requestId);
      
      // Handle the wrapped array response
      if (response.containsKey('data') && response['data'] is List) {
        final suppliersData = response['data'] as List<dynamic>;
        return suppliersData
            .map((item) => Supplier.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      // Direct array in response root
      else if (response.containsKey('suppliers') && response['suppliers'] is List) {
        return BaseService.parseList(response, key: 'suppliers')
            .map((item) => Supplier.fromJson(item))
            .toList();
      }
      // If response itself is the suppliers data
      else if (response is List) {
        return (response as List<dynamic>)
            .map((item) => Supplier.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      else {
        throw ApiException('Invalid response format for suppliers. Response: $response');
      }
    });
  }

  /// Fetches a specific supplier by ID
  /// 
  /// [supplierId] - The ID of the supplier to fetch
  /// [requestId] - Optional request ID for cancellation
  static Future<Supplier> getSupplierById(int supplierId, {String? requestId}) async {
    BaseService.validateNumeric('supplierId', supplierId, min: 1);
    
    return BaseService.handleRequest('fetch supplier', () async {
      final response = await ApiService.get('/suppliers/$supplierId', requestId: requestId);
      return Supplier.fromJson(BaseService.parseItem(response));
    });
  }

  /// Creates a new supplier
  /// 
  /// [supplier] - The supplier data to create
  /// [requestId] - Optional request ID for cancellation
  static Future<Supplier> createSupplier(Supplier supplier, {String? requestId}) async {
    return BaseService.handleRequest('create supplier', () async {
      final response = await ApiService.post(
        '/suppliers',
        data: supplier.toJson(),
        requestId: requestId,
      );
      return Supplier.fromJson(BaseService.parseItem(response));
    });
  }

  /// Updates an existing supplier
  /// 
  /// [supplier] - The supplier data to update
  /// [requestId] - Optional request ID for cancellation
  static Future<Supplier> updateSupplier(Supplier supplier, Map<String, String?> supplierData, {String? requestId}) async {
    BaseService.validateNumeric('supplier.id', supplier.id, min: 1);
    
    return BaseService.handleRequest('update supplier', () async {
      final response = await ApiService.put(
        '/suppliers/${supplier.id}',
        data: supplier.toJson(),
        requestId: requestId,
      );
      return Supplier.fromJson(BaseService.parseItem(response));
    });
  }

  /// Deletes a supplier
  /// 
  /// [supplierId] - The ID of the supplier to delete
  /// [requestId] - Optional request ID for cancellation
  static Future<bool> deleteSupplier(int supplierId, {String? requestId}) async {
    BaseService.validateNumeric('supplierId', supplierId, min: 1);
    
    return BaseService.handleRequest('delete supplier', () async {
      final response = await ApiService.delete('/suppliers/$supplierId', requestId: requestId);
      return BaseService.parseSuccess(response);
    });
  }

  /// Searches suppliers by name or contact info
  /// 
  /// [query] - The search query
  /// [limit] - Maximum number of results
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Supplier>> searchSuppliers(
    String query, {
    int limit = 20,
    String? requestId,
  }) async {
    BaseService.validateRequired('query', query);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    
    return BaseService.handleRequest('search suppliers', () async {
      final response = await ApiService.get(
        '/suppliers/search',
        queryParams: {
          'q': query.trim(),
          'limit': limit,
        },
        requestId: requestId,
      );
      return BaseService.parseList(response)
          .map((item) => Supplier.fromJson(item))
          .toList();
    });
  }
}