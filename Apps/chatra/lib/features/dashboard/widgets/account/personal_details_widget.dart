import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/core/network/api_service.dart';

class PersonalDetailsWidget extends StatelessWidget {
  const PersonalDetailsWidget({super.key});

  Future<Map<String, dynamic>?> _getStudentData(BuildContext context) async {
    final apiService = context.read<ApiService>();
    final studentDetailsJson = await apiService.storage.read(
      key: 'student_details',
    );
    if (studentDetailsJson != null) {
      try {
        return jsonDecode(studentDetailsJson) as Map<String, dynamic>;
      } catch (e) {
        debugPrint("Error parsing student details: $e");
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _getStudentData(context),
      builder: (context, snapshot) {
        final studentData = snapshot.data;

        final rollNumber = studentData?['rollNumber']?.toString() ?? 'Not assigned';
        final className = studentData?['className']?.toString() ?? 'Not assigned';
        final dob = studentData?['dob']?.toString() ?? 'Not available';
        final fatherName = studentData?['fatherName']?.toString() ?? 'Not available';
        final contact = studentData?['contact']?.toString() ?? 'Not available';
        final gender = studentData?['gender']?.toString() ?? 'Not specified';

        return GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildDetailRow("Roll Number", rollNumber),
              _buildDetailRow("Class", className),
              _buildDetailRow("Date of Birth", dob),
              _buildDetailRow("Gender", gender),
              _buildDetailRow("Father's Name", fatherName),
              _buildDetailRow("Contact", contact),
            ],
          ),
        ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1, end: 0);
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white38, fontSize: 14)),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
