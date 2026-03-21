import 'dart:convert';
import 'package:flutter/foundation.dart';
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

  Future<List<dynamic>?> verifyOtp(String ident, String role, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident, 'role': role, 'otp': otp}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['profiles'] != null) {
          return data['profiles'] as List<dynamic>;
        }
      }
      return null;
    } catch (e) {
      print("Verify OTP Error: $e");
      return null;
    }
  }

  Future<bool> selectProfile(String ident, String userId, String userType) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/select-profile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ident': ident,
          'user_id': userId,
          'user_type': userType
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          // Store WhatsApp-style persistent token
          await storage.write(key: 'jwt_token', value: data['token']);
          await storage.write(key: 'user_role', value: userType);
          if (data['user'] != null && data['user']['id'] != null) {
            await storage.write(key: 'student_id', value: data['user']['id'].toString());
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      print("Select Profile Error: $e");
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

  Future<Map<String, dynamic>?> getStudentFees(String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('$baseUrl/fees/$studentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print("Get Fees Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> createRazorpayOrder(Map<String, dynamic> payload) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.post(
        Uri.parse('$baseUrl/order'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print("Create Order Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getStudentProfile(String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('$baseUrl/profile/$studentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      print("Profile Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getStudentAttendance(String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('$baseUrl/attendance/$studentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      print("Attendance Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getTimetable() async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('$baseUrl/timetable'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      print("Timetable Error: $e");
      return null;
    }
  }

  Future<void> downloadFeeReceipt(String transactionId) async {
    await Future.delayed(const Duration(seconds: 2));
    debugPrint("Simulated download for Tx: $transactionId complete.");
  }

  Future<Map<String, dynamic>?> getExams(String schoolId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('http://10.0.2.2:8080/api/exams/$schoolId'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("Exams Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getDocumentBox(String schoolId, String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('http://10.0.2.2:8080/api/documentbox/$schoolId?studentId=$studentId'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("DocumentBox Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getAnnouncements(String schoolId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('http://10.0.2.2:8080/api/announcements/$schoolId/school/all'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("Announcements Error: $e");
      return null;
    }
  }
}
