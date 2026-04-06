import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiService {
  static const String serverUrl = 'http://localhost:8080';
  static const String apiBase = '$serverUrl/api';
  
  final storage = const FlutterSecureStorage();

  // Fetches profiles from the backend after Firebase OTP validation
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
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint("Select Profile Error: $e");
      return false;
    }
  }

  Future<String?> getSchoolId() async {
    return await storage.read(key: 'school_id');
  }

  Future<String> buildMobileUrl(String path) async {
    final sid = await storage.read(key: 'school_id');
    if (sid == null) throw Exception("No school ID found in storage");
    return '$serverUrl/$sid/mobile/$path';
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }
  
  Future<void> logout() async {
    await storage.deleteAll();
  }

  // Support for deferred image uploads
  Future<String?> uploadFile(http.ByteStream fileStream, int length, String filename, String schoolId, String userType) async {
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
      debugPrint("Upload Error: ${response.statusCode} - $responseBody");
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
      final uri = Uri.parse('$apiBase/storage/mark-permanent');
      
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'school_id': sid,
          'file_url': fileUrl,
        }),
      );
      
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Mark Permanent Exception: $e");
      return false;
    }
  }

  Future<bool> createComplain(Map<String, dynamic> payload) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/complains/$sid';
      
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      );
      
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Create Complain Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getComplains({String? userId, String? userRole}) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      String url = '$apiBase/complains/$sid';
      
      List<String> queryParams = [];
      if (userId != null) queryParams.add('user_id=$userId');
      if (userRole != null) queryParams.add('user_role=$userRole');
      
      if (queryParams.isNotEmpty) {
        url += '?' + queryParams.join('&');
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
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
}
