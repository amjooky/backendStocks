import 'package:meta/meta.dart';

import '../models/pos_models.dart' as pos;
import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing POS operations
@immutable
class PosService extends BaseService {
  static String get serviceName => 'PosService';

  // Customer Management

  /// Get all customers with pagination
  static Future<List<pos.Customer>> getCustomers({
    int page = 1,
    int limit = 50,
    String? search,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    
    return BaseService.handleRequest('fetch customers', () async {
      final response = await ApiService.get(
        '/customers',
        queryParams: {
          'page': page,
          'limit': limit,
          if (search?.trim().isNotEmpty == true) 'search': search!.trim(),
        },
        requestId: requestId,
      );

      if (response is List) {
        return (response as List<dynamic>)
            .map((item) => pos.Customer.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('customers')) {
        final customers = response['customers'] as List<dynamic>;
        return customers
            .map((item) => pos.Customer.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        return BaseService.parseList(response, key: 'data')
            .map((item) => pos.Customer.fromJson(item))
            .toList();
      }
    });
  }

  /// Get a single customer by ID
  static Future<pos.Customer> getCustomer(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('fetch customer $id', () async {
      final response = await ApiService.get('/customers/$id', requestId: requestId);
      return pos.Customer.fromJson(BaseService.parseItem(response, key: 'customer'));
    });
  }

  /// Search customers by name, email, or phone
  static Future<List<pos.Customer>> searchCustomers(
    String query, {
    String? requestId,
  }) async {
    BaseService.validateRequired('query', query);
    
    return BaseService.handleRequest('search customers', () async {
      final response = await ApiService.get(
        '/customers/search',
        queryParams: {'q': query.trim()},
        requestId: requestId,
      );
      
      return BaseService.parseList(response, key: 'results')
          .map((item) => pos.Customer.fromJson(item))
          .toList();
    });
  }

  /// Create a new customer
  static Future<pos.Customer> createCustomer({
    required String name,
    String? email,
    String? phone,
    String? address,
    String? requestId,
  }) async {
    BaseService.validateRequired('name', name);
    
    return BaseService.handleRequest('create customer', () async {
      final response = await ApiService.post(
        '/customers',
        data: {
          'name': name.trim(),
          if (email?.trim().isNotEmpty == true) 'email': email!.trim(),
          if (phone?.trim().isNotEmpty == true) 'phone': phone!.trim(),
          if (address?.trim().isNotEmpty == true) 'address': address!.trim(),
        },
        requestId: requestId,
      );
      
      return pos.Customer.fromJson(BaseService.parseItem(response, key: 'customer'));
    });
  }

  /// Update an existing customer
  static Future<pos.Customer> updateCustomer(
    int id, {
    String? name,
    String? email,
    String? phone,
    String? address,
    String? requestId,
  }) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('update customer $id', () async {
      final data = <String, dynamic>{};
      if (name?.trim().isNotEmpty == true) data['name'] = name!.trim();
      if (email?.trim().isNotEmpty == true) data['email'] = email!.trim();
      if (phone?.trim().isNotEmpty == true) data['phone'] = phone!.trim();
      if (address?.trim().isNotEmpty == true) data['address'] = address!.trim();
      
      final response = await ApiService.put(
        '/customers/$id',
        data: data,
        requestId: requestId,
      );
      
      return pos.Customer.fromJson(BaseService.parseItem(response, key: 'customer'));
    });
  }

  /// Delete a customer
  static Future<bool> deleteCustomer(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('delete customer $id', () async {
      final response = await ApiService.delete(
        '/customers/$id',
        requestId: requestId,
      );
      return BaseService.parseSuccess(response);
    });
  }

  // Sales Management

  /// Create a new sale
  static Future<pos.Sale> createSale({
    required List<pos.SaleItem> items,
    pos.Customer? customer,
    List<pos.Payment>? payments,
    String? notes,
    String? requestId,
  }) async {
    if (items.isEmpty) {
      throw ArgumentError('Sale must contain at least one item');
    }
    
    return BaseService.handleRequest('create sale', () async {
      final sale = pos.Sale.fromItems(
        items: items,
        customer: customer,
        payments: payments ?? [],
        notes: notes,
      );
      
      final response = await ApiService.post(
        '/sales',
        data: sale.toJson(),
        requestId: requestId,
      );
      
      return pos.Sale.fromJson(BaseService.parseItem(response, key: 'sale'));
    });
  }

  /// Update an existing sale
  static Future<pos.Sale> updateSale(
    int id, {
    List<pos.SaleItem>? items,
    pos.Customer? customer,
    List<pos.Payment>? payments,
    pos.SaleStatus? status,
    String? notes,
    String? requestId,
  }) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('update sale $id', () async {
      final data = <String, dynamic>{};
      
      if (items != null) {
        data['items'] = items.map((item) => item.toJson()).toList();
      }
      if (customer != null) {
        data['customer'] = customer.toJson();
      }
      if (payments != null) {
        data['payments'] = payments.map((payment) => payment.toJson()).toList();
      }
      if (status != null) {
        data['status'] = status.value;
      }
      if (notes != null) {
        data['notes'] = notes;
      }
      
      final response = await ApiService.put(
        '/sales/$id',
        data: data,
        requestId: requestId,
      );
      
      return pos.Sale.fromJson(BaseService.parseItem(response, key: 'sale'));
    });
  }

  /// Get sales with pagination and filtering
  static Future<List<pos.Sale>> getSales({
    int page = 1,
    int limit = 20,
    String? startDate,
    String? endDate,
    pos.SaleStatus? status,
    int? customerId,
    String? requestId,
  }) async {
    BaseService.validateNumeric('page', page, min: 1);
    BaseService.validateNumeric('limit', limit, min: 1, max: 100);
    if (customerId != null) BaseService.validateNumeric('customer_id', customerId, min: 1);
    if (startDate != null) BaseService.validateDate('start_date', startDate);
    if (endDate != null) BaseService.validateDate('end_date', endDate);
    
    return BaseService.handleRequest('fetch sales', () async {
      final response = await ApiService.get(
        '/sales',
        queryParams: {
          'page': page,
          'limit': limit,
          if (startDate != null) 'startDate': startDate,
          if (endDate != null) 'endDate': endDate,
          if (status != null) 'status': status.value,
          if (customerId != null) 'customerId': customerId,
        },
        requestId: requestId,
      );

      if (response is List) {
        return (response as List<dynamic>)
            .map((item) => pos.Sale.fromJson(item as Map<String, dynamic>))
            .toList();
      } else if (response is Map<String, dynamic> && response.containsKey('sales')) {
        final sales = response['sales'] as List<dynamic>;
        return sales
            .map((item) => pos.Sale.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        return BaseService.parseList(response, key: 'data')
            .map((item) => pos.Sale.fromJson(item))
            .toList();
      }
    });
  }

  /// Get a single sale by ID
  static Future<pos.Sale> getSale(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('fetch sale $id', () async {
      final response = await ApiService.get('/sales/$id', requestId: requestId);
      return pos.Sale.fromJson(BaseService.parseItem(response, key: 'sale'));
    });
  }

  /// Cancel a sale
  static Future<pos.Sale> cancelSale(int id, {String? reason, String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('cancel sale $id', () async {
      final response = await ApiService.put(
        '/sales/$id/cancel',
        data: {
          'reason': reason ?? 'Cancelled by user',
        },
        requestId: requestId,
      );
      
      return pos.Sale.fromJson(BaseService.parseItem(response, key: 'sale'));
    });
  }

  /// Process refund for a sale
  static Future<pos.Sale> refundSale(
    int id, {
    double? amount,
    String? reason,
    String? requestId,
  }) async {
    BaseService.validateNumeric('id', id, min: 1);
    if (amount != null) BaseService.validateNumeric('amount', amount, min: 0);
    
    return BaseService.handleRequest('refund sale $id', () async {
      final response = await ApiService.put(
        '/sales/$id/refund',
        data: {
          if (amount != null) 'amount': amount,
          'reason': reason ?? 'Refund processed',
        },
        requestId: requestId,
      );
      
      return pos.Sale.fromJson(BaseService.parseItem(response, key: 'sale'));
    });
  }

  // Payment Management

  /// Add payment to a sale
  static Future<pos.Sale> addPayment(
    int saleId, {
    required pos.PaymentMethod method,
    required double amount,
    String? reference,
    String? requestId,
  }) async {
    BaseService.validateNumeric('sale_id', saleId, min: 1);
    BaseService.validateNumeric('amount', amount, min: 0.01);
    
    return BaseService.handleRequest('add payment to sale $saleId', () async {
      final response = await ApiService.post(
        '/sales/$saleId/payments',
        data: {
          'method': method.value,
          'amount': amount,
          if (reference?.trim().isNotEmpty == true) 'reference': reference!.trim(),
        },
        requestId: requestId,
      );
      
      return pos.Sale.fromJson(BaseService.parseItem(response, key: 'sale'));
    });
  }

  // Reporting and Analytics

  /// Get sales summary for a date range
  static Future<pos.SalesSummary> getSalesSummary({
    required String startDate,
    required String endDate,
    String? requestId,
  }) async {
    BaseService.validateDate('start_date', startDate);
    BaseService.validateDate('end_date', endDate);
    
    return BaseService.handleRequest('fetch sales summary', () async {
      final response = await ApiService.get(
        '/sales/summary',
        queryParams: {
          'startDate': startDate,
          'endDate': endDate,
        },
        requestId: requestId,
      );
      
      return pos.SalesSummary.fromJson(BaseService.parseItem(response, key: 'summary'));
    });
  }

  /// Get today's sales summary
  static Future<pos.SalesSummary> getTodaysSummary({String? requestId}) async {
    final today = DateTime.now();
    final startDate = '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
    
    return getSalesSummary(
      startDate: startDate,
      endDate: startDate,
      requestId: requestId,
    );
  }

  /// Get sales analytics for dashboard
  static Future<Map<String, dynamic>> getSalesAnalytics({
    required String startDate,
    required String endDate,
    String? requestId,
  }) async {
    BaseService.validateDate('start_date', startDate);
    BaseService.validateDate('end_date', endDate);
    
    return BaseService.handleRequest('fetch sales analytics', () async {
      final response = await ApiService.get(
        '/sales/analytics',
        queryParams: {
          'startDate': startDate,
          'endDate': endDate,
        },
        requestId: requestId,
      );
      
      return response;
    });
  }

  // Product Search for POS

  /// Search products for POS (includes stock availability)
  static Future<List<Product>> searchProductsForPos(
    String query, {
    bool availableOnly = true,
    String? requestId,
  }) async {
    BaseService.validateRequired('query', query);
    
    return BaseService.handleRequest('search products for POS', () async {
      final response = await ApiService.get(
        '/products/search',
        queryParams: {
          'q': query.trim(),
          if (availableOnly) 'available_only': true,
        },
        requestId: requestId,
      );
      
      return BaseService.parseList(response, key: 'results')
          .map((item) => Product.fromJson(item))
          .toList();
    });
  }

  /// Get product by barcode for POS
  static Future<Product?> getProductByBarcode(
    String barcode, {
    String? requestId,
  }) async {
    BaseService.validateRequired('barcode', barcode);
    
    return BaseService.handleRequest('find product by barcode for POS', () async {
      try {
        // Search products by barcode using the search endpoint
        final products = await searchProductsForPos(barcode, requestId: requestId);
        
        // Look for exact barcode match
        for (final product in products) {
          if (product.barcode != null && product.barcode!.trim() == barcode.trim()) {
            return product;
          }
        }
        
        // If no exact barcode match, try searching by SKU
        for (final product in products) {
          if (product.sku.trim() == barcode.trim()) {
            return product;
          }
        }
        
        return null;
      } catch (e) {
        // Return null if search fails
        return null;
      }
    });
  }
  // Receipt Generation

  /// Generate receipt data for printing/sharing
  static Map<String, dynamic> generateReceiptData(pos.Sale sale, {
    String? businessName,
    String? businessAddress,
    String? businessPhone,
  }) {
    return {
      'business': {
        'name': businessName ?? 'Stock Management System',
        'address': businessAddress ?? '',
        'phone': businessPhone ?? '',
      },
      'sale': {
        'receiptNumber': sale.formattedReceiptNumber,
        'date': sale.formattedDate,
        'items': sale.items.map((item) => {
          'name': item.productName,
          'sku': item.productSku,
          'quantity': item.quantity,
          'unitPrice': item.unitPrice,
          'discount': item.discount,
          'subtotal': item.subtotal,
          'total': item.total,
        }).toList(),
        'subtotal': sale.subtotal,
        'totalDiscount': sale.totalDiscount,
        'totalTax': sale.totalTax,
        'total': sale.total,
        'payments': sale.payments.map((payment) => {
          'method': payment.method.label,
          'amount': payment.amount,
          'reference': payment.reference,
        }).toList(),
        'customer': sale.customer?.name,
        'notes': sale.notes,
      },
      'generatedAt': DateTime.now().toIso8601String(),
    };
  }

  /// Validate sale before processing
  static String? validateSale(pos.Sale sale) {
    if (sale.items.isEmpty) {
      return 'Sale must contain at least one item';
    }
    
    for (final item in sale.items) {
      if (item.quantity <= 0) {
        return 'All items must have a quantity greater than 0';
      }
      if (item.unitPrice < 0) {
        return 'All items must have a valid price';
      }
    }
    
    if (sale.total <= 0) {
      return 'Sale total must be greater than 0';
    }
    
    final totalPayments = sale.amountPaid;
    if (totalPayments < sale.total - 0.01) { // Allow for small floating point differences
      return 'Payment amount is insufficient. Missing: \$${(sale.total - totalPayments).toStringAsFixed(2)}';
    }
    
    return null; // No errors
  }
}