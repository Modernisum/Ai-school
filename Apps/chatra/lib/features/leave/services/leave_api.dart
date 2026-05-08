import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:chatra/core/network/api_response.dart';
import 'package:chatra/core/network/api_service.dart';

class LeaveApi {
  final ApiService _api;

  LeaveApi(this._api);

  Future<ApiResponse<List<dynamic>>> getLeaveApplications() async {
    try {
      final sid = await _api.getSchoolId();
      final response = await http.get(
        Uri.parse('${ApiService.apiBase}/leave/$sid'),
        headers: await _api.authHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return ApiSuccess(data);
        if (data['leaves'] != null) return ApiSuccess(data['leaves'] as List<dynamic>);
        return ApiSuccess(data['data'] as List<dynamic>? ?? []);
      }
      return ApiError("Failed with status ${response.statusCode}");
    } catch (e) {
      debugPrint("Get Leave Applications Error: $e");
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> getLeaveBalance() async {
    try {
      final sid = await _api.getSchoolId();
      final employeeId = await _api.storage.read(key: 'employee_id') ?? '';

      final response = await http.get(
        Uri.parse('${ApiService.apiBase}/leave/$sid/balance?employee_id=$employeeId'),
        headers: await _api.authHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) return ApiSuccess(data['data'] ?? {});
        return ApiSuccess(data);
      }
      return ApiError("Failed with status ${response.statusCode}");
    } catch (e) {
      debugPrint("Get Leave Balance Error: $e");
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<List<dynamic>>> getLeaveNotifications() async {
    try {
      final sid = await _api.getSchoolId();
      final response = await http.get(
        Uri.parse('${ApiService.apiBase}/notifications/$sid'),
        headers: await _api.authHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) return ApiSuccess(data['data'] as List<dynamic>);
        if (data is List) return ApiSuccess(data);
        return const ApiSuccess([]);
      }
      return ApiError("Failed with status ${response.statusCode}");
    } catch (e) {
      debugPrint("Get Leave Notifications Error: $e");
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<bool>> applyForLeave(Map<String, dynamic> leaveData) async {
    try {
      final sid = await _api.getSchoolId();
      final response = await http.post(
        Uri.parse('${ApiService.apiBase}/leave/$sid'),
        headers: await _api.authHeaders(),
        body: jsonEncode(leaveData),
      );

      if (response.statusCode == 200) return const ApiSuccess(true);
      return ApiError("Failed to apply for leave. Status: ${response.statusCode}");
    } catch (e) {
      debugPrint("Apply For Leave Error: $e");
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<bool>> updateLeaveStatus(int leaveId, String action) async {
    try {
      final sid = await _api.getSchoolId();
      final response = await http.post(
        Uri.parse('${ApiService.apiBase}/leave/$sid/$leaveId/$action'),
        headers: await _api.authHeaders(),
      );

      if (response.statusCode == 200) return const ApiSuccess(true);
      return ApiError("Failed to update status. code: ${response.statusCode}");
    } catch (e) {
      debugPrint("Update Leave Status Error: $e");
      return ApiError(e.toString());
    }
  }
}
