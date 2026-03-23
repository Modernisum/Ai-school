import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Use host machine's IP for emulator
  static const String serverUrl = 'http://10.0.2.2:8080';
  static const String apiBase = '$serverUrl/api';
  static String get wsUrl => serverUrl.replaceFirst('http', 'ws') + '/ws';
  
  Future<String> getSocketUrl() async {
    final sid = await storage.read(key: 'school_id') ?? 'default_school';
    return '$wsUrl/$sid';
  }

  
  final storage = const FlutterSecureStorage();

  // Unified global login - returns success if existence is confirmed and OTP sent
  Future<bool> login(String ident) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBase/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident}),
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
          if (data['user'] != null && data['user']['id'] != null) {
            await storage.write(
              key: 'student_id',
              value: data['user']['id'].toString(),
            );
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint("Select Profile Error: $e");
      return false;
    }
  }

  Future<String> _buildMobileUrl(String path) async {
    final sid = await storage.read(key: 'school_id');
    if (sid == null) throw Exception("No school ID found in storage");
    return '$serverUrl/$sid/mobile/$path';
  }

  Future<String> _buildApiUrl(String path) async {
    final sid = await storage.read(key: 'school_id');
    if (sid == null) throw Exception("No school ID found in storage");
    return '$apiBase/$path/$sid';
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
      final url = await _buildMobileUrl('fees/$studentId');
      final response = await http.get(
        Uri.parse(url),
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
      debugPrint("Get Fees Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> createRazorpayOrder(Map<String, dynamic> payload) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final url = await _buildMobileUrl('order');
      final response = await http.post(
        Uri.parse(url),
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
      debugPrint("Create Order Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getStudentProfile(String studentId) async {
    print("!!! CALLED getStudentProfile with id: $studentId");

    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/students/$sid/$studentId';
      debugPrint("Fetching Profile: $url with token: ${token?.substring(0, 10)}...");
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      debugPrint("Profile Response Code: ${response.statusCode}");
      debugPrint("Profile Response Body: ${response.body}");
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return data['data'];
        }
        return data;
      }
      return null;
    } catch (e) {
      debugPrint("Profile Error Exception: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getStudentAttendance(String studentId) async {
    print("!!! CALLED getStudentAttendance with id: $studentId");
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/operations/attendance/$sid/student/$studentId';
      print("!!! Fetching Attendance: $url");
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      print("!!! Attendance Response: ${response.statusCode}");
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      print("!!! Attendance Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getTimetable() async {
    print("!!! CALLED getTimetable");
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/school/$sid/timetable';

      print("!!! Fetching Timetable: $url");
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      print("!!! Timetable Response: ${response.statusCode}");
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      print("!!! Timetable Error: $e");
      return null;
    }
  }

  Future<void> downloadFeeReceipt(String transactionId) async {
    await Future.delayed(const Duration(seconds: 2));
    debugPrint("Simulated download for Tx: $transactionId complete.");
  }

  Future<Map<String, dynamic>?> getExams() async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final url = await _buildApiUrl('exams');
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("Exams Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getDocumentBox(String studentId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final token = await storage.read(key: 'jwt_token');
      final url = '$apiBase/documentbox/$sid?studentId=$studentId';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("DocumentBox Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getAnnouncements() async {
    try {
      final sid = await storage.read(key: 'school_id');
      final token = await storage.read(key: 'jwt_token');
      final url = '$apiBase/announcements/$sid/school/all';
      final response = await http.get(
        Uri.parse(url),
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
