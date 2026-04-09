import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';

/// Handles dashboard, profile, and attendance data.
class DashboardApi {
  final FlutterSecureStorage storage;
  DashboardApi({required this.storage});

  Future<ApiResponse<Map<String, dynamic>>> getStudentProfile(String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      if (token == null || sid == null) return const ApiError("Unauthorized access.");

      final response = await http.get(
        Uri.parse('${ApiService.apiBase}/students/$sid/$studentId'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) return ApiSuccess(data['data']);
        return ApiSuccess(data);
      }
      return ApiError("Profile fetch failed. code: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      debugPrint('DashboardApi.getStudentProfile Error: $e');
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getStudentAttendance(String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      if (token == null || sid == null) return const ApiError("Unauthorized");

      final url = '${ApiService.apiBase}/operations/attendance/$sid/student/$studentId';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Attendance fetch failed. code: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      debugPrint('DashboardApi.getStudentAttendance Error: $e');
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getTimetable() async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      if (token == null || sid == null) return const ApiError("Unauthorized");

      final url = '${ApiService.apiBase}/school/$sid/timetable';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) return ApiSuccess(jsonDecode(response.body));
      return ApiError("Timetable fetch failed. code: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      debugPrint('DashboardApi.getTimetable Error: $e');
      return ApiError(e.toString());
    }
  }
}
