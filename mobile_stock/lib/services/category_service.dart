import 'package:meta/meta.dart';

import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for managing categories
@immutable
class CategoryService extends BaseService {
  static String get serviceName => 'CategoryService';

  /// Fetches all categories
  /// 
  /// [requestId] - Optional request ID for cancellation
  static Future<List<Category>> getCategories({String? requestId}) async {
    return BaseService.handleRequest('fetch categories', () async {
      final response = await ApiService.get('/categories', requestId: requestId);
      
      // The API service wraps array responses in {'data': [...]}
      if (response.containsKey('data') && response['data'] is List) {
        final categoriesData = response['data'] as List<dynamic>;
        return categoriesData
            .map((item) => Category.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      // Direct array in response root
      else if (response.containsKey('categories') && response['categories'] is List) {
        return BaseService.parseList(response, key: 'categories')
            .map((item) => Category.fromJson(item))
            .toList();
      }
      // If response itself is the categories data
      else if (response is List) {
        return (response as List<dynamic>)
            .map((item) => Category.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      else {
        throw ApiException('Invalid response format for categories. Response: $response');
      }
    });
  }

  /// Fetches a single category by ID
  /// 
  /// [id] - The ID of the category to fetch
  /// [requestId] - Optional request ID for cancellation
  static Future<Category> getCategory(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('fetch category $id', () async {
      final response = await ApiService.get('/categories/$id', requestId: requestId);
      return Category.fromJson(BaseService.parseItem(response, key: 'category'));
    });
  }

  /// Creates a new category
  /// 
  /// [name] - The name of the category
  /// [description] - Optional description of the category
  /// [requestId] - Optional request ID for cancellation
  static Future<Category> createCategory(
    String name, {
    String? description,
    String? requestId,
  }) async {
    BaseService.validateRequired('name', name);
    
    return BaseService.handleRequest('create category', () async {
      final response = await ApiService.post(
        '/categories',
        data: {
          'name': name.trim(),
          if (description?.trim().isNotEmpty == true)
            'description': description!.trim(),
        },
        requestId: requestId,
      );
      
      return Category.fromJson(BaseService.parseItem(response, key: 'category'));
    });
  }

  /// Updates an existing category
  /// 
  /// [id] - The ID of the category to update
  /// [name] - The new name for the category
  /// [description] - Optional new description for the category
  /// [requestId] - Optional request ID for cancellation
  static Future<Category> updateCategory(
    int id,
    String name, {
    String? description,
    String? requestId,
  }) async {
    BaseService.validateNumeric('id', id, min: 1);
    BaseService.validateRequired('name', name);
    
    return BaseService.handleRequest('update category $id', () async {
      final response = await ApiService.put(
        '/categories/$id',
        data: {
          'name': name.trim(),
          if (description?.trim().isNotEmpty == true)
            'description': description!.trim(),
        },
        requestId: requestId,
      );
      
      return Category.fromJson(BaseService.parseItem(response, key: 'category'));
    });
  }

  /// Deletes a category
  /// 
  /// [id] - The ID of the category to delete
  /// [requestId] - Optional request ID for cancellation
  static Future<bool> deleteCategory(int id, {String? requestId}) async {
    BaseService.validateNumeric('id', id, min: 1);
    
    return BaseService.handleRequest('delete category $id', () async {
      final response = await ApiService.delete(
        '/categories/$id',
        requestId: requestId,
      );
      return BaseService.parseSuccess(response);
    });
  }
}