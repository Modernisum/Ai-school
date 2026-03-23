import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiService {
  static const String serverUrl = 'http://10.0.2.2:8080';
  static const String apiBase = '$serverUrl/api';
  
  final storage = const FlutterSecureStorage();

  // Unified global login - returns success if existence is confirmed and OTP sent
  Future<bool> login(String ident) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBase/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident, 'userType': 'employee'}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      debugPrint("Login Error: $e");
      return false;
    }
  }

  // Unified global OTP verify - returns matched profiles across all schools
  Future<List<dynamic>?> verifyOtp(String ident, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBase/auth/verify-otp-global'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident, 'otp': otp}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['profiles'] != null) {
          return data['profiles'] as List<dynamic>;
        }
      }
      return null;
    } catch (e) {
      debugPrint("Verify OTP Error: $e");
      return null;
    }
  }

  // Finalizes profile selection and issues token
  Future<bool> selectProfile(String schoolId, String ident, String userId, String userType) async {
    try {
      final response = await http.post(
        Uri.parse('$serverUrl/$schoolId/mobile/select-profile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ident': ident,
          'user_id': userId,
          'user_type': userType,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          await storage.write(key: 'jwt_token', value: data['token']);
          await storage.write(key: 'user_role', value: userType);
          await storage.write(key: 'school_id', value: schoolId);
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint("Select Profile Error: $e");
      return false;
    }
  }

  Future<String?> getSchoolId() async {
    return await storage.read(key: 'school_id');
  }

  Future<String> buildMobileUrl(String path) async {
    final sid = await storage.read(key: 'school_id');
    if (sid == null) throw Exception("No school ID found in storage");
    return '$serverUrl/$sid/mobile/$path';
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }
  
  Future<void> logout() async {
    await storage.deleteAll();
  }
}
