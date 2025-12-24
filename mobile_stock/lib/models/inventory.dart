import 'dart:developer' as developer;
import 'product.dart';

class InventoryOverview {
  final InventoryStats stats;
  final List<Product> lowStockProducts;

  InventoryOverview({
    required this.stats,
    required this.lowStockProducts,
  });

  factory InventoryOverview.fromJson(Map<String, dynamic> json) {
    return InventoryOverview(
      stats: InventoryStats.fromJson(json['stats'] ?? {}),
      lowStockProducts: (json['lowStockProducts'] as List? ?? [])
          .map((item) => Product.fromJson(item))
          .toList(),
    );
  }
}

class InventoryStats {
  final int totalProducts;
  final int lowStockItems;
  final int outOfStockItems;
  final double inventoryValue;

  InventoryStats({
    int? totalProducts,
    int? lowStockItems,
    int? outOfStockItems,
    double? inventoryValue,
  })  : totalProducts = totalProducts ?? 0,
        lowStockItems = lowStockItems ?? 0,
        outOfStockItems = outOfStockItems ?? 0,
        inventoryValue = inventoryValue ?? 0.0;

  factory InventoryStats.fromJson(Map<String, dynamic> json) {
    try {
      developer.log(
        '📦 Parsing InventoryStats from: ${json.toString()}',
        name: 'InventoryStats',
        level: 800,
      );
      
      // Handle different field naming conventions from the backend
      final totalProducts = (json['totalProducts'] ?? 
                           json['total_products'] ?? 
                           json['totalProjects'] ?? // Common typo
                           0).toInt();
      
      final lowStockItems = (json['lowStockItems'] ?? 
                           json['low_stock_products'] ?? 
                           json['lowStockCount'] ?? 
                           0).toInt();
      
      final outOfStockItems = (json['outOfStockItems'] ?? 
                             json['out_of_stock_products'] ?? 
                             json['outOfStockCount'] ?? 
                             0).toInt();
      
      final inventoryValue = (json['inventoryValue'] ?? 
                            json['total_inventory_value'] ?? 
                            json['totalValue'] ?? 
                            0).toDouble();
      
      final result = InventoryStats(
        totalProducts: totalProducts,
        lowStockItems: lowStockItems,
        outOfStockItems: outOfStockItems,
        inventoryValue: inventoryValue,
      );
      
      developer.log(
        '✅ Parsed InventoryStats: ${totalProducts} products, ${lowStockItems} low stock',
        name: 'InventoryStats',
        level: 800,
      );
      
      return result;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error parsing InventoryStats: $e',
        error: e,
        stackTrace: stackTrace,
        name: 'InventoryStats',
        level: 1000,
      );
      return InventoryStats();
    }
  }
}