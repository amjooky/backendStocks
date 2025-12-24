import 'dart:developer' as developer;
import 'package:meta/meta.dart';

import 'api_service.dart';

/// Base class for all services with shared functionality
abstract class BaseService {
  /// Service name for logging - can be overridden by each service
  @protected
  static String get serviceName => 'BaseService';

  /// Logging level for all services
  static const int logLevel = 900;

  /// Default timeout for requests
  static const Duration defaultTimeout = Duration(seconds: 30);

  /// Standardized request handling with logging
  @protected
  static Future<T> handleRequest<T>(
    String operation,
    Future<T> Function() action, {
    String? serviceName,
  }) async {
    final service = serviceName ?? 'BaseService';
    developer.log(
      '🔄 Starting operation: $operation',
      name: service,
      level: 800,
    );
    
    try {
      final result = await action();
      developer.log(
        '✅ Completed operation: $operation',
        name: service,
        level: 800,
      );
      return result;
    } on ApiException catch (e) {
      developer.log(
        '❌ API Error in $operation: [${e.statusCode}] ${e.message}',
        error: e,
        name: service,
        level: 1000,
      );
      rethrow;
    } catch (e, stackTrace) {
      developer.log(
        '💥 Unexpected error in $operation: $e',
        error: e,
        stackTrace: stackTrace,
        name: service,
        level: 1000,
      );
      rethrow;
    }
  }

  /// Log errors consistently
  @protected
  static void logError(String message, Object error, [StackTrace? stackTrace, String? service]) {
    developer.log(
      message,
      error: error,
      stackTrace: stackTrace,
      name: service ?? serviceName,
      level: logLevel,
    );
  }

  /// Parse response that contains a list of items
  @protected
  static List<Map<String, dynamic>> parseList(
    Map<String, dynamic> response, {
    String? key,
  }) {
    final data = key != null ? response[key] : response;
    
    if (data == null) {
      throw ApiException('Response missing ${key ?? 'data'}');
    }
    
    if (data is! List) {
      throw ApiException('Invalid response format for ${key ?? 'data'}: expected List');
    }

    return data.map((item) {
      if (item is! Map<String, dynamic>) {
        throw ApiException('Invalid item format in ${key ?? 'data'}: $item');
      }
      return item;
    }).toList();
  }

  /// Parse response that contains a single item
  @protected
  static Map<String, dynamic> parseItem(
    Map<String, dynamic> response, {
    String? key,
  }) {
    final data = key != null ? response[key] : response;
    
    if (data == null) {
      throw ApiException('Response missing ${key ?? 'data'}');
    }
    
    if (data is! Map<String, dynamic>) {
      throw ApiException('Invalid response format for ${key ?? 'data'}: expected Object');
    }

    return data;
  }

  /// Parse success/delete response
  @protected
  static bool parseSuccess(Map<String, dynamic> response) {
    return response['success'] == true || 
           response['deleted'] == true || 
           response['status'] == 204;
  }

  /// Validate required string parameters
  @protected
  static void validateRequired(String name, String? value) {
    if (value == null || value.trim().isEmpty) {
      throw ArgumentError.notNull('$name cannot be empty');
    }
  }

  /// Validate numeric parameters
  @protected
  static void validateNumeric(String name, num value, {num? min, num? max}) {
    if (min != null && value < min) {
      throw ArgumentError('$name must be at least $min');
    }
    if (max != null && value > max) {
      throw ArgumentError('$name cannot exceed $max');
    }
  }

  /// Validate date format (YYYY-MM-DD)
  @protected
  static void validateDate(String name, String value) {
    try {
      DateTime.parse(value);
    } on FormatException {
      throw ArgumentError('$name must be in ISO format (YYYY-MM-DD)');
    }
  }

  /// Validate email format
  @protected
  static void validateEmail(String name, String value) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9.]+@[a-zA-Z0-9]+\.[a-zA-Z]+',
    );
    if (!emailRegex.hasMatch(value)) {
      throw ArgumentError('$name must be a valid email address');
    }
  }

  /// Validate phone number format
  @protected
  static void validatePhone(String name, String value) {
    final phoneRegex = RegExp(r'^\+?[\d\s-]+$');
    if (!phoneRegex.hasMatch(value)) {
      throw ArgumentError('$name must be a valid phone number');
    }
  }
}