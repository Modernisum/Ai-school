import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Use 10.0.2.2 for Android emulator to connect to host machine
  static const String serverUrl = 'http://10.0.2.2:8080';
  static const String apiBase = '$serverUrl/api';
  static String get wsUrl => serverUrl.replaceFirst('http', 'ws') + '/ws';

  Future<String> getSocketUrl() async {
    final sid = await storage.read(key: 'school_id') ?? 'default_school';
    return '$wsUrl/$sid';
  }

  final storage = const FlutterSecureStorage();

  // Fetches profiles from the backend after Firebase OTP validation
  Future<List<dynamic>?> getProfiles(String ident) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBase/auth/student/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ident': ident}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          // Store authentication data if available
          if (data['accessToken'] != null) {
            await storage.write(
              key: 'jwt_token',
              value: data['accessToken'].toString(),
            );
          }
          if (data['expiresIn'] != null) {
            await storage.write(
              key: 'token_expires',
              value: data['expiresIn'].toString(),
            );
          }
          if (data['profiles'] != null) {
            return data['profiles'] as List<dynamic>;
          }
        }
      }
      return null;
    } catch (e) {
      debugPrint("Get Profiles Error: $e");
      return null;
    }
  }

  // Finalizes profile selection and issues token
  Future<bool> selectProfile(
    String schoolId,
    String ident,
    String userId,
    String userType,
  ) async {
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

  // Fetches detailed student information using schoolId and studentId
  Future<Map<String, dynamic>?> fetchStudentDetails(
    String schoolId,
    String studentId,
  ) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      if (token == null || token.isEmpty) {
        debugPrint("No JWT token found for fetching student details");
        return null;
      }

      final url = '$apiBase/students/$schoolId/$studentId';
      debugPrint("Fetching student details from: $url");

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      debugPrint("Student details response code: ${response.statusCode}");

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          // Store student details in secure storage
          await storage.write(
            key: 'student_details',
            value: jsonEncode(data['data']),
          );
          await storage.write(key: 'school_id', value: schoolId);
          await storage.write(key: 'student_id', value: studentId);
          await storage.write(key: 'user_role', value: 'student');

          debugPrint("Student details fetched and stored successfully");
          return data['data'] as Map<String, dynamic>;
        } else {
          debugPrint("API returned success=false: ${data['message']}");
        }
      } else {
        debugPrint(
          "Failed to fetch student details: ${response.statusCode} - ${response.body}",
        );
      }
      return null;
    } catch (e) {
      debugPrint("Fetch Student Details Error: $e");
      return null;
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

  Future<Map<String, dynamic>?> createRazorpayOrder(
    Map<String, dynamic> payload,
  ) async {
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
      debugPrint(
        "Fetching Profile: $url with token: ${token?.substring(0, 10)}...",
      );
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

  Future<bool> updateStudentProfile(
    String studentId,
    Map<String, dynamic> payload,
  ) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/students/$sid/$studentId';

      final response = await http.put(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Update Profile Error: $e");
      return false;
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      debugPrint("Announcements Error: $e");
      return null;
    }
  }

  // Support for deferred image uploads
  Future<String?> uploadFile(
    http.ByteStream fileStream,
    int length,
    String filename,
    String schoolId,
    String userType,
  ) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final uri = Uri.parse('$apiBase/storage/upload');

      final request = http.MultipartRequest('POST', uri)
        ..headers['Authorization'] = 'Bearer $token'
        ..fields['school_id'] = schoolId
        ..fields['user_type'] = userType
        ..files.add(
          http.MultipartFile('file', fileStream, length, filename: filename),
        );

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
        body: jsonEncode({'school_id': sid, 'file_url': fileUrl}),
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

  Future<List<dynamic>?> getComplains({
    String? userId,
    String? userRole,
  }) async {
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
