import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // NOTE: Use your machine's local IP address instead of localhost if testing on a physical device.
  // 10.0.2.2 is used for Android Emulator to reach host machine's localhost.
  static const String baseUrl = 'http://10.0.2.2:8080/622079/mobile'; 
  final storage = const FlutterSecureStorage();

  Future<bool> login(String ident, String role) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident, 'role': role}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      print("Login Error: $e");
      return false;
    }
  }

  Future<bool> verifyOtp(String ident, String role, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident, 'role': role, 'otp': otp}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          // Store WhatsApp-style persistent token
          await storage.write(key: 'jwt_token', value: data['token']);
          await storage.write(key: 'user_role', value: role);
          return true;
        }
      }
      return false;
    } catch (e) {
      print("Verify OTP Error: $e");
      return false;
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
