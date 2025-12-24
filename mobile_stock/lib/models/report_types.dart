import 'models.dart';

class SalesReport {
  final double totalRevenue;
  final int totalSales;
  final List<SalesSummary> summary;
  final List<ProductSaleSummary> topProducts;

  SalesReport({
    required this.totalRevenue,
    required this.totalSales,
    required this.summary,
    required this.topProducts,
  });

  factory SalesReport.fromJson(Map<String, dynamic> json) {
    return SalesReport(
      totalRevenue: (json['total_revenue'] ?? 0).toDouble(),
      totalSales: json['total_sales'] ?? 0,
      summary: (json['summary'] as List? ?? [])
          .map((item) => SalesSummary.fromJson(item))
          .toList(),
      topProducts: (json['top_products'] as List? ?? [])
          .map((item) => ProductSaleSummary.fromJson(item))
          .toList(),
    );
  }
}

class SalesSummary {
  final String date;
  final double revenue;
  final int sales;

  SalesSummary({
    required this.date,
    required this.revenue,
    required this.sales,
  });

  factory SalesSummary.fromJson(Map<String, dynamic> json) {
    return SalesSummary(
      date: json['date'] ?? '',
      revenue: (json['revenue'] ?? 0).toDouble(),
      sales: json['sales'] ?? 0,
    );
  }
}

class ProductSaleSummary {
  final int productId;
  final String name;
  final String sku;
  final int quantity;
  final double revenue;

  ProductSaleSummary({
    required this.productId,
    required this.name,
    required this.sku,
    required this.quantity,
    required this.revenue,
  });

  factory ProductSaleSummary.fromJson(Map<String, dynamic> json) {
    return ProductSaleSummary(
      productId: json['product_id'] ?? 0,
      name: json['name'] ?? '',
      sku: json['sku'] ?? '',
      quantity: json['quantity'] ?? 0,
      revenue: (json['revenue'] ?? 0).toDouble(),
    );
  }
}

class InventoryReport {
  final InventoryOverview overview;
  final List<CategoryInventory> byCategory;
  final List<StockMovement> recentMovements;

  InventoryReport({
    required this.overview,
    required this.byCategory,
    required this.recentMovements,
  });

  factory InventoryReport.fromJson(Map<String, dynamic> json) {
    return InventoryReport(
      overview: InventoryOverview.fromJson(json['overview'] ?? {}),
      byCategory: (json['by_category'] as List? ?? [])
          .map((item) => CategoryInventory.fromJson(item))
          .toList(),
      recentMovements: (json['recent_movements'] as List? ?? [])
          .map((item) => StockMovement.fromJson(item))
          .toList(),
    );
  }
}

class CategoryInventory {
  final int categoryId;
  final String name;
  final int totalProducts;
  final int lowStockProducts;
  final double totalValue;

  CategoryInventory({
    required this.categoryId,
    required this.name,
    required this.totalProducts,
    required this.lowStockProducts,
    required this.totalValue,
  });

  factory CategoryInventory.fromJson(Map<String, dynamic> json) {
    return CategoryInventory(
      categoryId: json['category_id'] ?? 0,
      name: json['name'] ?? '',
      totalProducts: json['total_products'] ?? 0,
      lowStockProducts: json['low_stock_products'] ?? 0,
      totalValue: (json['total_value'] ?? 0).toDouble(),
    );
  }
}

class FinancialReport {
  final double totalRevenue;
  final double totalCost;
  final double grossProfit;
  final double profitMargin;
  final List<DailySummary> dailySummary;
  final List<CategorySummary> byCategory;
  final List<ProductSummary> topProducts;

  FinancialReport({
    required this.totalRevenue,
    required this.totalCost,
    required this.grossProfit,
    required this.profitMargin,
    required this.dailySummary,
    required this.byCategory,
    required this.topProducts,
  });

  factory FinancialReport.fromJson(Map<String, dynamic> json) {
    return FinancialReport(
      totalRevenue: (json['total_revenue'] ?? 0).toDouble(),
      totalCost: (json['total_cost'] ?? 0).toDouble(),
      grossProfit: (json['gross_profit'] ?? 0).toDouble(),
      profitMargin: (json['profit_margin'] ?? 0).toDouble(),
      dailySummary: (json['daily_summary'] as List? ?? [])
          .map((item) => DailySummary.fromJson(item))
          .toList(),
      byCategory: (json['by_category'] as List? ?? [])
          .map((item) => CategorySummary.fromJson(item))
          .toList(),
      topProducts: (json['top_products'] as List? ?? [])
          .map((item) => ProductSummary.fromJson(item))
          .toList(),
    );
  }
}

class DailySummary {
  final String date;
  final double revenue;
  final double cost;
  final double profit;
  final int transactions;

  DailySummary({
    required this.date,
    required this.revenue,
    required this.cost,
    required this.profit,
    required this.transactions,
  });

  factory DailySummary.fromJson(Map<String, dynamic> json) {
    return DailySummary(
      date: json['date'] ?? '',
      revenue: (json['revenue'] ?? 0).toDouble(),
      cost: (json['cost'] ?? 0).toDouble(),
      profit: (json['profit'] ?? 0).toDouble(),
      transactions: json['transactions'] ?? 0,
    );
  }
}

class CategorySummary {
  final int categoryId;
  final String name;
  final double revenue;
  final double cost;
  final double profit;
  final int transactions;

  CategorySummary({
    required this.categoryId,
    required this.name,
    required this.revenue,
    required this.cost,
    required this.profit,
    required this.transactions,
  });

  factory CategorySummary.fromJson(Map<String, dynamic> json) {
    return CategorySummary(
      categoryId: json['category_id'] ?? 0,
      name: json['name'] ?? '',
      revenue: (json['revenue'] ?? 0).toDouble(),
      cost: (json['cost'] ?? 0).toDouble(),
      profit: (json['profit'] ?? 0).toDouble(),
      transactions: json['transactions'] ?? 0,
    );
  }
}

class ProductSummary {
  final int productId;
  final String name;
  final String sku;
  final double revenue;
  final double cost;
  final double profit;
  final int quantity;

  ProductSummary({
    required this.productId,
    required this.name,
    required this.sku,
    required this.revenue,
    required this.cost,
    required this.profit,
    required this.quantity,
  });

  factory ProductSummary.fromJson(Map<String, dynamic> json) {
    return ProductSummary(
      productId: json['product_id'] ?? 0,
      name: json['name'] ?? '',
      sku: json['sku'] ?? '',
      revenue: (json['revenue'] ?? 0).toDouble(),
      cost: (json['cost'] ?? 0).toDouble(),
      profit: (json['profit'] ?? 0).toDouble(),
      quantity: json['quantity'] ?? 0,
    );
  }
}

// Additional missing report model classes

class ProductPerformanceReport {
  final List<ProductSummary> topProducts;
  final List<ProductSummary> lowPerforming;
  final double averageRevenue;
  final int totalProducts;
  
  ProductPerformanceReport({
    required this.topProducts,
    required this.lowPerforming,
    required this.averageRevenue,
    required this.totalProducts,
  });
  
  factory ProductPerformanceReport.fromJson(Map<String, dynamic> json) {
    return ProductPerformanceReport(
      topProducts: (json['top_products'] as List? ?? [])
          .map((item) => ProductSummary.fromJson(item))
          .toList(),
      lowPerforming: (json['low_performing'] as List? ?? [])
          .map((item) => ProductSummary.fromJson(item))
          .toList(),
      averageRevenue: (json['average_revenue'] ?? 0).toDouble(),
      totalProducts: json['total_products'] ?? 0,
    );
  }
}

class SupplierPerformanceReport {
  final List<SupplierSummary> suppliers;
  final double averageRating;
  final int totalSuppliers;
  
  SupplierPerformanceReport({
    required this.suppliers,
    required this.averageRating,
    required this.totalSuppliers,
  });
  
  factory SupplierPerformanceReport.fromJson(Map<String, dynamic> json) {
    return SupplierPerformanceReport(
      suppliers: (json['suppliers'] as List? ?? [])
          .map((item) => SupplierSummary.fromJson(item))
          .toList(),
      averageRating: (json['average_rating'] ?? 0).toDouble(),
      totalSuppliers: json['total_suppliers'] ?? 0,
    );
  }
}

class SupplierSummary {
  final int supplierId;
  final String name;
  final double totalPurchases;
  final int deliveryTime;
  final double rating;
  final int totalOrders;
  
  SupplierSummary({
    required this.supplierId,
    required this.name,
    required this.totalPurchases,
    required this.deliveryTime,
    required this.rating,
    required this.totalOrders,
  });
  
  factory SupplierSummary.fromJson(Map<String, dynamic> json) {
    return SupplierSummary(
      supplierId: json['supplier_id'] ?? 0,
      name: json['name'] ?? '',
      totalPurchases: (json['total_purchases'] ?? 0).toDouble(),
      deliveryTime: json['delivery_time'] ?? 0,
      rating: (json['rating'] ?? 0).toDouble(),
      totalOrders: json['total_orders'] ?? 0,
    );
  }
}

class BusinessReport {
  final SalesReport sales;
  final InventoryReport inventory;
  final FinancialReport financial;
  final DateTime reportDate;
  
  BusinessReport({
    required this.sales,
    required this.inventory,
    required this.financial,
    required this.reportDate,
  });
  
  factory BusinessReport.fromJson(Map<String, dynamic> json) {
    return BusinessReport(
      sales: SalesReport.fromJson(json['sales'] ?? {}),
      inventory: InventoryReport.fromJson(json['inventory'] ?? {}),
      financial: FinancialReport.fromJson(json['financial'] ?? {}),
      reportDate: DateTime.tryParse(json['report_date'] ?? '') ?? DateTime.now(),
    );
  }
}

