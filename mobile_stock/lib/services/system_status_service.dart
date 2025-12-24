import 'package:meta/meta.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for checking system status and endpoint availability
@immutable
class SystemStatusService extends BaseService {
  static String get serviceName => 'SystemStatusService';

  /// Checks the status of all critical endpoints
  static Future<SystemStatus> checkSystemStatus() async {
    return BaseService.handleRequest('check system status', () async {
      final results = <String, EndpointStatus>{};
      
      // Test core endpoints
      results['Products'] = await _testEndpoint('/products?page=1&limit=1');
      results['Inventory Overview'] = await _testEndpoint('/inventory/overview');
      results['Stock Movements'] = await _testEndpoint('/inventory/movements?page=1&limit=1');
      results['Inventory Report'] = await _testEndpoint('/reports/inventory');
      
      // Test analytics endpoints
      results['Dashboard Analytics'] = await _testEndpoint('/analytics/dashboard?period=month');
      results['Performance Reports'] = await _testEndpoint('/reports/performance?start_date=2024-01-01&end_date=2024-01-31&limit=5');
      results['Financial Reports'] = await _testEndpoint('/reports/sales-summary?startDate=2024-01-01&endDate=2024-01-31&groupBy=day');
      
      return SystemStatus(endpointStatuses: results);
    }, serviceName: serviceName);
  }

  /// Tests a single endpoint and returns its status
  static Future<EndpointStatus> _testEndpoint(String endpoint) async {
    try {
      final startTime = DateTime.now();
      await ApiService.get(endpoint);
      final responseTime = DateTime.now().difference(startTime).inMilliseconds;
      
      return EndpointStatus(
        isAvailable: true,
        responseTimeMs: responseTime,
        lastChecked: DateTime.now(),
      );
    } catch (e) {
      return EndpointStatus(
        isAvailable: false,
        responseTimeMs: 0,
        lastChecked: DateTime.now(),
        error: e.toString(),
      );
    }
  }
}

/// Represents the overall system status
@immutable
class SystemStatus {
  final Map<String, EndpointStatus> endpointStatuses;
  
  const SystemStatus({
    required this.endpointStatuses,
  });

  /// Returns true if all core endpoints are working
  bool get coreSystemsHealthy {
    final coreEndpoints = ['Products', 'Inventory Overview', 'Stock Movements', 'Inventory Report'];
    return coreEndpoints.every((endpoint) => 
      endpointStatuses[endpoint]?.isAvailable == true);
  }

  /// Returns true if analytics endpoints are working
  bool get analyticsSystemsHealthy {
    final analyticsEndpoints = ['Dashboard Analytics', 'Performance Reports', 'Financial Reports'];
    return analyticsEndpoints.every((endpoint) => 
      endpointStatuses[endpoint]?.isAvailable == true);
  }

  /// Gets a summary of system health
  String get healthSummary {
    if (coreSystemsHealthy && analyticsSystemsHealthy) {
      return 'All systems operational';
    } else if (coreSystemsHealthy) {
      return 'Core systems operational, analytics limited';
    } else {
      return 'System issues detected';
    }
  }
}

/// Represents the status of a single endpoint
@immutable
class EndpointStatus {
  final bool isAvailable;
  final int responseTimeMs;
  final DateTime lastChecked;
  final String? error;
  
  const EndpointStatus({
    required this.isAvailable,
    required this.responseTimeMs,
    required this.lastChecked,
    this.error,
  });

  /// Gets a user-friendly status description
  String get statusDescription {
    if (isAvailable) {
      return 'Online (${responseTimeMs}ms)';
    } else {
      return 'Offline';
    }
  }

  /// Gets a color representing the status
  String get statusColorHex {
    if (isAvailable) {
      return responseTimeMs < 1000 ? '#10B981' : '#F59E0B'; // Green or Yellow
    } else {
      return '#EF4444'; // Red
    }
  }
}