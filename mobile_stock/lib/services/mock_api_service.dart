import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';

/// Mock API Service that provides realistic stock management data
/// This replaces the real API calls until a proper stock management backend is available
class MockApiService {
  static const Duration _simulatedDelay = Duration(milliseconds: 500);
  
  /// Simulate network delay
  static Future<void> _delay() async {
    await Future.delayed(_simulatedDelay);
  }

  /// Mock Authentication
  static Future<Map<String, dynamic>> login(String username, String password) async {
    await _delay();
    
    if (username == 'admin' && password == 'admin123') {
      const token = 'mock_jwt_token_12345';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      
      return {
        'success': true,
        'token': token,
        'user': {
          'id': 1,
          'username': username,
          'email': 'admin@stockapp.com',
          'role': 'admin',
          'first_name': 'Admin',
          'last_name': 'User',
        }
      };
    }
    throw Exception('Invalid credentials');
  }

  /// Mock Dashboard Data
  static Future<Map<String, dynamic>> getDashboard() async {
    await _delay();
    
    final random = Random();
    return {
      'success': true,
      'today': {
        'totalSales': 12450.0 + random.nextDouble() * 1000,
        'totalOrders': 45 + random.nextInt(10),
        'averageOrderValue': 276.67 + random.nextDouble() * 50,
        'newCustomers': 8 + random.nextInt(5),
      },
      'month': {
        'totalSales': 245678.50 + random.nextDouble() * 10000,
        'totalOrders': 892 + random.nextInt(100),
        'averageOrderValue': 275.42 + random.nextDouble() * 25,
        'newCustomers': 156 + random.nextInt(20),
      },
      'inventory': {
        'totalProducts': 1245 + random.nextInt(50),
        'lowStockCount': 23 + random.nextInt(10),
        'totalValue': 89456.78 + random.nextDouble() * 5000,
        'outOfStockCount': 5 + random.nextInt(3),
        'categoriesCount': 15 + random.nextInt(3),
      },
      'topProducts': [
        {
          'id': 1,
          'name': 'MacBook Pro 14"',
          'sku': 'MBP14-001',
          'salesAmount': 15670.0,
          'quantitySold': 12
        },
        {
          'id': 2,
          'name': 'iPhone 15 Pro',
          'sku': 'IP15P-001',
          'salesAmount': 12890.0,
          'quantitySold': 15
        },
        {
          'id': 3,
          'name': 'Samsung Galaxy S24',
          'sku': 'SGS24-001',
          'salesAmount': 8940.0,
          'quantitySold': 11
        }
      ],
      'lowStockProducts': [
        {
          'id': 4,
          'name': 'Dell XPS 13',
          'sku': 'XPS13-001',
          'currentStock': 3,
          'minStock': 10,
          'price': 1299.99
        },
        {
          'id': 5,
          'name': 'iPad Air',
          'sku': 'IPAD-AIR-001',
          'currentStock': 2,
          'minStock': 8,
          'price': 599.99
        }
      ]
    };
  }

  /// Mock Products
  static Future<Map<String, dynamic>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
    bool lowStock = false,
  }) async {
    await _delay();

    final products = _generateMockProducts();
    var filteredProducts = products;

    if (search != null && search.isNotEmpty) {
      filteredProducts = products
          .where((p) => p['name'].toString().toLowerCase().contains(search.toLowerCase()))
          .toList();
    }

    if (categoryId != null) {
      filteredProducts = filteredProducts.where((p) => p['categoryId'] == categoryId).toList();
    }

    if (lowStock) {
      filteredProducts = filteredProducts.where((p) => (p['currentStock'] as int) < (p['minStock'] as int)).toList();
    }

    final startIndex = (page - 1) * limit;
    final endIndex = startIndex + limit;
    final paginatedProducts = filteredProducts.sublist(
      startIndex,
      endIndex > filteredProducts.length ? filteredProducts.length : endIndex,
    );

    return {
      'success': true,
      'products': paginatedProducts,
      'pagination': {
        'page': page,
        'limit': limit,
        'total': filteredProducts.length,
        'pages': (filteredProducts.length / limit).ceil(),
      }
    };
  }

  /// Mock Categories
  static Future<Map<String, dynamic>> getCategories() async {
    await _delay();
    return {
      'success': true,
      'categories': [
        {'id': 1, 'name': 'Electronics', 'description': 'Electronic devices and accessories'},
        {'id': 2, 'name': 'Computers', 'description': 'Laptops, desktops, and computer accessories'},
        {'id': 3, 'name': 'Mobile Phones', 'description': 'Smartphones and mobile accessories'},
        {'id': 4, 'name': 'Tablets', 'description': 'Tablets and tablet accessories'},
        {'id': 5, 'name': 'Audio', 'description': 'Headphones, speakers, and audio equipment'},
      ]
    };
  }

  /// Mock Suppliers
  static Future<Map<String, dynamic>> getSuppliers() async {
    await _delay();
    return {
      'success': true,
      'suppliers': [
        {'id': 1, 'name': 'Apple Inc.', 'email': 'supplier@apple.com', 'phone': '+1-800-APL-CARE'},
        {'id': 2, 'name': 'Samsung Electronics', 'email': 'b2b@samsung.com', 'phone': '+1-800-SAMSUNG'},
        {'id': 3, 'name': 'Dell Technologies', 'email': 'sales@dell.com', 'phone': '+1-800-WWW-DELL'},
        {'id': 4, 'name': 'HP Inc.', 'email': 'business@hp.com', 'phone': '+1-800-HP-HELP'},
        {'id': 5, 'name': 'Lenovo Group', 'email': 'enterprise@lenovo.com', 'phone': '+1-855-253-6686'},
      ]
    };
  }

  /// Mock Inventory Overview
  static Future<Map<String, dynamic>> getInventoryOverview() async {
    await _delay();
    final random = Random();
    
    return {
      'success': true,
      'totalProducts': 1245 + random.nextInt(50),
      'lowStockCount': 23 + random.nextInt(10),
      'totalValue': 89456.78 + random.nextDouble() * 5000,
      'outOfStockCount': 5 + random.nextInt(3),
      'categoriesCount': 15 + random.nextInt(3),
    };
  }

  /// Mock Stock Movements
  static Future<Map<String, dynamic>> getStockMovements({
    int page = 1,
    int limit = 20,
    int? productId,
  }) async {
    await _delay();
    
    final movements = _generateMockStockMovements();
    var filteredMovements = movements;

    if (productId != null) {
      filteredMovements = movements.where((m) => m['productId'] == productId).toList();
    }

    final startIndex = (page - 1) * limit;
    final endIndex = startIndex + limit;
    final paginatedMovements = filteredMovements.sublist(
      startIndex,
      endIndex > filteredMovements.length ? filteredMovements.length : endIndex,
    );

    return {
      'success': true,
      'movements': paginatedMovements,
      'pagination': {
        'page': page,
        'limit': limit,
        'total': filteredMovements.length,
        'pages': (filteredMovements.length / limit).ceil(),
      }
    };
  }

  /// Mock Reports
  static Future<Map<String, dynamic>> getFinancialReport({
    required String startDate,
    required String endDate,
  }) async {
    await _delay();
    final random = Random();
    
    return {
      'success': true,
      'total_revenue': 245678.50 + random.nextDouble() * 10000,
      'total_cost': 156789.32 + random.nextDouble() * 8000,
      'gross_profit': 88889.18 + random.nextDouble() * 5000,
      'profit_margin': 36.2 + random.nextDouble() * 10,
      'daily_summary': _generateDailySummary(),
      'by_category': _generateCategorySummary(),
      'top_products': _generateTopProducts(),
    };
  }

  /// Stock Operations - Mock Success Responses
  static Future<Map<String, dynamic>> stockIn(Map<String, dynamic> data) async {
    await _delay();
    return {'success': true, 'message': 'Stock added successfully'};
  }

  static Future<Map<String, dynamic>> stockOut(Map<String, dynamic> data) async {
    await _delay();
    return {'success': true, 'message': 'Stock removed successfully'};
  }

  static Future<Map<String, dynamic>> adjustStock(Map<String, dynamic> data) async {
    await _delay();
    return {'success': true, 'message': 'Stock adjusted successfully'};
  }

  /// Helper Methods
  static List<Map<String, dynamic>> _generateMockProducts() {
    return [
      {
        'id': 1,
        'name': 'MacBook Pro 14"',
        'sku': 'MBP14-001',
        'description': 'Apple MacBook Pro 14-inch with M3 Pro chip',
        'price': 1999.00,
        'cost': 1400.00,
        'currentStock': 25,
        'minStock': 10,
        'maxStock': 100,
        'categoryId': 2,
        'supplierId': 1,
        'barcode': '123456789012',
        'status': 'active'
      },
      {
        'id': 2,
        'name': 'iPhone 15 Pro',
        'sku': 'IP15P-001',
        'description': 'iPhone 15 Pro 128GB Space Black',
        'price': 999.00,
        'cost': 700.00,
        'currentStock': 45,
        'minStock': 20,
        'maxStock': 200,
        'categoryId': 3,
        'supplierId': 1,
        'barcode': '123456789013',
        'status': 'active'
      },
      {
        'id': 3,
        'name': 'Samsung Galaxy S24',
        'sku': 'SGS24-001',
        'description': 'Samsung Galaxy S24 256GB Phantom Black',
        'price': 899.00,
        'cost': 600.00,
        'currentStock': 32,
        'minStock': 15,
        'maxStock': 150,
        'categoryId': 3,
        'supplierId': 2,
        'barcode': '123456789014',
        'status': 'active'
      },
      {
        'id': 4,
        'name': 'Dell XPS 13',
        'sku': 'XPS13-001',
        'description': 'Dell XPS 13 Laptop Intel i7 16GB RAM',
        'price': 1299.00,
        'cost': 900.00,
        'currentStock': 3,
        'minStock': 10,
        'maxStock': 80,
        'categoryId': 2,
        'supplierId': 3,
        'barcode': '123456789015',
        'status': 'active'
      },
      {
        'id': 5,
        'name': 'iPad Air',
        'sku': 'IPAD-AIR-001',
        'description': 'iPad Air 10.9-inch 64GB Wi-Fi',
        'price': 599.00,
        'cost': 400.00,
        'currentStock': 2,
        'minStock': 8,
        'maxStock': 120,
        'categoryId': 4,
        'supplierId': 1,
        'barcode': '123456789016',
        'status': 'active'
      },
    ];
  }

  static List<Map<String, dynamic>> _generateMockStockMovements() {
    final now = DateTime.now();
    return [
      {
        'id': 1,
        'productId': 1,
        'productName': 'MacBook Pro 14"',
        'type': 'in',
        'quantity': 10,
        'reference': 'PO-2024-001',
        'notes': 'New stock arrival',
        'createdAt': now.subtract(const Duration(hours: 2)).toIso8601String(),
      },
      {
        'id': 2,
        'productId': 2,
        'productName': 'iPhone 15 Pro',
        'type': 'out',
        'quantity': 5,
        'reference': 'SO-2024-002',
        'notes': 'Customer order fulfillment',
        'createdAt': now.subtract(const Duration(hours: 4)).toIso8601String(),
      },
      {
        'id': 3,
        'productId': 4,
        'productName': 'Dell XPS 13',
        'type': 'adjustment',
        'quantity': -2,
        'reference': 'ADJ-2024-001',
        'notes': 'Inventory count adjustment',
        'createdAt': now.subtract(const Duration(days: 1)).toIso8601String(),
      },
    ];
  }

  static List<Map<String, dynamic>> _generateDailySummary() {
    final summaries = <Map<String, dynamic>>[];
    final now = DateTime.now();
    final random = Random();
    
    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      summaries.add({
        'date': date.toIso8601String().split('T')[0],
        'revenue': 3500.0 + random.nextDouble() * 2000,
        'cost': 2100.0 + random.nextDouble() * 1200,
        'profit': 1400.0 + random.nextDouble() * 800,
        'transactions': 25 + random.nextInt(20),
      });
    }
    return summaries;
  }

  static List<Map<String, dynamic>> _generateCategorySummary() {
    return [
      {'category_id': 1, 'name': 'Electronics', 'revenue': 45678.0, 'cost': 28900.0, 'profit': 16778.0, 'transactions': 156},
      {'category_id': 2, 'name': 'Computers', 'revenue': 89456.0, 'cost': 56789.0, 'profit': 32667.0, 'transactions': 89},
      {'category_id': 3, 'name': 'Mobile Phones', 'revenue': 67890.0, 'cost': 43456.0, 'profit': 24434.0, 'transactions': 234},
    ];
  }

  static List<Map<String, dynamic>> _generateTopProducts() {
    return [
      {'product_id': 1, 'name': 'MacBook Pro 14"', 'sku': 'MBP14-001', 'revenue': 23980.0, 'cost': 16786.0, 'profit': 7194.0, 'quantity': 12},
      {'product_id': 2, 'name': 'iPhone 15 Pro', 'sku': 'IP15P-001', 'revenue': 14985.0, 'cost': 10500.0, 'profit': 4485.0, 'quantity': 15},
      {'product_id': 3, 'name': 'Samsung Galaxy S24', 'sku': 'SGS24-001', 'revenue': 9879.0, 'cost': 6600.0, 'profit': 3279.0, 'quantity': 11},
    ];
  }
}