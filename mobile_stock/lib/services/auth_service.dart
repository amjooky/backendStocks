import 'package:meta/meta.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import 'base_service.dart';
import 'api_service.dart';

/// Service for handling authentication and user management
@immutable
class AuthService extends BaseService {
  static String get serviceName => 'AuthService';

  // Storage keys
  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';
  static const String _usernameKey = 'username';
  static const String _emailKey = 'email';
  static const String _roleKey = 'role';

  /// Logs in a user with username and password
  /// 
  /// [username] - The user's username
  /// [password] - The user's password
  /// [requestId] - Optional request ID for cancellation
  static Future<User> login(
    String username,
    String password, {
    String? requestId,
  }) async {
    // Validate inputs
    BaseService.validateRequired('username', username);
    BaseService.validateRequired('password', password);
    
    return BaseService.handleRequest('login user', () async {
      // Use real stock management backend API
      final response = await ApiService.post(
        '/auth/login',
        data: {
          'username': username.trim(),
          'password': password,
        },
        requestId: requestId,
      );

      // Parse response
      final token = response['token'] as String?;
      final userData = response['user'] as Map<String, dynamic>?;

      if (token == null || userData == null) {
        throw ApiException('Invalid login response format');
      }

      // Create user model
      final user = User.fromJson(userData);

      // Save auth data
      await _saveAuthData(token, user);

      return user;
    });
  }

  /// Logs out the current user
  static Future<void> logout() async {
    return BaseService.handleRequest('logout user', () async {
      try {
        // Try to call logout endpoint if available (optional)
        try {
          await ApiService.post('/auth/logout', data: {});
        } catch (e) {
          // Ignore API errors during logout - we still want to clear local data
          print('Logout API call failed (this is usually fine): $e');
        }
      } finally {
        // Always clear local auth data regardless of API call success/failure
        await _clearAuthData();
      }
    });
  }

  /// Clear all authentication data from local storage
  static Future<void> _clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(_tokenKey),
      prefs.remove(_userIdKey),
      prefs.remove(_usernameKey),
      prefs.remove(_emailKey),
      prefs.remove(_roleKey),
    ]);
  }

  /// Gets the currently logged in user
  /// 
  /// Returns null if no user is logged in
  static Future<User?> getCurrentUser() async {
    return BaseService.handleRequest('get current user', () async {
      final prefs = await SharedPreferences.getInstance();
      
      // Check if we have user data
      final userId = prefs.getString(_userIdKey);
      final username = prefs.getString(_usernameKey);
      final email = prefs.getString(_emailKey);
      final role = prefs.getString(_roleKey);

      if (userId == null || username == null || email == null || role == null) {
        return null;
      }

      // Create user model from stored data
      return User(
        id: int.tryParse(userId) ?? 0,
        username: username,
        email: email,
        role: role,
      );
    });
  }

  /// Checks if a user is currently logged in
  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey) != null;
  }

  /// Gets the current authentication token
  static Future<String?> getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Updates stored user profile data
  static Future<void> _saveAuthData(String token, User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userIdKey, user.id.toString());
    await prefs.setString(_usernameKey, user.username);
    await prefs.setString(_emailKey, user.email);
    await prefs.setString(_roleKey, user.role);
  }

  /// Validates the current session
  /// 
  /// Checks if the stored token is still valid
  static Future<bool> validateSession() async {
    try {
      final response = await ApiService.get('/auth/validate');
      return response['valid'] == true;
    } catch (e) {
      // Session is invalid if request fails
      return false;
    }
  }

  /// Changes the current user's password
  /// 
  /// [currentPassword] - The user's current password
  /// [newPassword] - The new password to set
  /// [requestId] - Optional request ID for cancellation
  static Future<void> changePassword(
    String currentPassword,
    String newPassword, {
    String? requestId,
  }) async {
    BaseService.validateRequired('currentPassword', currentPassword);
    BaseService.validateRequired('newPassword', newPassword);
    _validatePassword(newPassword);

    return BaseService.handleRequest('change password', () async {
      await ApiService.post(
        '/auth/password',
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
        },
        requestId: requestId,
      );
    });
  }

  /// Validates password requirements
  static void _validatePassword(String password) {
    if (password.length < 8) {
      throw ArgumentError('Password must be at least 8 characters long');
    }
    if (!password.contains(RegExp(r'[A-Z]'))) {
      throw ArgumentError('Password must contain at least one uppercase letter');
    }
    if (!password.contains(RegExp(r'[a-z]'))) {
      throw ArgumentError('Password must contain at least one lowercase letter');
    }
    if (!password.contains(RegExp(r'[0-9]'))) {
      throw ArgumentError('Password must contain at least one number');
    }
  }
}