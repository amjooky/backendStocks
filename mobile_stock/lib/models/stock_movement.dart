class StockMovement {
  final int id;
  final int productId;
  final String movementType; // 'in', 'out', 'adjustment'
  final int quantity;
  final int previousStock;
  final int newStock;
  final double? costPerUnit;
  final String? reference;
  final String? notes;
  final int userId;
  final String? productName;
  final String? sku;
  final String? userName;
  final DateTime createdAt;

  StockMovement({
    required this.id,
    required this.productId,
    required this.movementType,
    required this.quantity,
    required this.previousStock,
    required this.newStock,
    this.costPerUnit,
    this.reference,
    this.notes,
    required this.userId,
    this.productName,
    this.sku,
    this.userName,
    required this.createdAt,
  });

  factory StockMovement.fromJson(Map<String, dynamic> json) {
    return StockMovement(
      id: json['id'] ?? 0,
      productId: json['product_id'] ?? 0,
      movementType: json['movement_type'] ?? '',
      quantity: json['quantity'] ?? 0,
      previousStock: json['previous_stock'] ?? 0,
      newStock: json['new_stock'] ?? 0,
      costPerUnit: json['cost_per_unit']?.toDouble(),
      reference: json['reference'],
      notes: json['notes'],
      userId: json['user_id'] ?? 0,
      productName: json['product_name'],
      sku: json['sku'],
      userName: json['user_name'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}