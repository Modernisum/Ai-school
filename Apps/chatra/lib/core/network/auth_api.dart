import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:chatra/core/network/api_service.dart';

/// Handles all authentication-related API calls
class AuthApi {
  final FlutterSecureStorage storage;
  AuthApi({required this.storage});

  Future<List<dynamic>?> getProfiles(String ident) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiService.apiBase}/auth/student/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          if (data['accessToken'] != null) {
            await storage.write(key: 'jwt_token', value: data['accessToken'].toString());
          }
          if (data['expiresIn'] != null) {
            await storage.write(key: 'token_expires', value: data['expiresIn'].toString());
          }
          if (data['profiles'] != null) return data['profiles'] as List<dynamic>;
        }
      }
      return null;
    } catch (e) {
      debugPrint('AuthApi.getProfiles Error: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> fetchStudentDetails(String schoolId, String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      if (token == null || token.isEmpty) return null;
      final url = '${ApiService.apiBase}/students/$schoolId/$studentId';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          await storage.write(key: 'student_details', value: jsonEncode(data['data']));
          await storage.write(key: 'school_id', value: schoolId);
          await storage.write(key: 'student_id', value: studentId);
          await storage.write(key: 'user_role', value: 'student');
          return data['data'] as Map<String, dynamic>;
        }
      }
      return null;
    } catch (e) {
      debugPrint('AuthApi.fetchStudentDetails Error: $e');
      return null;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    await storage.deleteAll();
  }
}
