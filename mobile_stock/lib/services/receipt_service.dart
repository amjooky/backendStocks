import 'package:meta/meta.dart';
import 'package:intl/intl.dart';

import '../models/pos_models.dart';
import '../models/models.dart';
import 'base_service.dart';

/// Service for generating and managing receipts
@immutable
class ReceiptService extends BaseService {
  static String get serviceName => 'ReceiptService';

  /// Generate complete receipt data for a sale
  static ReceiptData generateReceipt({
    required Sale sale,
    BusinessInfo? businessInfo,
    String? cashierName,
    String? receiptFooter,
  }) {
    return ReceiptData(
      sale: sale,
      businessInfo: businessInfo ?? _getDefaultBusinessInfo(),
      cashierName: cashierName ?? 'System',
      generatedAt: DateTime.now(),
      receiptFooter: receiptFooter,
    );
  }

  /// Generate receipt for printing (formatted text)
  static String generatePrintableReceipt({
    required Sale sale,
    BusinessInfo? businessInfo,
    String? cashierName,
    String? receiptFooter,
    int lineWidth = 40,
  }) {
    final receipt = generateReceipt(
      sale: sale,
      businessInfo: businessInfo,
      cashierName: cashierName,
      receiptFooter: receiptFooter,
    );

    return _formatReceiptForPrint(receipt, lineWidth);
  }

  /// Generate receipt for email/sharing (HTML format)
  static String generateHtmlReceipt({
    required Sale sale,
    BusinessInfo? businessInfo,
    String? cashierName,
    String? receiptFooter,
  }) {
    final receipt = generateReceipt(
      sale: sale,
      businessInfo: businessInfo,
      cashierName: cashierName,
      receiptFooter: receiptFooter,
    );

    return _formatReceiptAsHtml(receipt);
  }

  /// Generate receipt for display (structured data)
  static Map<String, dynamic> generateReceiptJson({
    required Sale sale,
    BusinessInfo? businessInfo,
    String? cashierName,
    String? receiptFooter,
  }) {
    final receipt = generateReceipt(
      sale: sale,
      businessInfo: businessInfo,
      cashierName: cashierName,
      receiptFooter: receiptFooter,
    );

    return receipt.toJson();
  }

  /// Get default business information
  static BusinessInfo _getDefaultBusinessInfo() {
    return BusinessInfo(
      name: 'Stock Management System',
      address: '',
      phone: '',
      email: '',
      website: '',
      taxId: '',
    );
  }

  /// Format receipt for thermal printing
  static String _formatReceiptForPrint(ReceiptData receipt, int lineWidth) {
    final buffer = StringBuffer();
    final currency = NumberFormat.currency(symbol: '\$');
    final dateFormat = DateFormat('MMM dd, yyyy HH:mm');

    // Header
    buffer.writeln(_centerText(receipt.businessInfo.name, lineWidth));
    if (receipt.businessInfo.address.isNotEmpty) {
      buffer.writeln(_centerText(receipt.businessInfo.address, lineWidth));
    }
    if (receipt.businessInfo.phone.isNotEmpty) {
      buffer.writeln(_centerText('Tel: ${receipt.businessInfo.phone}', lineWidth));
    }
    buffer.writeln('=' * lineWidth);

    // Receipt info
    buffer.writeln('Receipt #: ${receipt.sale.formattedReceiptNumber}');
    buffer.writeln('Date: ${dateFormat.format(receipt.sale.createdAt)}');
    buffer.writeln('Cashier: ${receipt.cashierName}');
    
    if (receipt.sale.customer != null) {
      buffer.writeln('Customer: ${receipt.sale.customer!.name}');
    }
    
    buffer.writeln('-' * lineWidth);

    // Items
    buffer.writeln(_formatLine('ITEM', 'QTY', 'PRICE', 'TOTAL', lineWidth));
    buffer.writeln('-' * lineWidth);

    for (final item in receipt.sale.items) {
      final itemName = _truncateText(item.productName, lineWidth - 20);
      buffer.writeln(itemName);
      
      final qtyText = '${item.quantity}';
      final priceText = currency.format(item.unitPrice);
      final totalText = currency.format(item.total);
      
      buffer.writeln(_formatLine('', qtyText, priceText, totalText, lineWidth));
      
      if (item.discountAmount > 0) {
        final discountText = '  Discount: -${currency.format(item.discountAmount)}';
        buffer.writeln(discountText);
      }
    }

    buffer.writeln('-' * lineWidth);

    // Totals
    buffer.writeln(_alignRight('Subtotal: ${currency.format(receipt.sale.subtotal)}', lineWidth));
    
    if (receipt.sale.totalDiscount > 0) {
      buffer.writeln(_alignRight('Total Discount: -${currency.format(receipt.sale.totalDiscount)}', lineWidth));
    }
    
    if (receipt.sale.totalTax > 0) {
      buffer.writeln(_alignRight('Tax: ${currency.format(receipt.sale.totalTax)}', lineWidth));
    }
    
    buffer.writeln('=' * lineWidth);
    buffer.writeln(_alignRight('TOTAL: ${currency.format(receipt.sale.total)}', lineWidth));
    buffer.writeln('=' * lineWidth);

    // Payment info
    if (receipt.sale.payments.isNotEmpty) {
      for (final payment in receipt.sale.payments) {
        buffer.writeln(_alignRight('${payment.method.label}: ${currency.format(payment.amount)}', lineWidth));
      }
      
      final changeAmount = receipt.sale.amountPaid - receipt.sale.total;
      if (changeAmount > 0) {
        buffer.writeln(_alignRight('Change: ${currency.format(changeAmount)}', lineWidth));
      }
    }

    // Applied promotions
    if (receipt.sale.appliedPromotions.isNotEmpty) {
      buffer.writeln('-' * lineWidth);
      buffer.writeln('APPLIED DISCOUNTS:');
      for (final promo in receipt.sale.appliedPromotions) {
        buffer.writeln('${promo.promotionName}: -${currency.format(promo.discountAmount)}');
      }
    }

    // Loyalty points
    if (receipt.sale.loyaltyPointsRedeemed != null && receipt.sale.loyaltyPointsRedeemed! > 0) {
      buffer.writeln('Points Redeemed: ${receipt.sale.loyaltyPointsRedeemed}');
    }
    if (receipt.sale.loyaltyPointsEarned != null && receipt.sale.loyaltyPointsEarned! > 0) {
      buffer.writeln('Points Earned: ${receipt.sale.loyaltyPointsEarned}');
    }

    // Footer
    buffer.writeln('-' * lineWidth);
    buffer.writeln(_centerText('Thank you for shopping with us!', lineWidth));
    
    if (receipt.receiptFooter?.isNotEmpty == true) {
      buffer.writeln(_centerText(receipt.receiptFooter!, lineWidth));
    }
    
    buffer.writeln(_centerText('Generated: ${dateFormat.format(receipt.generatedAt)}', lineWidth));
    buffer.writeln();

    return buffer.toString();
  }

  /// Format receipt as HTML for email/web display
  static String _formatReceiptAsHtml(ReceiptData receipt) {
    final currency = NumberFormat.currency(symbol: '\$');
    final dateFormat = DateFormat('MMM dd, yyyy HH:mm');

    return '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${receipt.sale.formattedReceiptNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .info { margin: 10px 0; }
        .items { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .items th, .items td { text-align: left; padding: 5px; border-bottom: 1px solid #ddd; }
        .items th { background-color: #f5f5f5; }
        .total-row { font-weight: bold; border-top: 2px solid #333; }
        .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; }
        .discount { color: #d9534f; }
        .loyalty { color: #5bc0de; }
    </style>
</head>
<body>
    <div class="header">
        <h2>${receipt.businessInfo.name}</h2>
        ${receipt.businessInfo.address.isNotEmpty ? '<p>${receipt.businessInfo.address}</p>' : ''}
        ${receipt.businessInfo.phone.isNotEmpty ? '<p>Tel: ${receipt.businessInfo.phone}</p>' : ''}
    </div>
    
    <div class="info">
        <p><strong>Receipt #:</strong> ${receipt.sale.formattedReceiptNumber}</p>
        <p><strong>Date:</strong> ${dateFormat.format(receipt.sale.createdAt)}</p>
        <p><strong>Cashier:</strong> ${receipt.cashierName}</p>
        ${receipt.sale.customer != null ? '<p><strong>Customer:</strong> ${receipt.sale.customer!.name}</p>' : ''}
    </div>
    
    <table class="items">
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${receipt.sale.items.map((item) => '''
            <tr>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>${currency.format(item.unitPrice)}</td>
                <td>${currency.format(item.total)}</td>
            </tr>
            ${item.discountAmount > 0 ? '<tr><td colspan="4" class="discount">Discount: -${currency.format(item.discountAmount)}</td></tr>' : ''}
            ''').join('')}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3"><strong>Subtotal:</strong></td>
                <td><strong>${currency.format(receipt.sale.subtotal)}</strong></td>
            </tr>
            ${receipt.sale.totalDiscount > 0 ? '''
            <tr class="discount">
                <td colspan="3"><strong>Total Discount:</strong></td>
                <td><strong>-${currency.format(receipt.sale.totalDiscount)}</strong></td>
            </tr>
            ''' : ''}
            ${receipt.sale.totalTax > 0 ? '''
            <tr>
                <td colspan="3"><strong>Tax:</strong></td>
                <td><strong>${currency.format(receipt.sale.totalTax)}</strong></td>
            </tr>
            ''' : ''}
            <tr class="total-row">
                <td colspan="3"><strong>TOTAL:</strong></td>
                <td><strong>${currency.format(receipt.sale.total)}</strong></td>
            </tr>
        </tfoot>
    </table>
    
    ${receipt.sale.payments.isNotEmpty ? '''
    <div class="info">
        <h3>Payment Information</h3>
        ${receipt.sale.payments.map((payment) => '<p><strong>${payment.method.label}:</strong> ${currency.format(payment.amount)}</p>').join('')}
        ${receipt.sale.amountPaid - receipt.sale.total > 0 ? '<p><strong>Change:</strong> ${currency.format(receipt.sale.amountPaid - receipt.sale.total)}</p>' : ''}
    </div>
    ''' : ''}
    
    ${receipt.sale.appliedPromotions.isNotEmpty ? '''
    <div class="info">
        <h3>Applied Discounts</h3>
        ${receipt.sale.appliedPromotions.map((promo) => '<p class="discount">${promo.promotionName}: -${currency.format(promo.discountAmount)}</p>').join('')}
    </div>
    ''' : ''}
    
    ${(receipt.sale.loyaltyPointsRedeemed != null && receipt.sale.loyaltyPointsRedeemed! > 0) || (receipt.sale.loyaltyPointsEarned != null && receipt.sale.loyaltyPointsEarned! > 0) ? '''
    <div class="info loyalty">
        <h3>Loyalty Points</h3>
        ${receipt.sale.loyaltyPointsRedeemed != null && receipt.sale.loyaltyPointsRedeemed! > 0 ? '<p>Points Redeemed: ${receipt.sale.loyaltyPointsRedeemed}</p>' : ''}
        ${receipt.sale.loyaltyPointsEarned != null && receipt.sale.loyaltyPointsEarned! > 0 ? '<p>Points Earned: ${receipt.sale.loyaltyPointsEarned}</p>' : ''}
    </div>
    ''' : ''}
    
    <div class="footer">
        <p><strong>Thank you for shopping with us!</strong></p>
        ${receipt.receiptFooter?.isNotEmpty == true ? '<p>${receipt.receiptFooter}</p>' : ''}
        <p><small>Generated: ${dateFormat.format(receipt.generatedAt)}</small></p>
    </div>
</body>
</html>
    ''';
  }

  // Helper methods for text formatting
  static String _centerText(String text, int lineWidth) {
    if (text.length >= lineWidth) return text;
    final padding = (lineWidth - text.length) ~/ 2;
    return ' ' * padding + text;
  }

  static String _alignRight(String text, int lineWidth) {
    if (text.length >= lineWidth) return text;
    final padding = lineWidth - text.length;
    return ' ' * padding + text;
  }

  static String _truncateText(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static String _formatLine(String col1, String col2, String col3, String col4, int lineWidth) {
    final colWidth = (lineWidth - 3) ~/ 4; // 3 spaces for separators
    return _truncateText(col1, colWidth).padRight(colWidth) + ' ' +
           _truncateText(col2, colWidth).padRight(colWidth) + ' ' +
           _truncateText(col3, colWidth).padRight(colWidth) + ' ' +
           _truncateText(col4, colWidth);
  }
}

/// Complete receipt data structure
class ReceiptData {
  final Sale sale;
  final BusinessInfo businessInfo;
  final String cashierName;
  final DateTime generatedAt;
  final String? receiptFooter;

  ReceiptData({
    required this.sale,
    required this.businessInfo,
    required this.cashierName,
    required this.generatedAt,
    this.receiptFooter,
  });

  Map<String, dynamic> toJson() {
    return {
      'sale': sale.toJson(),
      'businessInfo': businessInfo.toJson(),
      'cashierName': cashierName,
      'generatedAt': generatedAt.toIso8601String(),
      'receiptFooter': receiptFooter,
    };
  }
}

/// Business information for receipts
class BusinessInfo {
  final String name;
  final String address;
  final String phone;
  final String email;
  final String website;
  final String taxId;

  BusinessInfo({
    required this.name,
    required this.address,
    required this.phone,
    required this.email,
    required this.website,
    required this.taxId,
  });

  factory BusinessInfo.fromJson(Map<String, dynamic> json) {
    return BusinessInfo(
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      website: json['website'] ?? '',
      taxId: json['taxId'] ?? json['tax_id'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'address': address,
      'phone': phone,
      'email': email,
      'website': website,
      'taxId': taxId,
    };
  }
}