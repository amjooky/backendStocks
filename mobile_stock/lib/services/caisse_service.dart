import 'package:meta/meta.dart';

import '../models/pos_models.dart';
import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing caisse sessions
@immutable
class CaisseService extends BaseService {
  static String get serviceName => 'CaisseService';

  /// Get current active session
  static Future<CaisseSession?> getCurrentSession({
    String? requestId,
  }) async {
    return BaseService.handleRequest('fetch current caisse session', () async {
      final response = await ApiService.get(
        '/caisse/current',
        requestId: requestId,
      );

      if (response == null || response['session'] == null) {
        return null;
      }

      return CaisseSession.fromJson(
        BaseService.parseItem(response, key: 'session'),
      );
    });
  }

  /// Open a new caisse session
  static Future<CaisseSession> openSession({
    required String cashierName,
    required double openingBalance,
    String? notes,
    String? requestId,
  }) async {
    BaseService.validateRequired('cashier_name', cashierName);
    BaseService.validateNumeric('opening_balance', openingBalance, min: 0);

    return BaseService.handleRequest('open caisse session', () async {
      final response = await ApiService.post(
        '/caisse/open',
        data: {
          'cashierName': cashierName.trim(),
          'openingBalance': openingBalance,
          if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
        },
        requestId: requestId,
      );

      return CaisseSession.fromJson(
        BaseService.parseItem(response, key: 'session'),
      );
    });
  }

  /// Close current caisse session
  static Future<CaisseSession> closeSession({
    required double closingBalance,
    String? notes,
    String? requestId,
  }) async {
    BaseService.validateNumeric('closing_balance', closingBalance, min: 0);

    return BaseService.handleRequest('close caisse session', () async {
      final response = await ApiService.post(
        '/caisse/close',
        data: {
          'closingBalance': closingBalance,
          if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
        },
        requestId: requestId,
      );

      return CaisseSession.fromJson(
        BaseService.parseItem(response, key: 'session'),
      );
    });
  }

  /// Get session summary with sales data
  static Future<CaisseSessionSummary> getSessionSummary(
    int sessionId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('session_id', sessionId, min: 1);

    return BaseService.handleRequest('fetch session summary', () async {
      final response = await ApiService.get(
        '/caisse/$sessionId/summary',
        requestId: requestId,
      );

      return CaisseSessionSummary.fromJson(
        BaseService.parseItem(response, key: 'summary'),
      );
    });
  }

  /// Get current session summary
  static Future<CaisseSessionSummary?> getCurrentSessionSummary({
    String? requestId,
  }) async {
    return BaseService.handleRequest('fetch current session summary', () async {
      final currentSession = await getCurrentSession(requestId: requestId);
      
      if (currentSession == null) {
        return null;
      }

      return await getSessionSummary(currentSession.id!, requestId: requestId);
    });
  }

  /// Get session history
  static Future<List<CaisseSession>> getSessionHistory({
    int page = 1,
    int limit = 20,
    String? startDate,
    String? endDate,
    String? cashierName,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    if (startDate != null) BaseService.validateDate('start_date', startDate);
    if (endDate != null) BaseService.validateDate('end_date', endDate);

    return BaseService.handleRequest('fetch session history', () async {
      final response = await ApiService.get(
        '/caisse/sessions',
        queryParams: {
          'page': page,
          'limit': limit,
          if (startDate != null) 'startDate': startDate,
          if (endDate != null) 'endDate': endDate,
          if (cashierName?.trim().isNotEmpty == true) 'cashierName': cashierName!.trim(),
        },
        requestId: requestId,
      );

      if (response is List) {
        return (response as List<dynamic>)
            .map((item) => CaisseSession.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('sessions')) {
        final sessions = response['sessions'] as List<dynamic>;
        return sessions
            .map((item) => CaisseSession.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        return BaseService.parseList(response, key: 'data')
            .map((item) => CaisseSession.fromJson(item))
            .toList();
      }
    });
  }

  /// Add cash to session (cash-in operation)
  static Future<CaisseTransaction> addCash({
    required double amount,
    required String reason,
    String? requestId,
  }) async {
    BaseService.validateNumeric('amount', amount, min: 0.01);
    BaseService.validateRequired('reason', reason);

    return BaseService.handleRequest('add cash to session', () async {
      final response = await ApiService.post(
        '/caisse/cash-in',
        data: {
          'amount': amount,
          'reason': reason.trim(),
          'type': 'cash_in',
        },
        requestId: requestId,
      );

      return CaisseTransaction.fromJson(
        BaseService.parseItem(response, key: 'transaction'),
      );
    });
  }

  /// Remove cash from session (cash-out operation)
  static Future<CaisseTransaction> removeCash({
    required double amount,
    required String reason,
    String? requestId,
  }) async {
    BaseService.validateNumeric('amount', amount, min: 0.01);
    BaseService.validateRequired('reason', reason);

    return BaseService.handleRequest('remove cash from session', () async {
      final response = await ApiService.post(
        '/caisse/cash-out',
        data: {
          'amount': amount,
          'reason': reason.trim(),
          'type': 'cash_out',
        },
        requestId: requestId,
      );

      return CaisseTransaction.fromJson(
        BaseService.parseItem(response, key: 'transaction'),
      );
    });
  }

  /// Get session transactions (cash-in/cash-out)
  static Future<List<CaisseTransaction>> getSessionTransactions(
    int sessionId, {
    String? requestId,
  }) async {
    BaseService.validateNumeric('session_id', sessionId, min: 1);

    return BaseService.handleRequest('fetch session transactions', () async {
      final response = await ApiService.get(
        '/caisse/$sessionId/transactions',
        requestId: requestId,
      );

      if (response is List) {
        return (response as List<dynamic>)
            .map((item) => CaisseTransaction.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('transactions')) {
        final transactions = response['transactions'] as List<dynamic>;
        return transactions
            .map((item) => CaisseTransaction.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        return BaseService.parseList(response, key: 'data')
            .map((item) => CaisseTransaction.fromJson(item))
            .toList();
      }
    });
  }

  /// Calculate expected cash balance
  static CaisseBalanceCalculation calculateBalance({
    required CaisseSession session,
    required List<Sale> sales,
    List<CaisseTransaction>? transactions,
  }) {
    // Start with opening balance
    double expectedCash = session.openingBalance;

    // Add cash sales
    double cashFromSales = 0.0;
    double cardSales = 0.0;
    double otherPayments = 0.0;

    for (final sale in sales) {
      for (final payment in sale.payments) {
        switch (payment.method) {
          case PaymentMethod.cash:
            cashFromSales += payment.amount;
            break;
          case PaymentMethod.card:
            cardSales += payment.amount;
            break;
          default:
            otherPayments += payment.amount;
            break;
        }
      }
    }

    expectedCash += cashFromSales;

    // Add/subtract cash transactions (cash-in/cash-out)
    double cashIn = 0.0;
    double cashOut = 0.0;

    if (transactions != null) {
      for (final transaction in transactions) {
        if (transaction.type == 'cash_in') {
          cashIn += transaction.amount;
          expectedCash += transaction.amount;
        } else if (transaction.type == 'cash_out') {
          cashOut += transaction.amount;
          expectedCash -= transaction.amount;
        }
      }
    }

    final variance = session.closingBalance != null
        ? session.closingBalance! - expectedCash
        : 0.0;

    return CaisseBalanceCalculation(
      openingBalance: session.openingBalance,
      cashFromSales: cashFromSales,
      cardSales: cardSales,
      otherPayments: otherPayments,
      cashIn: cashIn,
      cashOut: cashOut,
      expectedClosingBalance: expectedCash,
      actualClosingBalance: session.closingBalance,
      variance: variance,
      totalSales: cashFromSales + cardSales + otherPayments,
      salesCount: sales.length,
    );
  }

  /// Validate session operations
  static String? validateSessionOperation(CaisseSession? currentSession, String operation) {
    switch (operation) {
      case 'open':
        if (currentSession != null && currentSession.isActive) {
          return 'There is already an active session. Please close it first.';
        }
        break;

      case 'close':
        if (currentSession == null || !currentSession.isActive) {
          return 'No active session found to close.';
        }
        break;

      case 'sale':
      case 'cash_in':
      case 'cash_out':
        if (currentSession == null || !currentSession.isActive) {
          return 'No active session found. Please open a session first.';
        }
        break;

      default:
        return 'Unknown operation: $operation';
    }

    return null; // No validation errors
  }
}

/// Caisse transaction for cash-in/cash-out operations
class CaisseTransaction {
  final int? id;
  final int sessionId;
  final String type; // 'cash_in', 'cash_out'
  final double amount;
  final String reason;
  final DateTime createdAt;

  CaisseTransaction({
    this.id,
    required this.sessionId,
    required this.type,
    required this.amount,
    required this.reason,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory CaisseTransaction.fromJson(Map<String, dynamic> json) {
    return CaisseTransaction(
      id: json['id'],
      sessionId: json['sessionId'] ?? json['session_id'],
      type: json['type'] ?? 'cash_in',
      amount: (json['amount'] ?? 0.0).toDouble(),
      reason: json['reason'] ?? '',
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'sessionId': sessionId,
      'type': type,
      'amount': amount,
      'reason': reason,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Complete session summary with financial data
class CaisseSessionSummary {
  final CaisseSession session;
  final List<Sale> sales;
  final List<CaisseTransaction> transactions;
  final CaisseBalanceCalculation balanceCalculation;

  CaisseSessionSummary({
    required this.session,
    required this.sales,
    required this.transactions,
    required this.balanceCalculation,
  });

  factory CaisseSessionSummary.fromJson(Map<String, dynamic> json) {
    final session = CaisseSession.fromJson(json['session']);
    final sales = json['sales'] != null
        ? (json['sales'] as List).map((sale) => Sale.fromJson(sale)).toList()
        : <Sale>[];
    final transactions = json['transactions'] != null
        ? (json['transactions'] as List).map((t) => CaisseTransaction.fromJson(t)).toList()
        : <CaisseTransaction>[];

    final balanceCalculation = CaisseService.calculateBalance(
      session: session,
      sales: sales,
      transactions: transactions,
    );

    return CaisseSessionSummary(
      session: session,
      sales: sales,
      transactions: transactions,
      balanceCalculation: balanceCalculation,
    );
  }
}

/// Balance calculation for caisse session
class CaisseBalanceCalculation {
  final double openingBalance;
  final double cashFromSales;
  final double cardSales;
  final double otherPayments;
  final double cashIn;
  final double cashOut;
  final double expectedClosingBalance;
  final double? actualClosingBalance;
  final double variance;
  final double totalSales;
  final int salesCount;

  CaisseBalanceCalculation({
    required this.openingBalance,
    required this.cashFromSales,
    required this.cardSales,
    required this.otherPayments,
    required this.cashIn,
    required this.cashOut,
    required this.expectedClosingBalance,
    this.actualClosingBalance,
    required this.variance,
    required this.totalSales,
    required this.salesCount,
  });

  bool get hasVariance => variance.abs() > 0.01; // Allow for small floating point differences
  bool get isBalanced => !hasVariance;
}