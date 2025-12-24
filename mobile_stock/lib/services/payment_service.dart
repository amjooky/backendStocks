import 'package:meta/meta.dart';

import '../models/pos_models.dart' as pos;
import 'promotions_service.dart';
import 'loyalty_service.dart';
import 'stock_services.dart'; // This exports all needed services

/// Comprehensive payment service that handles the complete payment flow
@immutable
class PaymentService extends BaseService {
  static String get serviceName => 'PaymentService';

  /// Process a complete payment transaction
  static Future<PaymentResult> processPayment({
    required List<pos.SaleItem> items,
    pos.Customer? customer,
    List<int>? selectedPromotionIds,
    int? loyaltyPointsToRedeem,
    required pos.PaymentMethod paymentMethod,
    double? cashAmount,
    String? paymentReference,
    String? notes,
    int? sessionId,
    String? requestId,
  }) async {
    if (items.isEmpty) {
      throw ArgumentError('Payment must contain at least one item');
    }

    return BaseService.handleRequest('process payment', () async {
      // Step 1: Stock Validation
      await _validateStock(items, requestId: requestId);

      // Step 2: Price Calculation (before promotions and loyalty)
      var priceCalculation = _calculatePrices(items);

      // Step 3: Apply Promotions
      PromotionResult? promotionResult;
      if (selectedPromotionIds != null && selectedPromotionIds.isNotEmpty) {
        promotionResult = await PromotionsService.applyPromotions(
          items,
          selectedPromotionIds: selectedPromotionIds,
          requestId: requestId,
        );
        priceCalculation = priceCalculation.copyWith(
          totalDiscount: priceCalculation.totalDiscount + promotionResult.totalDiscount,
        );
      } else {
        // Apply automatic promotions
        final automaticPromotions = PromotionsService.calculateAutomaticDiscounts(items);
        if (automaticPromotions.appliedPromotions.isNotEmpty) {
          promotionResult = automaticPromotions;
          priceCalculation = priceCalculation.copyWith(
            totalDiscount: priceCalculation.totalDiscount + automaticPromotions.totalDiscount,
          );
        }
      }

      // Recalculate total after promotions
      priceCalculation = priceCalculation.copyWith(
        total: priceCalculation.subtotal - priceCalculation.totalDiscount + priceCalculation.totalTax,
      );

      // Step 4: Process Loyalty Points
      LoyaltyProcessingResult? loyaltyResult;
      if (customer != null) {
        loyaltyResult = await LoyaltyService.processLoyaltyForSale(
          customerId: customer.id!,
          saleTotal: priceCalculation.total,
          pointsToRedeem: loyaltyPointsToRedeem,
          requestId: requestId,
        );
        
        // Apply loyalty discount
        if (loyaltyResult.discountAmount > 0) {
          priceCalculation = priceCalculation.copyWith(
            totalDiscount: priceCalculation.totalDiscount + loyaltyResult.discountAmount,
            total: priceCalculation.total - loyaltyResult.discountAmount,
          );
        }
      }

      // Step 5: Payment Validation
      final paymentValidation = _validatePayment(
        paymentMethod: paymentMethod,
        totalAmount: priceCalculation.total,
        cashAmount: cashAmount,
      );

      // Step 6: Create and process sale with payment method
      final saleWithPayment = pos.Sale.fromItems(
        items: items,
        customer: customer,
        appliedPromotions: promotionResult?.appliedPromotions ?? [],
        loyaltyPointsRedeemed: loyaltyResult?.pointsRedeemed,
        loyaltyPointsEarned: loyaltyResult?.pointsEarned,
        notes: notes,
        sessionId: sessionId,
        payments: [
          pos.Payment(
            method: paymentMethod,
            amount: priceCalculation.total,
            reference: paymentReference,
          ),
        ],
      );
      
      // Send to API
      final response = await ApiService.post(
        '/sales',
        data: saleWithPayment.toJson(),
        requestId: requestId,
      );
      
      final processedSale = pos.Sale.fromJson(
        response.containsKey('sale')
            ? response['sale']
            : response,
      );

      // Step 8: Update Stock Levels
      await _updateStockLevels(items, requestId: requestId);

      // Step 9: Update Promotion Usage
      if (promotionResult != null && promotionResult.appliedPromotions.isNotEmpty) {
        await _updatePromotionUsage(promotionResult.appliedPromotions, requestId: requestId);
      }

      return PaymentResult(
        sale: processedSale,
        priceCalculation: priceCalculation,
        promotionResult: promotionResult,
        loyaltyResult: loyaltyResult,
        paymentValidation: paymentValidation,
        changeAmount: paymentValidation.changeAmount,
      );
    });
  }

  /// Validate stock availability for all items
  static Future<void> _validateStock(List<pos.SaleItem> items, {String? requestId}) async {
    for (final item in items) {
      try {
        final product = await ProductService.getProduct(item.productId);
        
        if (product.currentStock < item.quantity) {
          throw Exception(
            'Insufficient stock for ${product.name}. '
            'Available: ${product.currentStock}, Required: ${item.quantity}'
          );
        }
        
        if (!product.isActive) {
          throw Exception('Product ${product.name} is no longer active');
        }
      } catch (e) {
        throw Exception('Stock validation failed for item ${item.productName}: $e');
      }
    }
  }

  /// Calculate prices, taxes, and subtotals
  static PriceCalculation _calculatePrices(List<pos.SaleItem> items) {
    final subtotal = items.fold<double>(0.0, (sum, item) => sum + item.subtotal);
    final totalDiscount = items.fold<double>(0.0, (sum, item) => sum + item.discountAmount);
    final totalTax = items.fold<double>(0.0, (sum, item) => sum + item.taxAmount);
    final total = subtotal - totalDiscount + totalTax;

    return PriceCalculation(
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      totalTax: totalTax,
      total: total,
    );
  }

  /// Validate payment method and amounts
  static PaymentValidation _validatePayment({
    required pos.PaymentMethod paymentMethod,
    required double totalAmount,
    double? cashAmount,
  }) {
    if (totalAmount <= 0) {
      throw ArgumentError('Total amount must be greater than zero');
    }

    double changeAmount = 0.0;

    switch (paymentMethod) {
      case pos.PaymentMethod.cash:
        if (cashAmount == null || cashAmount <= 0) {
          throw ArgumentError('Cash amount must be provided and greater than zero for cash payments');
        }
        
        if (cashAmount < totalAmount) {
          throw ArgumentError(
            'Cash amount (\$${cashAmount.toStringAsFixed(2)}) is insufficient. '
            'Required: \$${totalAmount.toStringAsFixed(2)}'
          );
        }
        
        changeAmount = cashAmount - totalAmount;
        break;

      case pos.PaymentMethod.card:
      case pos.PaymentMethod.digitalWallet:
      case pos.PaymentMethod.bankTransfer:
        // For non-cash payments, the amount is exactly the total
        cashAmount = totalAmount;
        changeAmount = 0.0;
        break;

      default:
        throw ArgumentError('Unsupported payment method: ${paymentMethod.value}');
    }

    return PaymentValidation(
      isValid: true,
      totalAmount: totalAmount,
      amountPaid: cashAmount,
      changeAmount: changeAmount,
      paymentMethod: paymentMethod,
    );
  }

  /// Update stock levels after successful sale
  static Future<void> _updateStockLevels(List<pos.SaleItem> items, {String? requestId}) async {
    for (final item in items) {
      try {
        // Use inventory service to record stock-out movement
        await InventoryService.stockOut(
          productId: item.productId,
          quantity: item.quantity,
          reference: 'SALE',
          notes: 'Sale - ${item.productName} x${item.quantity}',
          requestId: requestId,
        );
      } catch (e) {
        // Log error but don't fail the transaction
        // In a production app, consider using a proper logging library
        // print('Warning: Failed to update stock for ${item.productName}: $e');
      }
    }
  }
  /// Update promotion usage counters
  static Future<void> _updatePromotionUsage(
    List<pos.AppliedPromotion> appliedPromotions, 
    {String? requestId}
  ) async {
    for (final promotion in appliedPromotions) {
      try {
        if (promotion.promotionId > 0) { // Only update real promotions, not automatic ones
          await PromotionsService.updatePromotionUsage(
            promotion.promotionId,
            requestId: requestId,
          );
        }
      } catch (e) {
        // Log error but don't fail the transaction
        // In a production app, consider using a proper logging library
        // print('Warning: Failed to update promotion usage for ${promotion.promotionName}: $e');
      }
    }
  }

  /// Pre-validate a potential sale before processing
  static Future<PaymentPreValidation> preValidatePayment({
    required List<pos.SaleItem> items,
    pos.Customer? customer,
    List<int>? selectedPromotionIds,
    int? loyaltyPointsToRedeem,
    String? requestId,
  }) async {
    if (items.isEmpty) {
      return PaymentPreValidation(
        isValid: false,
        errors: ['Cart is empty'],
      );
    }

    final errors = <String>[];

    try {
      // Check stock availability
      await _validateStock(items, requestId: requestId);
    } catch (e) {
      errors.add('Stock validation: $e');
    }

    // Calculate potential totals
    final priceCalculation = _calculatePrices(items);
    
    // Check promotions
    PromotionResult? promotionResult;
    try {
      if (selectedPromotionIds != null && selectedPromotionIds.isNotEmpty) {
        promotionResult = await PromotionsService.applyPromotions(
          items,
          selectedPromotionIds: selectedPromotionIds,
          requestId: requestId,
        );
      }
    } catch (e) {
      errors.add('Promotion validation: $e');
    }

    // Check loyalty points
    LoyaltyCalculation? loyaltyCalculation;
    if (customer != null && loyaltyPointsToRedeem != null && loyaltyPointsToRedeem > 0) {
      try {
        final customerPoints = await LoyaltyService.getCustomerPoints(customer.id!, requestId: requestId);
        loyaltyCalculation = LoyaltyService.calculateLoyaltyBenefits(
          saleTotal: priceCalculation.total - (promotionResult?.totalDiscount ?? 0),
          currentPoints: customerPoints,
          pointsToRedeem: loyaltyPointsToRedeem,
        );
        
        if (!loyaltyCalculation.canRedeem) {
          errors.add('Insufficient loyalty points for redemption');
        }
      } catch (e) {
        errors.add('Loyalty validation: $e');
      }
    }

    final finalTotal = priceCalculation.total 
        - (promotionResult?.totalDiscount ?? 0) 
        - (loyaltyCalculation?.discountAmount ?? 0);

    return PaymentPreValidation(
      isValid: errors.isEmpty,
      errors: errors,
      priceCalculation: priceCalculation,
      promotionResult: promotionResult,
      loyaltyCalculation: loyaltyCalculation,
      finalTotal: finalTotal,
    );
  }

  /// Calculate change for cash payments
  static double calculateChange({
    required double totalAmount,
    required double cashAmount,
  }) {
    if (cashAmount < totalAmount) {
      throw ArgumentError('Cash amount is insufficient');
    }
    return cashAmount - totalAmount;
  }
}

/// Result of payment processing
class PaymentResult {
  final pos.Sale sale;
  final PriceCalculation priceCalculation;
  final PromotionResult? promotionResult;
  final LoyaltyProcessingResult? loyaltyResult;
  final PaymentValidation paymentValidation;
  final double changeAmount;

  PaymentResult({
    required this.sale,
    required this.priceCalculation,
    this.promotionResult,
    this.loyaltyResult,
    required this.paymentValidation,
    required this.changeAmount,
  });
}

/// Price calculation breakdown
class PriceCalculation {
  final double subtotal;
  final double totalDiscount;
  final double totalTax;
  final double total;

  PriceCalculation({
    required this.subtotal,
    required this.totalDiscount,
    required this.totalTax,
    required this.total,
  });

  PriceCalculation copyWith({
    double? subtotal,
    double? totalDiscount,
    double? totalTax,
    double? total,
  }) {
    return PriceCalculation(
      subtotal: subtotal ?? this.subtotal,
      totalDiscount: totalDiscount ?? this.totalDiscount,
      totalTax: totalTax ?? this.totalTax,
      total: total ?? this.total,
    );
  }
}

/// Payment method validation result
class PaymentValidation {
  final bool isValid;
  final double totalAmount;
  final double amountPaid;
  final double changeAmount;
  final pos.PaymentMethod paymentMethod;

  PaymentValidation({
    required this.isValid,
    required this.totalAmount,
    required this.amountPaid,
    required this.changeAmount,
    required this.paymentMethod,
  });
}

/// Pre-validation result for payment processing
class PaymentPreValidation {
  final bool isValid;
  final List<String> errors;
  final PriceCalculation? priceCalculation;
  final PromotionResult? promotionResult;
  final LoyaltyCalculation? loyaltyCalculation;
  final double? finalTotal;

  PaymentPreValidation({
    required this.isValid,
    required this.errors,
    this.priceCalculation,
    this.promotionResult,
    this.loyaltyCalculation,
    this.finalTotal,
  });
}