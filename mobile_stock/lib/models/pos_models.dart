import 'package:intl/intl.dart';

/// Customer model for POS transactions
class Customer {
  final int? id;
  final String name;
  final String? email;
  final String? phone;
  final String? address;
  final double totalSpent;
  final int totalOrders;
  final DateTime createdAt;

  Customer({
    this.id,
    required this.name,
    this.email,
    this.phone,
    this.address,
    this.totalSpent = 0.0,
    this.totalOrders = 0,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      name: json['name'] ?? '',
      email: json['email'],
      phone: json['phone'],
      address: json['address'],
      totalSpent: (json['totalSpent'] ?? 0.0).toDouble(),
      totalOrders: json['totalOrders'] ?? 0,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'address': address,
      'totalSpent': totalSpent,
      'totalOrders': totalOrders,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  Customer copyWith({
    int? id,
    String? name,
    String? email,
    String? phone,
    String? address,
    double? totalSpent,
    int? totalOrders,
    DateTime? createdAt,
  }) {
    return Customer(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      totalSpent: totalSpent ?? this.totalSpent,
      totalOrders: totalOrders ?? this.totalOrders,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Sale item model for individual products in a sale
class SaleItem {
  final int? id;
  final int productId;
  final String productName;
  final String? productSku;
  final double unitPrice;
  final int quantity;
  final double discount;
  final double tax;

  SaleItem({
    this.id,
    required this.productId,
    required this.productName,
    this.productSku,
    required this.unitPrice,
    required this.quantity,
    this.discount = 0.0,
    this.tax = 0.0,
  });

  double get subtotal => unitPrice * quantity;
  double get discountAmount => subtotal * (discount / 100);
  double get taxAmount => (subtotal - discountAmount) * (tax / 100);
  double get total => subtotal - discountAmount + taxAmount;

  factory SaleItem.fromJson(Map<String, dynamic> json) {
    return SaleItem(
      id: json['id'],
      productId: json['productId'] ?? json['product_id'],
      productName: json['productName'] ?? json['product_name'] ?? '',
      productSku: json['productSku'] ?? json['product_sku'],
      unitPrice: (json['unitPrice'] ?? json['unit_price'] ?? 0.0).toDouble(),
      quantity: json['quantity'] ?? 0,
      discount: (json['discount'] ?? 0.0).toDouble(),
      tax: (json['tax'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'productId': productId,
      'productName': productName,
      'productSku': productSku,
      'unitPrice': unitPrice,
      'quantity': quantity,
      'discount': discount,
      'tax': tax,
      'subtotal': subtotal,
      'total': total,
    };
  }

  SaleItem copyWith({
    int? id,
    int? productId,
    String? productName,
    String? productSku,
    double? unitPrice,
    int? quantity,
    double? discount,
    double? tax,
  }) {
    return SaleItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      productSku: productSku ?? this.productSku,
      unitPrice: unitPrice ?? this.unitPrice,
      quantity: quantity ?? this.quantity,
      discount: discount ?? this.discount,
      tax: tax ?? this.tax,
    );
  }
}

/// Payment method enumeration
enum PaymentMethod {
  cash(value: 'cash', label: 'Cash'),
  card(value: 'card', label: 'Credit/Debit Card'),
  digitalWallet(value: 'digital_wallet', label: 'Digital Wallet'),
  bankTransfer(value: 'bank_transfer', label: 'Bank Transfer'),
  split(value: 'split', label: 'Split Payment');

  const PaymentMethod({
    required this.value,
    required this.label,
  });

  final String value;
  final String label;

  static PaymentMethod fromString(String value) {
    return PaymentMethod.values.firstWhere(
      (method) => method.value == value,
      orElse: () => PaymentMethod.cash,
    );
  }
}

/// Payment model for transaction payments
class Payment {
  final int? id;
  final PaymentMethod method;
  final double amount;
  final String? reference;
  final DateTime timestamp;

  Payment({
    this.id,
    required this.method,
    required this.amount,
    this.reference,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'],
      method: PaymentMethod.fromString(json['method'] ?? 'cash'),
      amount: (json['amount'] ?? 0.0).toDouble(),
      reference: json['reference'],
      timestamp: json['timestamp'] != null 
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'method': method.value,
      'amount': amount,
      'reference': reference,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

/// Sale status enumeration
enum SaleStatus {
  pending(value: 'pending', label: 'Pending'),
  completed(value: 'completed', label: 'Completed'),
  cancelled(value: 'cancelled', label: 'Cancelled'),
  refunded(value: 'refunded', label: 'Refunded');

  const SaleStatus({
    required this.value,
    required this.label,
  });

  final String value;
  final String label;

  static SaleStatus fromString(String value) {
    return SaleStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => SaleStatus.pending,
    );
  }
}

/// Main Sale model
class Sale {
  final int? id;
  final String? receiptNumber;
  final List<SaleItem> items;
  final Customer? customer;
  final List<Payment> payments;
  final List<AppliedPromotion> appliedPromotions;
  final int? loyaltyPointsRedeemed;
  final int? loyaltyPointsEarned;
  final double subtotal;
  final double totalDiscount;
  final double totalTax;
  final double total;
  final SaleStatus status;
  final String? notes;
  final DateTime createdAt;
  final String? createdBy;
  final int? sessionId;

  Sale({
    this.id,
    this.receiptNumber,
    required this.items,
    this.customer,
    required this.payments,
    this.appliedPromotions = const [],
    this.loyaltyPointsRedeemed,
    this.loyaltyPointsEarned,
    required this.subtotal,
    required this.totalDiscount,
    required this.totalTax,
    required this.total,
    this.status = SaleStatus.pending,
    this.notes,
    DateTime? createdAt,
    this.createdBy,
    this.sessionId,
  }) : createdAt = createdAt ?? DateTime.now();

  // Calculate totals from items
  factory Sale.fromItems({
    int? id,
    String? receiptNumber,
    required List<SaleItem> items,
    Customer? customer,
    List<Payment>? payments,
    List<AppliedPromotion>? appliedPromotions,
    int? loyaltyPointsRedeemed,
    int? loyaltyPointsEarned,
    SaleStatus status = SaleStatus.pending,
    String? notes,
    DateTime? createdAt,
    String? createdBy,
    int? sessionId,
  }) {
    final subtotal = items.fold<double>(0.0, (sum, item) => sum + item.subtotal);
    final totalDiscount = items.fold<double>(0.0, (sum, item) => sum + item.discountAmount);
    final totalTax = items.fold<double>(0.0, (sum, item) => sum + item.taxAmount);
    final total = items.fold<double>(0.0, (sum, item) => sum + item.total);

    return Sale(
      id: id,
      receiptNumber: receiptNumber,
      items: items,
      customer: customer,
      payments: payments ?? [],
      appliedPromotions: appliedPromotions ?? [],
      loyaltyPointsRedeemed: loyaltyPointsRedeemed,
      loyaltyPointsEarned: loyaltyPointsEarned,
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      totalTax: totalTax,
      total: total,
      status: status,
      notes: notes,
      createdAt: createdAt,
      createdBy: createdBy,
      sessionId: sessionId,
    );
  }

  factory Sale.fromJson(Map<String, dynamic> json) {
    return Sale(
      id: json['id'],
      receiptNumber: json['receiptNumber'] ?? json['receipt_number'],
      items: json['items'] != null
          ? (json['items'] as List)
              .map((item) => SaleItem.fromJson(item))
              .toList()
          : [],
      customer: json['customer'] != null 
          ? Customer.fromJson(json['customer'])
          : null,
      payments: json['payments'] != null
          ? (json['payments'] as List)
              .map((payment) => Payment.fromJson(payment))
              .toList()
          : [],
      appliedPromotions: json['appliedPromotions'] != null || json['applied_promotions'] != null
          ? ((json['appliedPromotions'] ?? json['applied_promotions']) as List)
              .map((promo) => AppliedPromotion.fromJson(promo))
              .toList()
          : [],
      loyaltyPointsRedeemed: json['loyaltyPointsRedeemed'] ?? json['loyalty_points_redeemed'],
      loyaltyPointsEarned: json['loyaltyPointsEarned'] ?? json['loyalty_points_earned'],
      subtotal: (json['subtotal'] ?? 0.0).toDouble(),
      totalDiscount: (json['totalDiscount'] ?? json['total_discount'] ?? 0.0).toDouble(),
      totalTax: (json['totalTax'] ?? json['total_tax'] ?? 0.0).toDouble(),
      total: (json['total'] ?? 0.0).toDouble(),
      status: SaleStatus.fromString(json['status'] ?? 'pending'),
      notes: json['notes'],
      createdAt: json['createdAt'] != null || json['created_at'] != null
          ? DateTime.parse(json['createdAt'] ?? json['created_at'])
          : DateTime.now(),
      createdBy: json['createdBy'] ?? json['created_by'],
      sessionId: json['sessionId'] ?? json['session_id'],
    );
  }

  Map<String, dynamic> toJson() {
    // Format for API request - matches web app structure
    return {
      'items': items.map((item) => {
        'productId': item.productId,
        'quantity': item.quantity,
        'unitPrice': item.unitPrice,
        'discount': item.discount,
        'tax': item.tax,
      }).toList(),
      if (customer?.id != null) 'customerId': customer!.id,
      'paymentMethod': payments.isNotEmpty ? payments.first.method.value : 'cash',
      if (appliedPromotions.isNotEmpty) 
        'appliedPromotions': appliedPromotions.map((p) => p.promotionId).toList(),
      if (loyaltyPointsRedeemed != null && loyaltyPointsRedeemed! > 0) 
        'loyaltyPointsRedeemed': loyaltyPointsRedeemed,
      if (notes?.isNotEmpty == true) 'notes': notes,
    };
  }

  // Get amount paid
  double get amountPaid => payments.fold<double>(0.0, (sum, payment) => sum + payment.amount);
  
  // Get remaining balance
  double get balance => total - amountPaid;
  
  // Check if fully paid
  bool get isFullyPaid => balance <= 0.01; // Account for floating point precision
  
  // Get formatted receipt number
  String get formattedReceiptNumber => receiptNumber ?? 'TXN-${id?.toString().padLeft(6, '0') ?? DateTime.now().millisecondsSinceEpoch.toString()}';
  
  // Get formatted date
  String get formattedDate => DateFormat('MMM dd, yyyy HH:mm').format(createdAt);

  Sale copyWith({
    int? id,
    String? receiptNumber,
    List<SaleItem>? items,
    Customer? customer,
    List<Payment>? payments,
    double? subtotal,
    double? totalDiscount,
    double? totalTax,
    double? total,
    SaleStatus? status,
    String? notes,
    DateTime? createdAt,
    String? createdBy,
  }) {
    return Sale(
      id: id ?? this.id,
      receiptNumber: receiptNumber ?? this.receiptNumber,
      items: items ?? this.items,
      customer: customer ?? this.customer,
      payments: payments ?? this.payments,
      subtotal: subtotal ?? this.subtotal,
      totalDiscount: totalDiscount ?? this.totalDiscount,
      totalTax: totalTax ?? this.totalTax,
      total: total ?? this.total,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }
}

/// Sales summary for reporting
class SalesSummary {
  final DateTime date;
  final int totalSales;
  final double totalRevenue;
  final double averageOrderValue;
  final int totalItems;
  final PaymentMethodSummary paymentMethodBreakdown;

  SalesSummary({
    required this.date,
    required this.totalSales,
    required this.totalRevenue,
    required this.averageOrderValue,
    required this.totalItems,
    required this.paymentMethodBreakdown,
  });

  factory SalesSummary.fromJson(Map<String, dynamic> json) {
    return SalesSummary(
      date: DateTime.parse(json['date']),
      totalSales: json['totalSales'] ?? json['total_sales'] ?? 0,
      totalRevenue: (json['totalRevenue'] ?? json['total_revenue'] ?? 0.0).toDouble(),
      averageOrderValue: (json['averageOrderValue'] ?? json['average_order_value'] ?? 0.0).toDouble(),
      totalItems: json['totalItems'] ?? json['total_items'] ?? 0,
      paymentMethodBreakdown: PaymentMethodSummary.fromJson(
        json['paymentMethodBreakdown'] ?? json['payment_method_breakdown'] ?? {}
      ),
    );
  }
}

/// Payment method breakdown for summaries
class PaymentMethodSummary {
  final double cash;
  final double card;
  final double digitalWallet;
  final double bankTransfer;

  PaymentMethodSummary({
    required this.cash,
    required this.card,
    required this.digitalWallet,
    required this.bankTransfer,
  });

  factory PaymentMethodSummary.fromJson(Map<String, dynamic> json) {
    return PaymentMethodSummary(
      cash: (json['cash'] ?? 0.0).toDouble(),
      card: (json['card'] ?? 0.0).toDouble(),
      digitalWallet: (json['digitalWallet'] ?? json['digital_wallet'] ?? 0.0).toDouble(),
      bankTransfer: (json['bankTransfer'] ?? json['bank_transfer'] ?? 0.0).toDouble(),
    );
  }

  double get total => cash + card + digitalWallet + bankTransfer;
}

/// Promotion model for discount handling
class Promotion {
  final int id;
  final String name;
  final String description;
  final String type; // 'percentage', 'fixed_amount', 'buy_x_get_y'
  final double value;
  final double? minimumAmount;
  final DateTime startDate;
  final DateTime endDate;
  final bool isActive;
  final List<int>? applicableCategories;
  final List<int>? applicableProducts;
  final int? maxUsage;
  final int currentUsage;

  Promotion({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.value,
    this.minimumAmount,
    required this.startDate,
    required this.endDate,
    required this.isActive,
    this.applicableCategories,
    this.applicableProducts,
    this.maxUsage,
    required this.currentUsage,
  });

  factory Promotion.fromJson(Map<String, dynamic> json) {
    return Promotion(
      id: json['id'],
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? 'percentage',
      value: (json['value'] ?? 0.0).toDouble(),
      minimumAmount: json['minimumAmount']?.toDouble(),
      startDate: DateTime.parse(json['startDate'] ?? json['start_date']),
      endDate: DateTime.parse(json['endDate'] ?? json['end_date']),
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      applicableCategories: json['applicableCategories']?.cast<int>() ?? 
                           json['applicable_categories']?.cast<int>(),
      applicableProducts: json['applicableProducts']?.cast<int>() ?? 
                         json['applicable_products']?.cast<int>(),
      maxUsage: json['maxUsage'] ?? json['max_usage'],
      currentUsage: json['currentUsage'] ?? json['current_usage'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type,
      'value': value,
      'minimumAmount': minimumAmount,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'isActive': isActive,
      'applicableCategories': applicableCategories,
      'applicableProducts': applicableProducts,
      'maxUsage': maxUsage,
      'currentUsage': currentUsage,
    };
  }

  bool get isValid {
    final now = DateTime.now();
    return isActive && 
           now.isAfter(startDate) && 
           now.isBefore(endDate) &&
           (maxUsage == null || currentUsage < maxUsage!);
  }

  double calculateDiscount(double amount) {
    if (!isValid) return 0.0;
    if (minimumAmount != null && amount < minimumAmount!) return 0.0;

    switch (type) {
      case 'percentage':
        return amount * (value / 100);
      case 'fixed_amount':
        return value.clamp(0, amount);
      default:
        return 0.0;
    }
  }
}

/// Applied promotion for sale tracking
class AppliedPromotion {
  final int promotionId;
  final String promotionName;
  final String type;
  final double discountAmount;
  final double originalAmount;

  AppliedPromotion({
    required this.promotionId,
    required this.promotionName,
    required this.type,
    required this.discountAmount,
    required this.originalAmount,
  });

  factory AppliedPromotion.fromJson(Map<String, dynamic> json) {
    return AppliedPromotion(
      promotionId: json['promotionId'] ?? json['promotion_id'],
      promotionName: json['promotionName'] ?? json['promotion_name'] ?? '',
      type: json['type'] ?? '',
      discountAmount: (json['discountAmount'] ?? json['discount_amount'] ?? 0.0).toDouble(),
      originalAmount: (json['originalAmount'] ?? json['original_amount'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'promotionId': promotionId,
      'promotionName': promotionName,
      'type': type,
      'discountAmount': discountAmount,
      'originalAmount': originalAmount,
    };
  }
}

/// Loyalty points transaction
class LoyaltyTransaction {
  final int? id;
  final int customerId;
  final int points;
  final String type; // 'earned', 'redeemed'
  final String description;
  final int? saleId;
  final DateTime createdAt;

  LoyaltyTransaction({
    this.id,
    required this.customerId,
    required this.points,
    required this.type,
    required this.description,
    this.saleId,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory LoyaltyTransaction.fromJson(Map<String, dynamic> json) {
    return LoyaltyTransaction(
      id: json['id'],
      customerId: json['customerId'] ?? json['customer_id'],
      points: json['points'] ?? 0,
      type: json['type'] ?? 'earned',
      description: json['description'] ?? '',
      saleId: json['saleId'] ?? json['sale_id'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'customerId': customerId,
      'points': points,
      'type': type,
      'description': description,
      if (saleId != null) 'saleId': saleId,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Caisse session for tracking cash register operations
class CaisseSession {
  final int? id;
  final String cashierName;
  final double openingBalance;
  final double? closingBalance;
  final DateTime openedAt;
  final DateTime? closedAt;
  final bool isActive;
  final List<Sale> sales;

  CaisseSession({
    this.id,
    required this.cashierName,
    required this.openingBalance,
    this.closingBalance,
    DateTime? openedAt,
    this.closedAt,
    required this.isActive,
    this.sales = const [],
  }) : openedAt = openedAt ?? DateTime.now();

  factory CaisseSession.fromJson(Map<String, dynamic> json) {
    return CaisseSession(
      id: json['id'],
      cashierName: json['cashierName'] ?? json['cashier_name'] ?? '',
      openingBalance: (json['openingBalance'] ?? json['opening_balance'] ?? 0.0).toDouble(),
      closingBalance: (json['closingBalance'] ?? json['closing_balance'])?.toDouble(),
      openedAt: DateTime.parse(json['openedAt'] ?? json['opened_at'] ?? DateTime.now().toIso8601String()),
      closedAt: json['closedAt'] != null || json['closed_at'] != null
          ? DateTime.parse(json['closedAt'] ?? json['closed_at'])
          : null,
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      sales: json['sales'] != null
          ? (json['sales'] as List).map((sale) => Sale.fromJson(sale)).toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'cashierName': cashierName,
      'openingBalance': openingBalance,
      if (closingBalance != null) 'closingBalance': closingBalance,
      'openedAt': openedAt.toIso8601String(),
      if (closedAt != null) 'closedAt': closedAt!.toIso8601String(),
      'isActive': isActive,
      'sales': sales.map((sale) => sale.toJson()).toList(),
    };
  }

  double get totalSales => sales.fold(0.0, (sum, sale) => sum + sale.total);
  double get totalCash => sales
      .where((sale) => sale.payments.any((p) => p.method == PaymentMethod.cash))
      .fold(0.0, (sum, sale) => sum + sale.amountPaid);
  double get expectedClosingBalance => openingBalance + totalCash;
}
