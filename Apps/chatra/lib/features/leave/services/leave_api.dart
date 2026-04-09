import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:chatra/core/network/api_response.dart';
import 'package:chatra/core/network/api_service.dart';

class LeaveApi {
  final ApiService _coreApi;

  LeaveApi(this._coreApi);

  Future<ApiResponse<List<dynamic>>> getLeaveApplications() async {
    try {
      final token = await _coreApi.storage.read(key: 'jwt_token');
      final sid = await _coreApi.storage.read(key: 'school_id');
      if (token == null || sid == null) return const ApiError("Unauthorized");

      final url = '${ApiService.apiBase}/leave/$sid';
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return ApiSuccess(data);
        if (data['leaves'] != null) {
          return ApiSuccess(data['leaves'] as List<dynamic>);
        }
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
      final token = await _coreApi.storage.read(key: 'jwt_token');
      final sid = await _coreApi.storage.read(key: 'school_id');
      final employeeId = await _coreApi.storage.read(key: 'employee_id') ?? '';
      
      final url = '${ApiService.apiBase}/leave/$sid/balance?employee_id=$employeeId';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
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
      final token = await _coreApi.storage.read(key: 'jwt_token');
      final sid = await _coreApi.storage.read(key: 'school_id');
      final url = '${ApiService.apiBase}/notifications/$sid';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
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
      final token = await _coreApi.storage.read(key: 'jwt_token');
      final sid = await _coreApi.storage.read(key: 'school_id');
      final url = '${ApiService.apiBase}/leave/$sid';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
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
      final token = await _coreApi.storage.read(key: 'jwt_token');
      final sid = await _coreApi.storage.read(key: 'school_id');
      final url = '${ApiService.apiBase}/leave/$sid/$leaveId/$action';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) return const ApiSuccess(true);
      return ApiError("Failed to update status. code: ${response.statusCode}");
    } catch (e) {
      debugPrint("Update Leave Status Error: $e");
      return ApiError(e.toString());
    }
  }
}
