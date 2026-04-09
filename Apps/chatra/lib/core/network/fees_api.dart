import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';

/// Handles fees, payment, and Razorpay-related API calls
class FeesApi {
  final FlutterSecureStorage storage;
  FeesApi({required this.storage});

  Future<ApiResponse<Map<String, dynamic>>> getStudentFees(String studentId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      if (token == null || sid == null) return const ApiError("Session expired. Please login again.");
      
      final url = '${ApiService.serverUrl}/$sid/mobile/fees/$studentId';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      );
      
      if (response.statusCode == 200) {
        return ApiSuccess(jsonDecode(response.body));
      }
      return ApiError("Failed to fetch fees. Status: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      debugPrint('FeesApi.getStudentFees Error: $e');
      return ApiError(e.toString());
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> createRazorpayOrder(Map<String, dynamic> payload) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      if (token == null || sid == null) return const ApiError("Session expired.");

      final url = '${ApiService.serverUrl}/$sid/mobile/order';
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode(payload),
      );
      
      if (response.statusCode == 200) {
        return ApiSuccess(jsonDecode(response.body));
      }
      return ApiError("Payment initialization failed. code: ${response.statusCode}", statusCode: response.statusCode);
    } catch (e) {
      debugPrint('FeesApi.createRazorpayOrder Error: $e');
      return ApiError(e.toString());
    }
  }

  Future<void> downloadFeeReceipt(String transactionId) async {
    await Future.delayed(const Duration(seconds: 2));
    debugPrint('Simulated download for Tx: $transactionId complete.');
  }
}
