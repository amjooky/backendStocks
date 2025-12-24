class Product {
  final int id;
  final String name;
  final String? description;
  final String sku;
  final String? barcode;
  final int categoryId;
  final int? supplierId;
  final double costPrice;
  final double sellingPrice;
  final double price; // alias for sellingPrice
  final int minStockLevel;
  final int currentStock;
  final int reservedStock;
  final bool isLowStock;
  final String? categoryName;
  final String? supplierName;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.sku,
    this.barcode,
    required this.categoryId,
    this.supplierId,
    required this.costPrice,
    required this.sellingPrice,
    required this.price,
    required this.minStockLevel,
    required this.currentStock,
    required this.reservedStock,
    required this.isLowStock,
    this.categoryName,
    this.supplierName,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
      sku: json['sku'] ?? '',
      barcode: json['barcode'],
      categoryId: json['category_id'] ?? 0,
      supplierId: json['supplier_id'],
      costPrice: (json['cost_price'] ?? 0).toDouble(),
      sellingPrice: (json['selling_price'] ?? 0).toDouble(),
      price: (json['price'] ?? json['selling_price'] ?? 0).toDouble(),
      minStockLevel: json['min_stock_level'] ?? 0,
      currentStock: json['current_stock'] ?? 0,
      reservedStock: json['reserved_stock'] ?? 0,
      isLowStock: json['is_low_stock'] == 1 || json['is_low_stock'] == true,
      categoryName: json['category_name'],
      supplierName: json['supplier_name'],
      isActive: json['is_active'] == 1 || json['is_active'] == true,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'sku': sku,
      'barcode': barcode,
      'categoryId': categoryId,
      'supplierId': supplierId,
      'costPrice': costPrice,
      'sellingPrice': sellingPrice,
      'minStockLevel': minStockLevel,
    };
  }

  double get profitMargin => sellingPrice > 0 
      ? ((sellingPrice - costPrice) / sellingPrice * 100) 
      : 0.0;

  double get profitAmount => sellingPrice - costPrice;

  String get stockStatus {
    if (currentStock == 0) return 'Out of Stock';
    if (isLowStock) return 'Low Stock';
    return 'In Stock';
  }
}
