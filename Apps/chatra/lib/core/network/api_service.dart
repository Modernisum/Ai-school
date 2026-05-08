import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:chatra/core/network/api_response.dart';

/// Core API service — centralized auth, HTTP wrappers, and token refresh.
class ApiService {
  static const String serverUrl = 'http://10.0.2.2:8080';
  static const String apiBase = '$serverUrl/api';
  static String get wsUrl => serverUrl.replaceFirst('http', 'ws') + '/ws';

  final storage = const FlutterSecureStorage();

  /// Called when the session is unrecoverable (refresh fails → force logout).
  VoidCallback? onSessionExpired;

  // ── Auth helpers (package-visible for LeaveApi et al.) ──────────────────

  Future<String> getToken() async {
    final token = await storage.read(key: 'jwt_token');
    if (token == null || token.isEmpty) throw Exception('No auth token');
    return token;
  }

  Future<String> getSchoolId() async {
    final sid = await storage.read(key: 'school_id');
    if (sid == null || sid.isEmpty) throw Exception('No school ID');
    return sid;
  }

  Future<Map<String, String>> authHeaders() async {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${await getToken()}',
    };
  }

  // ── Token refresh ───────────────────────────────────────────────────────

  Future<bool> _tryRefreshToken() async {
    try {
      final currentToken = await storage.read(key: 'jwt_token');
      if (currentToken == null) return false;

      final response = await http.post(
        Uri.parse('$apiBase/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $currentToken',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newToken = data['token'] ?? data['accessToken'];
        if (newToken != null) {
          await storage.write(key: 'jwt_token', value: newToken.toString());
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint("Token refresh failed: $e");
      return false;
    }
  }

  // ── HTTP wrappers with automatic 401 retry ──────────────────────────────

  Future<http.Response> _get(String url) async {
    final response = await http.get(
      Uri.parse(url),
      headers: await authHeaders(),
    );
    if (response.statusCode == 401 && await _tryRefreshToken()) {
      return http.get(Uri.parse(url), headers: await authHeaders());
    }
    if (response.statusCode == 401) onSessionExpired?.call();
    return response;
  }

  Future<http.Response> _post(String url, {Map<String, dynamic>? body}) async {
    final response = await http.post(
      Uri.parse(url),
      headers: await authHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    if (response.statusCode == 401 && await _tryRefreshToken()) {
      return http.post(Uri.parse(url),
          headers: await authHeaders(), body: body != null ? jsonEncode(body) : null);
    }
    if (response.statusCode == 401) onSessionExpired?.call();
    return response;
  }

  Future<http.Response> _put(String url, {Map<String, dynamic>? body}) async {
    final response = await http.put(
      Uri.parse(url),
      headers: await authHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    if (response.statusCode == 401 && await _tryRefreshToken()) {
      return http.put(Uri.parse(url),
          headers: await authHeaders(), body: body != null ? jsonEncode(body) : null);
    }
    if (response.statusCode == 401) onSessionExpired?.call();
    return response;
  }

  // ── Session ─────────────────────────────────────────────────────────────

  Future<String> getSocketUrl() async {
    final sid = await storage.read(key: 'school_id') ?? 'default_school';
    return '$wsUrl/$sid';
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async => await storage.deleteAll();

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
      final sid = await getSchoolId();
      final response = await _get('$apiBase/students/$sid/$studentId');
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
      final sid = await getSchoolId();
      final response = await _get('$apiBase/operations/attendance/$sid/student/$studentId');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Attendance error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getTimetable() async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$apiBase/school/$sid/timetable');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Timetable error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Fees ────────────────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> getStudentFees(String studentId) async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$serverUrl/$sid/mobile/fees/$studentId');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Fees error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> createRazorpayOrder(Map<String, dynamic> payload) async {
    try {
      final sid = await getSchoolId();
      final response = await _post('$serverUrl/$sid/mobile/order', body: payload);
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Order error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Storage & Profile ───────────────────────────────────────────────────

  Future<String?> uploadFile(http.ByteStream fileStream, int length,
      String filename, String schoolId, String userType) async {
    try {
      final token = await getToken();
      final uri = Uri.parse('$apiBase/storage/upload');

      final request = http.MultipartRequest('POST', uri)
        ..headers['Authorization'] = 'Bearer $token'
        ..fields['school_id'] = schoolId
        ..fields['user_type'] = userType
        ..files.add(http.MultipartFile('file', fileStream, length, filename: filename));

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
      final sid = await getSchoolId();
      final response = await _post('$apiBase/storage/mark-permanent',
          body: {'school_id': sid, 'file_url': fileUrl});
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateStudentProfile(String studentId, Map<String, dynamic> data) async {
    try {
      final sid = await getSchoolId();
      final response = await _put('$apiBase/students/$sid/$studentId', body: data);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ── Academic ────────────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> getExams() async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$apiBase/exams/$sid/upcoming');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Exams error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getDocumentBox(String studentId) async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$apiBase/students/$sid/documents/$studentId');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Documents error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Content ─────────────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> getAnnouncements() async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$apiBase/announcements/$sid/school/all');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Announcement error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── Responsibility ──────────────────────────────────────────────────────

  Future<ApiResponse<List<dynamic>>> getStudentResponsibilities() async {
    try {
      final sid = await getSchoolId();
      final studentId = await storage.read(key: 'student_id');
      final response = await _get('$apiBase/responsibility/$sid/students/$studentId/responsibilities');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Responsibilities error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getResponsibilityTeachers(String responsibilityId) async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$apiBase/responsibility/$sid/$responsibilityId/teachers');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Teachers error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getFeeBreakdownByResponsibility(String responsibilityId) async {
    try {
      final sid = await getSchoolId();
      final studentId = await storage.read(key: 'student_id');
      final response = await _get('$apiBase/responsibility/$sid/$responsibilityId/students/$studentId/fees');
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Fee breakdown error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> registerDevice(String token) async {
    try {
      final sid = await storage.read(key: 'school_id');
      final uid = await storage.read(key: 'user_id');
      if (sid == null || uid == null) return ApiError("Registration error: Missing session info");

      final response = await _post('$apiBase/auth/register-device', body: {
        'school_id': sid,
        'user_id': uid,
        'token': token,
        'platform': kIsWeb ? 'web' : (defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android'),
      });
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Device registration error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  // ── AI Integration ──────────────────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> aiQuery(String query) async {
    try {
      final sid = await getSchoolId();
      final response = await _post('$apiBase/ai/$sid/query', body: {'query': query});
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("AI query failed: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<List<dynamic>>> getAiChatHistory() async {
    try {
      final sid = await getSchoolId();
      final response = await _get('$apiBase/chat/$sid/ai-history');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiSuccess(data['data'] as List<dynamic>);
      }
      return ApiError("History error: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> aiGenerateExam(Map<String, dynamic> params) async {
    try {
      final sid = await getSchoolId();
      final response = await _post('$apiBase/ai/$sid/exam/generate', body: params);
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Exam generation failed: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      return ApiError(e.toString());
    }
  }
}
