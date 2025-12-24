import 'package:meta/meta.dart';

import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';


/// Service for managing products
@immutable
class ProductService extends BaseService {
  static String get serviceName => 'ProductService';

  /// Fetches a list of products with pagination and filtering
  /// 
  /// [page] - The page number to fetch (1-based)
  /// [limit] - Number of items per page
  /// [search] - Optional search term to filter products
  /// [categoryId] - Optional category ID to filter by category
  /// [supplierId] - Optional supplier ID to filter by supplier
  /// [lowStock] - If true, only returns products with low stock
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Product>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
    int? supplierId,
    bool? lowStock,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    
    return BaseService.handleRequest('fetch products', () async {
      final response = await ApiService.get(
        '/products',
        queryParams: {
          'page': page,
          'limit': limit,
          if (search?.trim().isNotEmpty == true) 'search': search!.trim(),
          if (categoryId != null) 'category_id': categoryId,
          if (supplierId != null) 'supplier_id': supplierId,
          if (lowStock == true) 'low_stock': true,
        },
        requestId: requestId,
      );

      // Handle both direct array response and wrapped response
      if (response is List) {
        // Direct array response
        return (response as List<dynamic>)
            .map((item) => Product.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('products')) {
        // Wrapped response with pagination (new format)
        final products = response['products'] as List<dynamic>;
        return products
            .map((item) => Product.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException('Invalid response format for products');
      }
    });
  }

  /// Fetches a single product by ID
  /// 
  /// [id] - The ID of the product to fetch
  /// [requestId] - Optional request ID for cancellation
  static Future<Product> getProduct(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('fetch product $id', () async {
      final response = await ApiService.get('/products/$id', requestId: requestId);
      
      // Handle both wrapped and direct response formats
      if (response.containsKey('product')) {
        // Wrapped response
        return Product.fromJson(response['product']);
      } else {
        // Direct response
        return Product.fromJson(response);
      }
    });
  }

  /// Searches for products by term
  /// 
  /// [term] - The search term
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Product>> searchProducts(
    String term, {
    String? requestId,
  }) async {
    BaseService.validateRequired('term', term);
    
    return BaseService.handleRequest('search products', () async {
      final response = await ApiService.get(
        '/products/search',
        queryParams: {'q': term.trim()},
        requestId: requestId,
      );
      
      return BaseService.parseList(response, key: 'results')
          .map(Product.fromJson)
          .toList();
    });
  }

  /// Searches for a product by barcode
  /// 
  /// [barcode] - The barcode to search for
  /// [requestId] - Optional request ID for cancellation
  static Future<Product?> findByBarcode(String barcode, {String? requestId}) async {
    BaseService.validateRequired('barcode', barcode);
    
    return BaseService.handleRequest('find product by barcode', () async {
      try {
        // First try the dedicated barcode endpoint
        final response = await ApiService.get(
          '/products/barcode/$barcode',
          requestId: requestId,
        );
        
        final data = BaseService.parseItem(response);
        if (data['found'] == true && data['product'] != null) {
          return Product.fromJson(BaseService.parseItem(response, key: 'product'));
        }
        return null;
      } catch (e) {
        // Fallback: search through all products for matching barcode
        try {
          final products = await getProducts(limit: 100, requestId: requestId);
          for (final product in products) {
            if (product.barcode != null && product.barcode!.trim() == barcode.trim()) {
              return product;
            }
          }
          return null;
        } catch (fallbackError) {
          // If fallback also fails, return null
          return null;
        }
      }
    });
  }

  /// Creates a new product
  /// 
  /// [data] - The product data to create. Required fields:
  /// - name: Product name
  /// - sku: Stock keeping unit
  /// - category_id: Category ID
  /// - cost_price: Cost price
  /// - selling_price: Selling price
  /// 
  /// Optional fields:
  /// - barcode: Product barcode
  /// - description: Product description
  /// - supplier_id: Supplier ID
  /// - min_stock: Minimum stock level
  /// - initial_stock: Initial stock quantity
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<Product> createProduct(
    Map<String, dynamic> data, {
    String? requestId,
  }) async {
    // Validate required fields
    BaseService.validateRequired('name', data['name']?.toString());
    BaseService.validateRequired('sku', data['sku']?.toString());
    BaseService.validateNumeric('category_id', data['category_id'], min: 1);
    BaseService.validateNumeric('cost_price', data['cost_price'], min: 0);
    BaseService.validateNumeric('selling_price', data['selling_price'], min: 0);
    
    // Validate optional fields if present
    if (data['supplier_id'] != null) {
      BaseService.validateNumeric('supplier_id', data['supplier_id'], min: 1);
    }
    if (data['min_stock'] != null) {
      BaseService.validateNumeric('min_stock', data['min_stock'], min: 0);
    }
    if (data['initial_stock'] != null) {
      BaseService.validateNumeric('initial_stock', data['initial_stock'], min: 0);
    }
    
    return BaseService.handleRequest('create product', () async {
      // Convert field names to camelCase for API
      final apiData = <String, dynamic>{
        'name': data['name'],
        'sku': data['sku'],
        'categoryId': data['category_id'],
        'costPrice': data['cost_price'],
        'sellingPrice': data['selling_price'],
        if (data['barcode'] != null) 'barcode': data['barcode'],
        if (data['description'] != null) 'description': data['description'],
        if (data['supplier_id'] != null) 'supplierId': data['supplier_id'],
        if (data['min_stock'] != null) 'minStock': data['min_stock'],
        if (data['initial_stock'] != null) 'initialStock': data['initial_stock'],
      };
      
      final response = await ApiService.post(
        '/products',
        data: apiData,
        requestId: requestId,
      );
      
      return Product.fromJson(BaseService.parseItem(response, key: 'product'));
    });
  }

  /// Updates an existing product
  /// 
  /// [id] - The ID of the product to update
  /// [data] - The updated product data (see createProduct for field details)
  /// [requestId] - Optional request ID for cancellation
  static Future<Product> updateProduct(
    int id,
    Map<String, dynamic> data, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    // Validate fields if present
    if (data['name'] != null) BaseService.validateRequired('name', data['name'].toString());
    if (data['sku'] != null) BaseService.validateRequired('sku', data['sku'].toString());
    if (data['category_id'] != null) BaseService.validateNumeric('category_id', data['category_id'], min: 1);
    if (data['supplier_id'] != null) BaseService.validateNumeric('supplier_id', data['supplier_id'], min: 1);
    if (data['cost_price'] != null) BaseService.validateNumeric('cost_price', data['cost_price'], min: 0);
    if (data['selling_price'] != null) BaseService.validateNumeric('selling_price', data['selling_price'], min: 0);
    if (data['min_stock'] != null) BaseService.validateNumeric('min_stock', data['min_stock'], min: 0);
    
    return BaseService.handleRequest('update product $id', () async {
      // Convert field names to camelCase for API
      final apiData = <String, dynamic>{};
      if (data['name'] != null) apiData['name'] = data['name'];
      if (data['sku'] != null) apiData['sku'] = data['sku'];
      if (data['category_id'] != null) apiData['categoryId'] = data['category_id'];
      if (data['supplier_id'] != null) apiData['supplierId'] = data['supplier_id'];
      if (data['cost_price'] != null) apiData['costPrice'] = data['cost_price'];
      if (data['selling_price'] != null) apiData['sellingPrice'] = data['selling_price'];
      if (data['min_stock'] != null) apiData['minStock'] = data['min_stock'];
      if (data['barcode'] != null) apiData['barcode'] = data['barcode'];
      if (data['description'] != null) apiData['description'] = data['description'];
      
      final response = await ApiService.put(
        '/products/$id',
        data: apiData,
        requestId: requestId,
      );
      
      return Product.fromJson(BaseService.parseItem(response, key: 'product'));
    });
  }

  /// Deletes a product
  /// 
  /// [id] - The ID of the product to delete
  /// [requestId] - Optional request ID for cancellation
  static Future<bool> deleteProduct(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('delete product $id', () async {
      final response = await ApiService.delete(
        '/products/$id',
        requestId: requestId,
      );
      return BaseService.parseSuccess(response);
    });
  }

  /// Creates a quick product from barcode when product not found
  /// 
  /// [barcode] - The barcode for the new product
  /// [name] - The product name
  /// [defaultCategoryId] - Default category ID to use (defaults to 1)
  /// [requestId] - Optional request ID for cancellation
  static Future<Product> createProductFromBarcode(
    String barcode,
    String name, {
    int defaultCategoryId = 1,
    String? requestId,
  }) async {
    BaseService.validateRequired('barcode', barcode);
    BaseService.validateRequired('name', name);
    
    // Generate a simple SKU from barcode or timestamp
    final sku = 'SKU-${barcode.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '')}';
    
    return BaseService.handleRequest('create product from barcode', () async {
      final productData = {
        'name': name.trim(),
        'sku': sku,
        'barcode': barcode.trim(),
        'category_id': defaultCategoryId,
        'cost_price': 1.0, // Default cost price (must be > 0)
        'selling_price': 2.0, // Default selling price (must be > 0)
        'description': 'Product created from barcode scan',
        'min_stock': 1,
        'initial_stock': 0,
      };
      
      return await createProduct(productData, requestId: requestId);
    });
  }
}
