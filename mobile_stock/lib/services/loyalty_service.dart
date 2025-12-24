import 'package:meta/meta.dart';

import '../models/pos_models.dart';
import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing customer loyalty points
@immutable
class LoyaltyService extends BaseService {
  static String get serviceName => 'LoyaltyService';

  // Loyalty program settings
  static const double pointsPerDollar = 1.0;  // 1 point per dollar spent
  static const double dollarPerPoint = 0.01;  // 1 point = $0.01 value
  static const int minRedemptionPoints = 100; // Minimum points to redeem

  /// Get customer loyalty points balance
  static Future<int> getCustomerPoints(
    int customerId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('customer_id', customerId, min: 1);

    return BaseService.handleRequest('fetch customer points', () async {
      final response = await ApiService.get(
        '/customers/$customerId/loyalty',
        requestId: requestId,
      );

      return response['points'] ?? 0;
    });
  }

  /// Get customer loyalty transaction history
  static Future<List<LoyaltyTransaction>> getCustomerLoyaltyHistory(
    int customerId, {
    int page = 1,
    int limit = 50,
    String? requestId,
  }) async {
    BaseService.validateNumeric('customer_id', customerId, min: 1);
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);

    return BaseService.handleRequest('fetch customer loyalty history', () async {
      final response = await ApiService.get(
        '/customers/$customerId/loyalty/transactions',
        queryParams: {
          'page': page,
          'limit': limit,
        },
        requestId: requestId,
      );

      if (response is List) {
        return (response as List<dynamic>)
            .map((item) => LoyaltyTransaction.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('transactions')) {
        final transactions = response['transactions'] as List<dynamic>;
        return transactions
            .map((item) => LoyaltyTransaction.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        return BaseService.parseList(response, key: 'data')
            .map((item) => LoyaltyTransaction.fromJson(item))
            .toList();
      }
    });
  }

  /// Calculate points earned from a sale
  static int calculatePointsEarned(double saleTotal) {
    return (saleTotal * pointsPerDollar).floor();
  }

  /// Calculate dollar value of points
  static double calculatePointsValue(int points) {
    return points * dollarPerPoint;
  }

  /// Validate points redemption
  static bool canRedeemPoints(int customerPoints, int pointsToRedeem) {
    return pointsToRedeem >= minRedemptionPoints && 
           customerPoints >= pointsToRedeem;
  }

  /// Award loyalty points to customer
  static Future<LoyaltyTransaction> awardPoints({
    required int customerId,
    required int points,
    required String description,
    int? saleId,
    String? requestId,
  }) async {
    BaseService.validateNumeric('customer_id', customerId, min: 1);
    BaseService.validateNumeric('points', points, min: 1);
    BaseService.validateRequired('description', description);

    return BaseService.handleRequest('award loyalty points', () async {
      final response = await ApiService.post(
        '/customers/$customerId/loyalty/award',
        data: {
          'points': points,
          'description': description.trim(),
          'type': 'earned',
          if (saleId != null) 'saleId': saleId,
        },
        requestId: requestId,
      );

      return LoyaltyTransaction.fromJson(
        BaseService.parseItem(response, key: 'transaction'),
      );
    });
  }

  /// Redeem loyalty points
  static Future<LoyaltyTransaction> redeemPoints({
    required int customerId,
    required int points,
    required String description,
    int? saleId,
    String? requestId,
  }) async {
    BaseService.validateNumeric('customer_id', customerId, min: 1);
    BaseService.validateNumeric('points', points, min: minRedemptionPoints);
    BaseService.validateRequired('description', description);

    return BaseService.handleRequest('redeem loyalty points', () async {
      // First check if customer has enough points
      final currentPoints = await getCustomerPoints(customerId, requestId: requestId);
      
      if (!canRedeemPoints(currentPoints, points)) {
        throw Exception('Insufficient points for redemption. Customer has $currentPoints points, needs $points points.');
      }

      final response = await ApiService.post(
        '/customers/$customerId/loyalty/redeem',
        data: {
          'points': points,
          'description': description.trim(),
          'type': 'redeemed',
          if (saleId != null) 'saleId': saleId,
        },
        requestId: requestId,
      );

      return LoyaltyTransaction.fromJson(
        BaseService.parseItem(response, key: 'transaction'),
      );
    });
  }

  /// Process loyalty points for a sale (both earn and redeem)
  static Future<LoyaltyProcessingResult> processLoyaltyForSale({
    required int customerId,
    required double saleTotal,
    int? pointsToRedeem,
    int? saleId,
    String? requestId,
  }) async {
    BaseService.validateNumeric('customer_id', customerId, min: 1);
    BaseService.validateNumeric('sale_total', saleTotal, min: 0);
    
    if (pointsToRedeem != null) {
      BaseService.validateNumeric('points_to_redeem', pointsToRedeem, min: minRedemptionPoints);
    }

    return BaseService.handleRequest('process loyalty for sale', () async {
      final transactions = <LoyaltyTransaction>[];
      double discountAmount = 0.0;

      // Redeem points first (if requested)
      if (pointsToRedeem != null && pointsToRedeem > 0) {
        final redeemTransaction = await redeemPoints(
          customerId: customerId,
          points: pointsToRedeem,
          description: 'Points redeemed for purchase discount',
          saleId: saleId,
          requestId: requestId,
        );
        transactions.add(redeemTransaction);
        discountAmount = calculatePointsValue(pointsToRedeem);
      }

      // Calculate points to earn based on final total (after redemption discount)
      final finalTotal = saleTotal - discountAmount;
      final pointsToEarn = calculatePointsEarned(finalTotal);

      if (pointsToEarn > 0) {
        final earnTransaction = await awardPoints(
          customerId: customerId,
          points: pointsToEarn,
          description: 'Points earned from purchase',
          saleId: saleId,
          requestId: requestId,
        );
        transactions.add(earnTransaction);
      }

      return LoyaltyProcessingResult(
        transactions: transactions,
        pointsRedeemed: pointsToRedeem ?? 0,
        pointsEarned: pointsToEarn,
        discountAmount: discountAmount,
      );
    });
  }

  /// Get loyalty program summary for customer
  static Future<LoyaltyProgramSummary> getLoyaltyProgramSummary(
    int customerId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('customer_id', customerId, min: 1);

    return BaseService.handleRequest('fetch loyalty program summary', () async {
      final response = await ApiService.get(
        '/customers/$customerId/loyalty/summary',
        requestId: requestId,
      );

      return LoyaltyProgramSummary.fromJson(
        BaseService.parseItem(response, key: 'summary'),
      );
    });
  }

  /// Calculate potential earnings and discounts
  static LoyaltyCalculation calculateLoyaltyBenefits({
    required double saleTotal,
    required int currentPoints,
    int? pointsToRedeem,
  }) {
    final pointsToEarn = calculatePointsEarned(saleTotal);
    final maxRedeemablePoints = currentPoints >= minRedemptionPoints ? currentPoints : 0;
    final requestedRedeem = pointsToRedeem ?? 0;
    
    // Ensure we don't redeem more than available
    final actualPointsToRedeem = requestedRedeem > 0 && canRedeemPoints(currentPoints, requestedRedeem)
        ? requestedRedeem
        : 0;
    
    final discountAmount = calculatePointsValue(actualPointsToRedeem);
    final finalTotal = saleTotal - discountAmount;
    final finalPointsEarned = calculatePointsEarned(finalTotal);
    final finalPointsBalance = currentPoints - actualPointsToRedeem + finalPointsEarned;

    return LoyaltyCalculation(
      currentPoints: currentPoints,
      pointsToEarn: finalPointsEarned,
      pointsToRedeem: actualPointsToRedeem,
      discountAmount: discountAmount,
      finalTotal: finalTotal,
      finalPointsBalance: finalPointsBalance,
      maxRedeemablePoints: maxRedeemablePoints,
      canRedeem: canRedeemPoints(currentPoints, requestedRedeem),
    );
  }
}

/// Result of loyalty processing for a sale
class LoyaltyProcessingResult {
  final List<LoyaltyTransaction> transactions;
  final int pointsRedeemed;
  final int pointsEarned;
  final double discountAmount;

  LoyaltyProcessingResult({
    required this.transactions,
    required this.pointsRedeemed,
    required this.pointsEarned,
    required this.discountAmount,
  });
}

/// Loyalty program summary for customer
class LoyaltyProgramSummary {
  final int customerId;
  final int totalPoints;
  final int lifetimePointsEarned;
  final int lifetimePointsRedeemed;
  final double lifetimeSavings;
  final int transactionCount;
  final DateTime? lastActivity;

  LoyaltyProgramSummary({
    required this.customerId,
    required this.totalPoints,
    required this.lifetimePointsEarned,
    required this.lifetimePointsRedeemed,
    required this.lifetimeSavings,
    required this.transactionCount,
    this.lastActivity,
  });

  factory LoyaltyProgramSummary.fromJson(Map<String, dynamic> json) {
    return LoyaltyProgramSummary(
      customerId: json['customerId'] ?? json['customer_id'],
      totalPoints: json['totalPoints'] ?? json['total_points'] ?? 0,
      lifetimePointsEarned: json['lifetimePointsEarned'] ?? json['lifetime_points_earned'] ?? 0,
      lifetimePointsRedeemed: json['lifetimePointsRedeemed'] ?? json['lifetime_points_redeemed'] ?? 0,
      lifetimeSavings: (json['lifetimeSavings'] ?? json['lifetime_savings'] ?? 0.0).toDouble(),
      transactionCount: json['transactionCount'] ?? json['transaction_count'] ?? 0,
      lastActivity: json['lastActivity'] != null || json['last_activity'] != null
          ? DateTime.parse(json['lastActivity'] ?? json['last_activity'])
          : null,
    );
  }
}

/// Loyalty calculation for display purposes
class LoyaltyCalculation {
  final int currentPoints;
  final int pointsToEarn;
  final int pointsToRedeem;
  final double discountAmount;
  final double finalTotal;
  final int finalPointsBalance;
  final int maxRedeemablePoints;
  final bool canRedeem;

  LoyaltyCalculation({
    required this.currentPoints,
    required this.pointsToEarn,
    required this.pointsToRedeem,
    required this.discountAmount,
    required this.finalTotal,
    required this.finalPointsBalance,
    required this.maxRedeemablePoints,
    required this.canRedeem,
  });
}