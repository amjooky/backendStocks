import 'package:meta/meta.dart';
import 'pos_models.dart';

@immutable
class Receipt {
  final String id;
  final DateTime timestamp;
  final List<SaleItem> items;
  final Customer? customer;
  final double subtotal;
  final double tax;
  final double discount;
  final double total;
  final PaymentMethod paymentMethod;
  final double? cashAmount;
  final double? changeAmount;
  final String? notes;
  final List<int>? appliedPromotions;
  final int? loyaltyPointsRedeemed;
  final String receiptNumber;

  const Receipt({
    required this.id,
    required this.timestamp,
    required this.items,
    this.customer,
    required this.subtotal,
    required this.tax,
    required this.discount,
    required this.total,
    required this.paymentMethod,
    this.cashAmount,
    this.changeAmount,
    this.notes,
    this.appliedPromotions,
    this.loyaltyPointsRedeemed,
    required this.receiptNumber,
  });

  factory Receipt.fromJson(Map<String, dynamic> json) {
    return Receipt(
      id: json['id'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      items: (json['items'] as List<dynamic>)
          .map((item) => SaleItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      customer: json['customer'] != null 
          ? Customer.fromJson(json['customer'] as Map<String, dynamic>)
          : null,
      subtotal: (json['subtotal'] as num).toDouble(),
      tax: (json['tax'] as num).toDouble(),
      discount: (json['discount'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      paymentMethod: PaymentMethod.values.firstWhere(
        (e) => e.toString().split('.').last == json['paymentMethod'],
        orElse: () => PaymentMethod.cash,
      ),
      cashAmount: json['cashAmount'] != null ? (json['cashAmount'] as num).toDouble() : null,
      changeAmount: json['changeAmount'] != null ? (json['changeAmount'] as num).toDouble() : null,
      notes: json['notes'] as String?,
      appliedPromotions: json['appliedPromotions'] != null
          ? List<int>.from(json['appliedPromotions'] as List<dynamic>)
          : null,
      loyaltyPointsRedeemed: json['loyaltyPointsRedeemed'] as int?,
      receiptNumber: json['receiptNumber'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp.toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(),
      'customer': customer?.toJson(),
      'subtotal': subtotal,
      'tax': tax,
      'discount': discount,
      'total': total,
      'paymentMethod': paymentMethod.toString().split('.').last,
      'cashAmount': cashAmount,
      'changeAmount': changeAmount,
      'notes': notes,
      'appliedPromotions': appliedPromotions,
      'loyaltyPointsRedeemed': loyaltyPointsRedeemed,
      'receiptNumber': receiptNumber,
    };
  }

  /// Generates a formatted receipt text for display/printing
  String generateReceiptText({
    String? storeName,
    String? storeAddress,
    String? storePhone,
    String? cashierName,
  }) {
    final buffer = StringBuffer();
    
    // Header
    buffer.writeln('==============================');
    buffer.writeln('        ${storeName ?? 'STOCK MANAGEMENT'}');
    if (storeAddress != null) {
      buffer.writeln('       $storeAddress');
    }
    if (storePhone != null) {
      buffer.writeln('       Phone: $storePhone');
    }
    buffer.writeln('==============================');
    buffer.writeln();
    
    // Receipt info
    buffer.writeln('Receipt #: $receiptNumber');
    buffer.writeln('Date: ${_formatDateTime(timestamp)}');
    if (cashierName != null) {
      buffer.writeln('Cashier: $cashierName');
    }
    if (customer != null) {
      buffer.writeln('Customer: ${customer!.name}');
      if (customer!.email != null) {
        buffer.writeln('Email: ${customer!.email}');
      }
    }
    buffer.writeln('Payment: ${paymentMethod.label}');
    buffer.writeln();
    
    // Items
    buffer.writeln('ITEMS:');
    buffer.writeln('------------------------------');
    
    for (final item in items) {
      buffer.writeln(item.productName);
      buffer.writeln('  ${item.quantity} x \$${item.unitPrice.toStringAsFixed(2)} = \$${item.subtotal.toStringAsFixed(2)}');
      if (item.discount > 0) {
        buffer.writeln('  Discount: -\$${item.discount.toStringAsFixed(2)}');
      }
      if (item.taxAmount > 0) {
        buffer.writeln('  Tax: \$${item.taxAmount.toStringAsFixed(2)}');
      }
      buffer.writeln();
    }
    
    // Totals
    buffer.writeln('------------------------------');
    buffer.writeln('Subtotal:        \$${subtotal.toStringAsFixed(2)}');
    
    if (discount > 0) {
      buffer.writeln('Discount:       -\$${discount.toStringAsFixed(2)}');
    }
    
    if (tax > 0) {
      buffer.writeln('Tax:             \$${tax.toStringAsFixed(2)}');
    }
    
    buffer.writeln('------------------------------');
    buffer.writeln('TOTAL:           \$${total.toStringAsFixed(2)}');
    
    if (paymentMethod == PaymentMethod.cash && cashAmount != null) {
      buffer.writeln('Cash Received:   \$${cashAmount!.toStringAsFixed(2)}');
      if (changeAmount != null && changeAmount! > 0) {
        buffer.writeln('Change:          \$${changeAmount!.toStringAsFixed(2)}');
      }
    }
    
    buffer.writeln('==============================');
    
    if (loyaltyPointsRedeemed != null && loyaltyPointsRedeemed! > 0) {
      buffer.writeln('Loyalty Points Used: $loyaltyPointsRedeemed');
    }
    
    if (notes != null && notes!.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('Notes: $notes');
    }
    
    buffer.writeln();
    buffer.writeln('    Thank you for your business!');
    buffer.writeln('==============================');
    
    return buffer.toString();
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  Receipt copyWith({
    String? id,
    DateTime? timestamp,
    List<SaleItem>? items,
    Customer? customer,
    double? subtotal,
    double? tax,
    double? discount,
    double? total,
    PaymentMethod? paymentMethod,
    double? cashAmount,
    double? changeAmount,
    String? notes,
    List<int>? appliedPromotions,
    int? loyaltyPointsRedeemed,
    String? receiptNumber,
  }) {
    return Receipt(
      id: id ?? this.id,
      timestamp: timestamp ?? this.timestamp,
      items: items ?? this.items,
      customer: customer ?? this.customer,
      subtotal: subtotal ?? this.subtotal,
      tax: tax ?? this.tax,
      discount: discount ?? this.discount,
      total: total ?? this.total,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      cashAmount: cashAmount ?? this.cashAmount,
      changeAmount: changeAmount ?? this.changeAmount,
      notes: notes ?? this.notes,
      appliedPromotions: appliedPromotions ?? this.appliedPromotions,
      loyaltyPointsRedeemed: loyaltyPointsRedeemed ?? this.loyaltyPointsRedeemed,
      receiptNumber: receiptNumber ?? this.receiptNumber,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Receipt &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Receipt(id: $id, receiptNumber: $receiptNumber, total: \$${total.toStringAsFixed(2)})';
}