import 'package:meta/meta.dart';

import '../models/pos_models.dart';
import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing promotions and discount calculations
@immutable
class PromotionsService extends BaseService {
  static String get serviceName => 'PromotionsService';

  /// Get all active promotions
  static Future<List<Promotion>> getActivePromotions({
    String? requestId,
  }) async {
    return BaseService.handleRequest('fetch active promotions', () async {
      final response = await ApiService.get(
        '/promotions',
        queryParams: {'active': true},
        requestId: requestId,
      );

      if (response is List) {
        return (response as List<dynamic>)
            .map((item) => Promotion.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('promotions')) {
        final promotions = response['promotions'] as List<dynamic>;
        return promotions
            .map((item) => Promotion.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        return BaseService.parseList(response, key: 'data')
            .map((item) => Promotion.fromJson(item))
            .toList();
      }
    });
  }

  /// Get applicable promotions for a list of items
  static Future<List<Promotion>> getApplicablePromotions(
    List<SaleItem> items, {
    String? requestId,
  }) async {
    return BaseService.handleRequest('fetch applicable promotions', () async {
      final activePromotions = await getActivePromotions(requestId: requestId);
      final subtotal = items.fold<double>(0.0, (sum, item) => sum + item.subtotal);
      
      return activePromotions.where((promotion) {
        // Check minimum amount
        if (promotion.minimumAmount != null && subtotal < promotion.minimumAmount!) {
          return false;
        }

        // Check applicable categories
        if (promotion.applicableCategories != null && promotion.applicableCategories!.isNotEmpty) {
          final hasApplicableCategory = items.any((item) {
            // We would need to get the product's categoryId here
            // For now, assume we can check it somehow
            return promotion.applicableCategories!.contains(item.productId); // Simplified
          });
          if (!hasApplicableCategory) return false;
        }

        // Check applicable products
        if (promotion.applicableProducts != null && promotion.applicableProducts!.isNotEmpty) {
          final hasApplicableProduct = items.any((item) {
            return promotion.applicableProducts!.contains(item.productId);
          });
          if (!hasApplicableProduct) return false;
        }

        return true;
      }).toList();
    });
  }

  /// Apply promotions to sale items and calculate discounts
  static Future<PromotionResult> applyPromotions(
    List<SaleItem> items, {
    List<int>? selectedPromotionIds,
    String? requestId,
  }) async {
    return BaseService.handleRequest('apply promotions', () async {
      final applicablePromotions = await getApplicablePromotions(items, requestId: requestId);
      final appliedPromotions = <AppliedPromotion>[];
      double totalDiscount = 0.0;

      // If specific promotions are selected, filter to those
      final promotionsToApply = selectedPromotionIds != null && selectedPromotionIds.isNotEmpty
          ? applicablePromotions.where((p) => selectedPromotionIds.contains(p.id)).toList()
          : applicablePromotions;

      for (final promotion in promotionsToApply) {
        final subtotal = items.fold<double>(0.0, (sum, item) => sum + item.subtotal);
        final discountAmount = promotion.calculateDiscount(subtotal);
        
        if (discountAmount > 0) {
          appliedPromotions.add(AppliedPromotion(
            promotionId: promotion.id,
            promotionName: promotion.name,
            type: promotion.type,
            discountAmount: discountAmount,
            originalAmount: subtotal,
          ));
          totalDiscount += discountAmount;
        }
      }

      return PromotionResult(
        appliedPromotions: appliedPromotions,
        totalDiscount: totalDiscount,
      );
    });
  }

  /// Validate promotion usage before applying
  static Future<bool> validatePromotionUsage(
    int promotionId, {
    String? requestId,
  }) async {
    return BaseService.handleRequest('validate promotion usage', () async {
      final response = await ApiService.get(
        '/promotions/$promotionId/validate',
        requestId: requestId,
      );
      
      return response['valid'] ?? false;
    });
  }

  /// Create a new promotion
  static Future<Promotion> createPromotion({
    required String name,
    required String description,
    required String type,
    required double value,
    double? minimumAmount,
    required DateTime startDate,
    required DateTime endDate,
    List<int>? applicableCategories,
    List<int>? applicableProducts,
    int? maxUsage,
    String? requestId,
  }) async {
    BaseService.validateRequired('name', name);
    BaseService.validateRequired('description', description);
    BaseService.validateRequired('type', type);
    BaseService.validateNumeric('value', value, min: 0);
    
    return BaseService.handleRequest('create promotion', () async {
      final response = await ApiService.post(
        '/promotions',
        data: {
          'name': name.trim(),
          'description': description.trim(),
          'type': type,
          'value': value,
          if (minimumAmount != null) 'minimumAmount': minimumAmount,
          'startDate': startDate.toIso8601String(),
          'endDate': endDate.toIso8601String(),
          'isActive': true,
          if (applicableCategories != null) 'applicableCategories': applicableCategories,
          if (applicableProducts != null) 'applicableProducts': applicableProducts,
          if (maxUsage != null) 'maxUsage': maxUsage,
        },
        requestId: requestId,
      );
      
      return Promotion.fromJson(BaseService.parseItem(response, key: 'promotion'));
    });
  }

  /// Update promotion usage count
  static Future<bool> updatePromotionUsage(
    int promotionId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('promotion_id', promotionId, min: 1);
    
    return BaseService.handleRequest('update promotion usage', () async {
      final response = await ApiService.put(
        '/promotions/$promotionId/usage',
        data: {'increment': 1},
        requestId: requestId,
      );
      
      return BaseService.parseSuccess(response);
    });
  }

  /// Calculate automatic discounts for a sale
  static PromotionResult calculateAutomaticDiscounts(List<SaleItem> items) {
    final appliedPromotions = <AppliedPromotion>[];
    double totalDiscount = 0.0;

    // Example: Bulk discount - 10% off orders over $100
    final subtotal = items.fold<double>(0.0, (sum, item) => sum + item.subtotal);
    if (subtotal > 100.0) {
      final discount = subtotal * 0.10;
      appliedPromotions.add(AppliedPromotion(
        promotionId: -1, // Automatic promotion
        promotionName: 'Bulk Order Discount',
        type: 'percentage',
        discountAmount: discount,
        originalAmount: subtotal,
      ));
      totalDiscount += discount;
    }

    // Example: Buy 2 get 1 free on same items
    final itemGroups = <int, List<SaleItem>>{};
    for (final item in items) {
      itemGroups.putIfAbsent(item.productId, () => []).add(item);
    }

    for (final entry in itemGroups.entries) {
      final itemList = entry.value;
      final totalQuantity = itemList.fold<int>(0, (sum, item) => sum + item.quantity);
      
      if (totalQuantity >= 3) {
        final freeItems = totalQuantity ~/ 3;
        final unitPrice = itemList.first.unitPrice;
        final discount = freeItems * unitPrice;
        
        appliedPromotions.add(AppliedPromotion(
          promotionId: -2, // Automatic promotion
          promotionName: 'Buy 2 Get 1 Free',
          type: 'buy_x_get_y',
          discountAmount: discount,
          originalAmount: totalQuantity * unitPrice,
        ));
        totalDiscount += discount;
      }
    }

    return PromotionResult(
      appliedPromotions: appliedPromotions,
      totalDiscount: totalDiscount,
    );
  }
}

/// Result of promotion application
class PromotionResult {
  final List<AppliedPromotion> appliedPromotions;
  final double totalDiscount;

  PromotionResult({
    required this.appliedPromotions,
    required this.totalDiscount,
  });
}