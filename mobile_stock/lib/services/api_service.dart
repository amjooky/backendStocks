import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;

import 'package:http/http.dart' as http;
import 'package:meta/meta.dart';

import 'auth_service.dart';

/// Service for handling API communication
@immutable
class ApiService {
  static const String baseUrl = 'https://backendstocks.onrender.com/api';
  static const Duration _timeoutDuration = Duration(seconds: 30);

  /// Get auth headers for requests
  static Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = await AuthService.getAuthToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }
  
  /// GET request
  static Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
    String? requestId,
  }) async {
    return _sendRequest(
      'GET',
      endpoint,
      queryParams: queryParams,
      headers: headers,
      requestId: requestId,
    );
  }

  /// POST request
  static Future<Map<String, dynamic>> post(
    String endpoint, {
    required Map<String, dynamic> data,
    Map<String, String>? headers,
    String? requestId,
  }) async {
    return _sendRequest(
      'POST',
      endpoint,
      data: data,
      headers: headers,
      requestId: requestId,
    );
  }

  /// PUT request
  static Future<Map<String, dynamic>> put(
    String endpoint, {
    required Map<String, dynamic> data,
    Map<String, String>? headers,
    String? requestId,
  }) async {
    return _sendRequest(
      'PUT',
      endpoint,
      data: data,
      headers: headers,
      requestId: requestId,
    );
  }

  /// DELETE request
  static Future<Map<String, dynamic>> delete(
    String endpoint, {
    Map<String, String>? headers,
    String? requestId,
  }) async {
    return _sendRequest(
      'DELETE',
      endpoint,
      headers: headers,
      requestId: requestId,
    );
  }

  /// Send HTTP request with proper error handling
  static Future<Map<String, dynamic>> _sendRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? queryParams,
    Map<String, dynamic>? data,
    Map<String, String>? headers,
    String? requestId,
  }) async {
    final uri = Uri.parse('$baseUrl$endpoint').replace(
      queryParameters: queryParams?.map(
        (key, value) => MapEntry(key, value?.toString()),
      ),
    );

    final requestHeaders = await _getHeaders();
    if (headers != null) {
      requestHeaders.addAll(headers);
    }

    // Log the outgoing request
    developer.log(
      '🚀 API REQUEST: $method $uri',
      name: 'ApiService',
      level: 800,
    );
    if (data != null) {
      developer.log(
        '📤 REQUEST DATA: ${jsonEncode(data)}',
        name: 'ApiService',
        level: 800,
      );
    }
    if (queryParams != null) {
      developer.log(
        '🔍 QUERY PARAMS: $queryParams',
        name: 'ApiService',
        level: 800,
      );
    }
    
    try {
      http.Response response;
      
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: requestHeaders)
              .timeout(_timeoutDuration);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: requestHeaders,
            body: jsonEncode(data),
          ).timeout(_timeoutDuration);
          break;
        case 'PUT':
          response = await http.put(
            uri,
            headers: requestHeaders,
            body: jsonEncode(data),
          ).timeout(_timeoutDuration);
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: requestHeaders)
              .timeout(_timeoutDuration);
          break;
        default:
          throw ApiException('Unsupported HTTP method: $method');
      }

      // Log the response
      developer.log(
        '✅ API RESPONSE: $method $uri [${response.statusCode}]',
        name: 'ApiService',
        level: 800,
      );
      developer.log(
        '📥 RESPONSE BODY: ${response.body}',
        name: 'ApiService',
        level: 800,
      );

      return _processResponse(response);
    } on TimeoutException catch (e) {
      throw ApiException('Request timed out', 408, e);
    } on http.ClientException catch (e) {
      throw ApiException('Network error: ${e.message}', 0, e);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Request failed: $e', 0, e);
    }
  }

  /// Process API response
  static Map<String, dynamic> _processResponse(http.Response response) {
    final statusCode = response.statusCode;
    
    // Handle empty responses (like 204 No Content)
    if (statusCode == 204) {
      return {'success': true, 'status': 204};
    }

    // Parse response body
    try {
      final body = utf8.decode(response.bodyBytes);
      final dynamic data = body.isNotEmpty ? jsonDecode(body) : null;

      // Handle successful responses
      if (statusCode >= 200 && statusCode < 300) {
        if (data == null) {
          return {'success': true, 'status': statusCode};
        }
        return data is Map<String, dynamic> 
            ? data 
            : {'data': data, 'status': statusCode};
      }

      // Handle error responses
      final message = data is Map 
          ? data['message'] ?? 'Request failed'
          : 'Request failed';
      throw ApiException(message, statusCode);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Failed to process response: $e',
        statusCode,
        e,
      );
    }
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final String message;
  final int statusCode;
  final dynamic cause;

  const ApiException(this.message, [this.statusCode = 0, this.cause]);

  @override
  String toString() => statusCode > 0 ? '[$statusCode] $message' : message;
}