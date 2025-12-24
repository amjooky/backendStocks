import 'package:meta/meta.dart';

import '../models/models.dart';
import 'base_service.dart';
import 'product_service.dart';

/// Extension methods for ProductService
@immutable
extension ProductServiceExt on ProductService {
  /// Gets a list of products with low stock
  static Future<List<Product>> getLowStockProducts({String? requestId}) async {
    return ProductService.getProducts(lowStock: true, requestId: requestId);
  }

  /// Gets a list of products by category
  static Future<List<Product>> getProductsByCategory(
    int categoryId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('categoryId', categoryId, min: 1);
    return ProductService.getProducts(categoryId: categoryId, requestId: requestId);
  }

  /// Gets a list of products by supplier
  static Future<List<Product>> getProductsBySupplier(
    int supplierId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('supplierId', supplierId, min: 1);
    return ProductService.getProducts(supplierId: supplierId, requestId: requestId);
  }
}