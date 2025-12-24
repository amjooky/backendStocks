import 'package:meta/meta.dart';

import '../models/receipt.dart';
import 'receipt_api_service.dart';

/// Service for managing receipt history via API
@immutable
class ReceiptHistoryService {
  /// Saves a receipt to backend
  static Future<Receipt> saveReceipt(Receipt receipt) async {
    try {
      return await ReceiptApiService.createReceipt(receipt);
    } catch (e) {
      // Log error but don't throw - receipt saving shouldn't break the app
      print('Error saving receipt: $e');
      rethrow;
    }
  }

  /// Retrieves all receipts from backend
  static Future<List<Receipt>> getAllReceipts() async {
    try {
      return await ReceiptApiService.getReceipts(limit: 100);
    } catch (e) {
      print('Error loading receipts: $e');
      return [];
    }
  }

  /// Retrieves receipts with pagination
  static Future<List<Receipt>> getReceipts({
    int offset = 0,
    int limit = 50,
  }) async {
    try {
      final page = (offset ~/ limit) + 1;
      return await ReceiptApiService.getReceipts(page: page, limit: limit);
    } catch (e) {
      print('Error loading paginated receipts: $e');
      return [];
    }
  }

  /// Searches receipts by various criteria
  static Future<List<Receipt>> searchReceipts({
    String? receiptNumber,
    String? customerName,
    DateTime? fromDate,
    DateTime? toDate,
    double? minAmount,
    double? maxAmount,
  }) async {
    try {
      return await ReceiptApiService.getReceipts(
        search: receiptNumber,
        customerName: customerName,
        fromDate: fromDate?.toIso8601String().substring(0, 10),
        toDate: toDate?.toIso8601String().substring(0, 10),
      );
    } catch (e) {
      print('Error searching receipts: $e');
      return [];
    }
  }

  /// Gets a specific receipt by ID
  static Future<Receipt?> getReceiptById(String id) async {
    try {
      return await ReceiptApiService.getReceipt(id);
    } catch (e) {
      print('Error getting receipt by ID: $e');
      return null;
    }
  }

  /// Deletes a specific receipt by ID
  static Future<bool> deleteReceipt(String id) async {
    try {
      await ReceiptApiService.deleteReceipt(id);
      return true;
    } catch (e) {
      print('Error deleting receipt: $e');
      return false;
    }
  }

  /// Clears all receipt history (not recommended for API-based systems)
  static Future<bool> clearAllReceipts() async {
    try {
      // For API-based systems, we don't typically clear all data
      // This would require admin privileges
      print('Clear all receipts not implemented for API-based system');
      return false;
    } catch (e) {
      print('Error clearing receipts: $e');
      return false;
    }
  }

  /// Gets receipt statistics
  static Future<Map<String, dynamic>> getReceiptStats() async {
    try {
      return await ReceiptApiService.getReceiptStats();
    } catch (e) {
      print('Error getting receipt stats: $e');
      return {
        'totalReceipts': 0,
        'totalAmount': 0.0,
        'averageAmount': 0.0,
        'oldestReceipt': null,
        'newestReceipt': null,
      };
    }
  }

  /// Generates a unique receipt number from backend
  static Future<String> generateReceiptNumber() async {
    try {
      return await ReceiptApiService.generateReceiptNumber();
    } catch (e) {
      print('Error generating receipt number: $e');
      // Fallback to local generation
      final now = DateTime.now();
      final timestamp = now.millisecondsSinceEpoch.toString();
      final datePrefix = '${now.year.toString().substring(2)}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
      return 'RCP-$datePrefix-${timestamp.substring(timestamp.length - 6)}';
    }
  }

  /// Exports receipts to specified format
  static Future<String> exportReceiptsToJson({
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    try {
      return await ReceiptApiService.exportReceipts(
        format: 'json',
        fromDate: fromDate?.toIso8601String().substring(0, 10),
        toDate: toDate?.toIso8601String().substring(0, 10),
      );
    } catch (e) {
      print('Error exporting receipts: $e');
      return 'Export failed: $e';
    }
  }
}