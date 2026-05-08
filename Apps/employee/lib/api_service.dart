import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String serverUrl = 'http://localhost:8080';
  static const String apiBase = '$serverUrl/api';

  final storage = const FlutterSecureStorage();

  /// Called when the session is unrecoverable (refresh fails → force logout).
  VoidCallback? onSessionExpired;

  // ── Auth helpers ────────────────────────────────────────────────────────

  Future<String> _getToken() async {
    final token = await storage.read(key: 'jwt_token');
    if (token == null || token.isEmpty) throw Exception('No auth token');
    return token;
  }

  Future<String> _getSchoolId() async {
    final sid = await storage.read(key: 'school_id');
    if (sid == null || sid.isEmpty) throw Exception('No school ID');
    return sid;
  }

  Future<Map<String, String>> _authHeaders() async {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${await _getToken()}',
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
    final response = await http.get(Uri.parse(url), headers: await _authHeaders());
    if (response.statusCode == 401 && await _tryRefreshToken()) {
      return http.get(Uri.parse(url), headers: await _authHeaders());
    }
    if (response.statusCode == 401) onSessionExpired?.call();
    return response;
  }

  Future<http.Response> _post(String url, {Map<String, dynamic>? body}) async {
    final response = await http.post(Uri.parse(url),
        headers: await _authHeaders(), body: body != null ? jsonEncode(body) : null);
    if (response.statusCode == 401 && await _tryRefreshToken()) {
      return http.post(Uri.parse(url),
          headers: await _authHeaders(), body: body != null ? jsonEncode(body) : null);
    }
    if (response.statusCode == 401) onSessionExpired?.call();
    return response;
  }

  Future<http.Response> _put(String url, {Map<String, dynamic>? body}) async {
    final response = await http.put(Uri.parse(url),
        headers: await _authHeaders(), body: body != null ? jsonEncode(body) : null);
    if (response.statusCode == 401 && await _tryRefreshToken()) {
      return http.put(Uri.parse(url),
          headers: await _authHeaders(), body: body != null ? jsonEncode(body) : null);
    }
    if (response.statusCode == 401) onSessionExpired?.call();
    return response;
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  Future<List<dynamic>?> getProfiles(String ident) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBase/auth/employee/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['profiles'] != null) {
          return data['profiles'] as List<dynamic>;
        }
      }
      return null;
    } catch (e) {
      debugPrint("Get Profiles Error: $e");
      return null;
    }
  }

  Future<bool> selectProfile(
      String schoolId, String ident, String userId, String userType) async {
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

  Future<String?> getSchoolId() => storage.read(key: 'school_id');

  Future<String> buildMobileUrl(String path) async {
    final sid = await _getSchoolId();
    return '$serverUrl/$sid/mobile/$path';
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async => storage.deleteAll();

  // ── File Upload ─────────────────────────────────────────────────────────

  Future<String?> uploadFile(http.ByteStream fileStream, int length,
      String filename, String schoolId, String userType) async {
    try {
      final token = await _getToken();
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
      debugPrint("Upload Error: ${response.statusCode} - $responseBody");
      return null;
    } catch (e) {
      debugPrint("Upload Exception: $e");
      return null;
    }
  }

  Future<bool> markAsPermanent(String fileUrl) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/storage/mark-permanent',
          body: {'school_id': sid, 'file_url': fileUrl});
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Mark Permanent Exception: $e");
      return false;
    }
  }

  // ── Complaints ──────────────────────────────────────────────────────────

  Future<bool> createComplain(Map<String, dynamic> payload) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/complains/$sid', body: payload);
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Create Complain Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getComplains({String? userId, String? userRole}) async {
    try {
      final sid = await _getSchoolId();
      String url = '$apiBase/complains/$sid';
      final params = <String>[];
      if (userId != null) params.add('user_id=$userId');
      if (userRole != null) params.add('user_role=$userRole');
      if (params.isNotEmpty) url += '?${params.join('&')}';

      final response = await _get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] as List<dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint("Get Complains Error: $e");
      return null;
    }
  }

  // ── Responsibilities ────────────────────────────────────────────────────

  Future<List<dynamic>?> getResponsibilities(String schoolId) async {
    try {
      final response = await _get('$apiBase/responsibility/$schoolId');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Responsibilities Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getResponsibilityDetail(
      String schoolId, String responsibilityId) async {
    try {
      final response = await _get('$apiBase/responsibility/$schoolId/$responsibilityId');
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Responsibility Detail Error: $e");
      return null;
    }
  }

  Future<List<dynamic>?> getEmployeeResponsibilities(
      String schoolId, String employeeId) async {
    try {
      final response = await _get(
          '$apiBase/responsibility/$schoolId/employees/$employeeId/responsibilities');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Employee Responsibilities Error: $e");
      return null;
    }
  }

  // ── Space-Responsibility linking ────────────────────────────────────────

  Future<List<dynamic>?> getSpaceResponsibilities(
      String schoolId, String spaceId) async {
    try {
      final response =
          await _get('$apiBase/responsibility/$schoolId/spaces/$spaceId/responsibilities');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Space Responsibilities Error: $e");
      return null;
    }
  }

  // ── Salary generation from responsibilities ──────────────────────────────

  Future<Map<String, dynamic>?> generateSalaries(
      String schoolId, int month, int year) async {
    try {
      final response = await _post(
          '$apiBase/responsibility/$schoolId/generate-salaries/$month/$year');
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Generate Salaries Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getSalaryBreakdown(
      String schoolId, String employeeId) async {
    try {
      final response = await _get(
          '$apiBase/employees/$employeeId/salary-breakdown');
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Salary Breakdown Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> syncStudentFees(String schoolId,
      {String? responsibilityId}) async {
    try {
      final url = responsibilityId != null
          ? '$apiBase/responsibility/$schoolId/$responsibilityId/sync-student-fees'
          : '$apiBase/responsibility/$schoolId/sync-student-fees';
      final response = await _post(url);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("Sync Student Fees Error: $e");
      return null;
    }
  }

  Future<List<dynamic>?> getSpaces(String schoolId) async {
    try {
      final response = await _get('$apiBase/space/$schoolId');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Spaces Error: $e");
      return null;
    }
  }

  Future<bool> updateResponsibilitySpaces(
      String schoolId, String responsibilityId, List<String> spaceIds) async {
    try {
      final response = await _put(
          '$apiBase/responsibility/$schoolId/responsibilities/$responsibilityId/bulk-update',
          body: {'space_ids': spaceIds});
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Update Responsibility Spaces Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getTasksByResponsibility(
      String schoolId, String responsibilityId) async {
    try {
      final response =
          await _get('$apiBase/responsibility/$schoolId/$responsibilityId/tasks');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Tasks By Responsibility Error: $e");
      return null;
    }
  }

  // ── Responsibility Analytics ────────────────────────────────────────────

  Future<Map<String, dynamic>?> getResponsibilityAnalytics(
      String schoolId, String responsibilityId) async {
    try {
      final response =
          await _get('$apiBase/responsibility/$schoolId/$responsibilityId/analytics');
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Responsibility Analytics Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getEmployeeWorkloadMetrics(String schoolId,
      String employeeId, {String? startDate, String? endDate}) async {
    try {
      String url =
          '$apiBase/responsibility/$schoolId/metrics/workload?employee_id=$employeeId';
      if (startDate != null) url += '&start_date=$startDate';
      if (endDate != null) url += '&end_date=$endDate';
      final response = await _get(url);
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Employee Workload Metrics Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getResponsibilityUtilizationMetrics(
      String schoolId, String responsibilityId,
      {String? startDate, String? endDate}) async {
    try {
      String url =
          '$apiBase/responsibility/$schoolId/metrics/utilization?responsibility_id=$responsibilityId';
      if (startDate != null) url += '&start_date=$startDate';
      if (endDate != null) url += '&end_date=$endDate';
      final response = await _get(url);
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Responsibility Utilization Metrics Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getTeacherResponsibilityOverview(
      String schoolId, String employeeId) async {
    try {
      final response = await _get(
          '$apiBase/responsibility/$schoolId/overview/analytics?employee_id=$employeeId');
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Teacher Responsibility Overview Error: $e");
      return null;
    }
  }

  Future<bool> completeTask(String schoolId, String taskId) async {
    try {
      final response = await _put('$apiBase/task/$schoolId/$taskId/complete');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Complete Task Error: $e");
      return false;
    }
  }

  // ── Leave Management ────────────────────────────────────────────────────

  Future<List<dynamic>?> getLeaveApplications() async {
    try {
      final sid = await _getSchoolId();
      final response = await _get('$apiBase/leave/$sid');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Leave Applications Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getLeaveBalance(String employeeId) async {
    try {
      final sid = await _getSchoolId();
      final response = await _get('$apiBase/leave/$sid/balance/$employeeId');
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get Leave Balance Error: $e");
      return null;
    }
  }

  Future<bool> applyForLeave(Map<String, dynamic> payload) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/leave/$sid', body: payload);
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Apply For Leave Error: $e");
      return false;
    }
  }

  Future<bool> updateLeaveStatus(String leaveId, String action) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/leave/$sid/$leaveId/$action');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Update Leave Status Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getLeaveQueue(Map<String, dynamic> filters) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/leave/$sid/queue', body: filters);
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Leave Queue Error: $e");
      return null;
    }
  }

  Future<bool> applyConditionalApproval(
      String leaveId, Map<String, dynamic> conditions) async {
    try {
      final sid = await _getSchoolId();
      final response =
          await _post('$apiBase/leave/$sid/$leaveId/conditional/approve', body: conditions);
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Apply Conditional Approval Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getNotifications(bool unreadOnly) async {
    try {
      final sid = await _getSchoolId();
      final response = await _get(
          '$apiBase/leave/$sid/notifications?unread_only=${unreadOnly ? 'true' : 'false'}');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>);
      return null;
    } catch (e) {
      debugPrint("Get Notifications Error: $e");
      return null;
    }
  }

  Future<bool> markNotificationRead(String notificationId) async {
    try {
      final sid = await _getSchoolId();
      final response =
          await _post('$apiBase/leave/$sid/notifications/$notificationId/read');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Mark Notification Read Error: $e");
      return false;
    }
  }

  // ── Mobile Attendance ───────────────────────────────────────────────────

  Future<Map<String, dynamic>?> getQrAttendanceToken() async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/operations/attendance/$sid/qr-attendance',
          body: {"duration_minutes": 15, "class_name": "10-A"});
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Get QR Attendance Token Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> markMobileAttendance({
    required String studentId,
    required String status,
    required double latitude,
    required double longitude,
    String? qrToken,
  }) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/operations/attendance/$sid/mobile-attendance',
          body: {
            "student_id": studentId,
            "status": status,
            "latitude": latitude,
            "longitude": longitude,
            "qr_token": qrToken,
          });
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("Mark Mobile Attendance Error: $e");
      return null;
    }
  }

  Future<List<Map<String, dynamic>>?> syncOfflineAttendance(
      List<Map<String, dynamic>> records) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/operations/attendance/$sid/offline-sync',
          body: {"records": records});
      if (response.statusCode == 200) {
        return (jsonDecode(response.body)['data'] as List<dynamic>?)
            ?.cast<Map<String, dynamic>>();
      }
      return null;
    } catch (e) {
      debugPrint("Sync Offline Attendance Error: $e");
      return null;
    }
  }

  // ── AI Integration ──────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> aiQuery(String query) async {
    try {
      final sid = await _getSchoolId();
      final response =
          await _post('$apiBase/ai/$sid/query', body: {'query': query});
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("AI Query Error: $e");
      return null;
    }
  }

  Future<List<dynamic>?> getAiChatHistory() async {
    try {
      final sid = await _getSchoolId();
      final response = await _get('$apiBase/chat/$sid/ai-history');
      if (response.statusCode == 200) return (jsonDecode(response.body)['data'] as List<dynamic>?);
      return null;
    } catch (e) {
      debugPrint("AI History Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> aiGenerateTasks(String employeeId) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/ai/$sid/tasks/generate',
          body: {'employee_id': employeeId});
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("AI Generate Tasks Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> aiReorganizeTasks(String employeeId) async {
    try {
      final sid = await _getSchoolId();
      final response = await _post('$apiBase/ai/$sid/tasks/reorganize',
          body: {'employee_id': employeeId});
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("AI Reorganize Tasks Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> aiGenerateExam(Map<String, dynamic> params) async {
    try {
      final sid = await _getSchoolId();
      final response =
          await _post('$apiBase/ai/$sid/exam/generate', body: params);
      if (response.statusCode == 200) return jsonDecode(response.body)['data'];
      return null;
    } catch (e) {
      debugPrint("AI Generate Exam Error: $e");
      return null;
    }
  }
}
