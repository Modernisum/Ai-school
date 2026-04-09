import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:chatra/core/network/api_response.dart';

/// Core API service - base URLs, auth headers, and shared utilities.
/// Standardized with ApiResponse for crash prevention.
class ApiService {
  static const String serverUrl = 'http://10.0.2.2:8080';
  static const String apiBase = '$serverUrl/api';
  static String get wsUrl => serverUrl.replaceFirst('http', 'ws') + '/ws';

  final storage = const FlutterSecureStorage();

  Future<String> getSocketUrl() async {
    final sid = await storage.read(key: 'school_id') ?? 'default_school';
    return '$wsUrl/$sid';
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async => await storage.deleteAll();

  // ── Shared Helper ────────────────────────────────────────────────────────

  Future<Map<String, String>> _headers() async {
    final token = await storage.read(key: 'jwt_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ── Auth & Dashboard Core ───────────────────────────────────────────────

  Future<ApiResponse<List<dynamic>>> getProfiles(String ident) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBase/auth/student/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          if (data['accessToken'] != null) {
            await storage.write(key: 'jwt_token', value: data['accessToken'].toString());
          }
          if (data['profiles'] != null) return ApiSuccess(data['profiles'] as List<dynamic>);
        }
      }
      return ApiError("Login failed. Status: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getStudentProfile(String studentId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$apiBase/students/$sid/$studentId'), headers: await _headers());
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiSuccess(data['data'] != null && data['success'] == true ? data['data'] : data);
      }
      return ApiError("Profile error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getStudentAttendance(String studentId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$apiBase/operations/attendance/$sid/student/$studentId'), headers: await _headers());
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Attendance error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getTimetable() async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$apiBase/school/$sid/timetable'), headers: await _headers());
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Timetable error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Fees ──────────────────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> getStudentFees(String studentId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$serverUrl/$sid/mobile/fees/$studentId'), headers: await _headers());
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Fees error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> createRazorpayOrder(Map<String, dynamic> payload) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.post(Uri.parse('$serverUrl/$sid/mobile/order'), headers: await _headers(), body: jsonEncode(payload));
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Order error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Storage and Profile Management ────────────────────────────────────────

  Future<String?> uploadFile(http.ByteStream fileStream, int length,
      String filename, String schoolId, String userType) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final uri = Uri.parse('$apiBase/storage/upload');

      final request = http.MultipartRequest('POST', uri)
        ..headers['Authorization'] = 'Bearer $token'
        ..fields['school_id'] = schoolId
        ..fields['user_type'] = userType
        ..files.add(http.MultipartFile(
          'file',
          fileStream,
          length,
          filename: filename,
        ));

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        final data = jsonDecode(responseBody);
        if (data['success'] == true && data['data'] != null) {
          return data['data']['public_url'];
        }
      }
      return null;
    } catch (e) {
      debugPrint("Upload Exception: $e");
      return null;
    }
  }

  Future<bool> markAsPermanent(String fileUrl) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final response = await http.post(
        Uri.parse('$apiBase/storage/mark-permanent'),
        headers: await _headers(),
        body: jsonEncode({'school_id': sid, 'file_url': fileUrl}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateStudentProfile(String studentId, Map<String, dynamic> data) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.put(
        Uri.parse('$apiBase/students/$sid/$studentId'),
        headers: await _headers(),
        body: jsonEncode(data),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ── Academic ──────────────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> getExams() async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$apiBase/exams/$sid/upcoming'), headers: await _headers());
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Exams error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getDocumentBox(String studentId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$apiBase/students/$sid/documents/$studentId'), headers: await _headers());
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Documents error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Content ───────────────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> getAnnouncements() async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(Uri.parse('$apiBase/announcements/$sid/school/all'), headers: await _headers());
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Announcement error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Responsibility API ────────────────────────────────────────────────────

  Future<ApiResponse<List<dynamic>>> getStudentResponsibilities() async {
    try {
      final sid = await storage.read(key: 'school_id');
      final studentId = await storage.read(key: 'student_id');
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$sid/students/$studentId/responsibilities'),
        headers: await _headers(),
      );
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Responsibilities error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getResponsibilityTeachers(String responsibilityId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$sid/$responsibilityId/teachers'),
        headers: await _headers(),
      );
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Teachers error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getFeeBreakdownByResponsibility(String responsibilityId) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final studentId = await storage.read(key: 'student_id');
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$sid/$responsibilityId/students/$studentId/fees'),
        headers: await _headers(),
      );
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Fee breakdown error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }
}
