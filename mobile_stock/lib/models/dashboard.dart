import 'dart:developer' as developer;
import 'product.dart';
import 'inventory.dart';

class DashboardData {
  final DashboardStats today;
  final DashboardStats month;
  final InventoryStats inventory;
  final List<TopProduct> topProducts;
  final List<Product> lowStockProducts;

  DashboardData({
    DashboardStats? today,
    DashboardStats? month,
    InventoryStats? inventory,
    List<TopProduct>? topProducts,
    List<Product>? lowStockProducts,
  })  : today = today ?? DashboardStats(),
        month = month ?? DashboardStats(),
        inventory = inventory ?? InventoryStats(),
        topProducts = topProducts ?? [],
        lowStockProducts = lowStockProducts ?? [];

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    try {
      developer.log(
        '🔍 Parsing DashboardData from JSON: ${json.toString()}',
        name: 'DashboardData',
        level: 800,
      );
      
      // Handle both direct response and nested data structure
      final data = json.containsKey('data') ? json['data'] as Map<String, dynamic> : json;
      
      return DashboardData(
        today: data['today'] != null
            ? DashboardStats.fromJson(
                data['today'] is Map ? data['today'] as Map<String, dynamic> : {})
            : null,
        month: data['month'] != null
            ? DashboardStats.fromJson(
                data['month'] is Map ? data['month'] as Map<String, dynamic> : {})
            : null,
        inventory: _parseInventoryStats(data),
        topProducts: _parseTopProducts(data),
        lowStockProducts: _parseLowStockProducts(data),
      );
    } catch (e, stackTrace) {
      developer.log(
        'Error parsing DashboardData: $e',
        error: e,
        stackTrace: stackTrace,
        name: 'DashboardData',
        level: 1000,
      );
      return DashboardData();
    }
  }
  
  static InventoryStats _parseInventoryStats(Map<String, dynamic> data) {
    // Try different possible keys for inventory data
    Map<String, dynamic>? inventoryData;
    
    if (data['inventory'] is Map) {
      inventoryData = data['inventory'] as Map<String, dynamic>;
    } else if (data.containsKey('totalProducts') || data.containsKey('total_products')) {
      // If the inventory data is at the root level
      inventoryData = data;
    }
    
    return inventoryData != null 
        ? InventoryStats.fromJson(inventoryData)
        : InventoryStats();
  }
  
  static List<TopProduct> _parseTopProducts(Map<String, dynamic> data) {
    List<dynamic>? products;
    
    if (data['topProducts'] is List) {
      products = data['topProducts'] as List;
    } else if (data['top_products'] is List) {
      products = data['top_products'] as List;
    }
    
    return products != null
        ? products
            .whereType<Map<String, dynamic>>()
            .map((item) => TopProduct.fromJson(item))
            .toList()
        : [];
  }
  
  static List<Product> _parseLowStockProducts(Map<String, dynamic> data) {
    List<dynamic>? products;
    
    if (data['lowStockProducts'] is List) {
      products = data['lowStockProducts'] as List;
    } else if (data['low_stock_products'] is List) {
      products = data['low_stock_products'] as List;
    }
    
    return products != null
        ? products
            .whereType<Map<String, dynamic>>()
            .map((item) => Product.fromJson(item))
            .toList()
        : [];
  }
}

class DashboardStats {
  final double totalSales;
  final int totalOrders;
  final double averageOrderValue;
  final int newCustomers;

  DashboardStats({
    double? totalSales,
    int? totalOrders,
    double? averageOrderValue,
    int? newCustomers,
  })  : totalSales = totalSales ?? 0.0,
        totalOrders = totalOrders ?? 0,
        averageOrderValue = averageOrderValue ?? 0.0,
        newCustomers = newCustomers ?? 0;

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    try {
      return DashboardStats(
        totalSales: (json['totalSales'] ?? 0).toDouble(),
        totalOrders: (json['totalOrders'] ?? 0).toInt(),
        averageOrderValue: (json['averageOrderValue'] ?? 0).toDouble(),
        newCustomers: (json['newCustomers'] ?? 0).toInt(),
      );
    } catch (e, stackTrace) {
      developer.log(
        'Error parsing DashboardStats',
        error: e,
        stackTrace: stackTrace,
        name: 'DashboardStats',
      );
      return DashboardStats();
    }
  }
}

class TopProduct {
  final int id;
  final String name;
  final String sku;
  final double salesAmount;
  final int quantitySold;

  TopProduct({
    int? id,
    String? name,
    String? sku,
    double? salesAmount,
    int? quantitySold,
  })  : id = id ?? 0,
        name = name ?? '',
        sku = sku ?? '',
        salesAmount = salesAmount ?? 0.0,
        quantitySold = quantitySold ?? 0;

  factory TopProduct.fromJson(Map<String, dynamic> json) {
    try {
      return TopProduct(
        id: (json['id'] ?? 0).toInt(),
        name: (json['name'] ?? '').toString(),
        sku: (json['sku'] ?? '').toString(),
        salesAmount: (json['salesAmount'] ?? 0).toDouble(),
        quantitySold: (json['quantitySold'] ?? 0).toInt(),
      );
    } catch (e, stackTrace) {
      developer.log(
        'Error parsing TopProduct',
        error: e,
        stackTrace: stackTrace,
        name: 'TopProduct',
      );
      return TopProduct();
    }
  }
}