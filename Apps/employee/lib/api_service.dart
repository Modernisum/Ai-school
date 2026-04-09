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

  Future<List<dynamic>?> getComplains(
      {String? userId, String? userRole}) async {
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

  // Responsibility Management Methods
  Future<List<dynamic>?> getResponsibilities(String schoolId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$sid'),
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
      debugPrint("Get Responsibilities Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getResponsibilityDetail(String schoolId, String responsibilityId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$sid/$responsibilityId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint("Get Responsibility Detail Error: $e");
      return null;
    }
  }

  Future<List<dynamic>?> getEmployeeResponsibilities(String schoolId, String employeeId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$sid/employees/$employeeId/responsibilities'),
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
      debugPrint("Get Employee Responsibilities Error: $e");
      return null;
    }
  }

  Future<List<dynamic>?> getSpaces(String schoolId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      
      final response = await http.get(
        Uri.parse('$apiBase/space/$schoolId'),
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
      debugPrint("Get Spaces Error: $e");
      return null;
    }
  }

  Future<bool> updateResponsibilitySpaces(String schoolId, String responsibilityId, List<String> spaceIds) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      
      final response = await http.put(
        Uri.parse('$apiBase/responsibility/$schoolId/responsibilities/$responsibilityId/bulk-update'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'space_ids': spaceIds,
        }),
      );
      
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Update Responsibility Spaces Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getTasksByResponsibility(String schoolId, String responsibilityId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      
      final response = await http.get(
        Uri.parse('$apiBase/responsibility/$schoolId/$responsibilityId/tasks'),
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
      debugPrint("Get Tasks By Responsibility Error: $e");
      return null;
    }
  }

  Future<bool> completeTask(String schoolId, String taskId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      
      final response = await http.put(
        Uri.parse('$apiBase/task/$schoolId/$taskId/complete'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Complete Task Error: $e");
      return false;
    }
  }

  // Enhanced Leave Management Methods
  Future<List<dynamic>?> getLeaveApplications() async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid';

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
      debugPrint("Get Leave Applications Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>?> getLeaveBalance(String employeeId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid/balance/$employeeId';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint("Get Leave Balance Error: $e");
      return null;
    }
  }

  Future<bool> applyForLeave(Map<String, dynamic> payload) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid';

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
      debugPrint("Apply For Leave Error: $e");
      return false;
    }
  }

  Future<bool> updateLeaveStatus(String leaveId, String action) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid/$leaveId/$action';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Update Leave Status Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getLeaveQueue(Map<String, dynamic> filters) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid/queue';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(filters),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] as List<dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint("Get Leave Queue Error: $e");
      return null;
    }
  }

  Future<bool> applyConditionalApproval(
      String leaveId, Map<String, dynamic> conditions) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid/$leaveId/conditional/approve';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(conditions),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Apply Conditional Approval Error: $e");
      return false;
    }
  }

  Future<List<dynamic>?> getNotifications(bool unreadOnly) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url =
          '$apiBase/leave/$sid/notifications?unread_only=${unreadOnly ? 'true' : 'false'}';

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
      debugPrint("Get Notifications Error: $e");
      return null;
    }
  }

  Future<bool> markNotificationRead(String notificationId) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final sid = await storage.read(key: 'school_id');
      final url = '$apiBase/leave/$sid/notifications/$notificationId/read';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint("Mark Notification Read Error: $e");
      return false;
    }
  }
}
