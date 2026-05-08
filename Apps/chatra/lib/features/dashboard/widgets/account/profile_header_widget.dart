import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';

import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/core/network/api_service.dart';

class ProfileHeaderWidget extends StatefulWidget {
  final VoidCallback onPickImage;
  final VoidCallback onSaveProfile;
  final XFile? pendingImage;
  final bool isSaving;

  const ProfileHeaderWidget({
    super.key,
    required this.onPickImage,
    required this.onSaveProfile,
    required this.pendingImage,
    required this.isSaving,
  });

  @override
  State<ProfileHeaderWidget> createState() => _ProfileHeaderWidgetState();
}

class _ProfileHeaderWidgetState extends State<ProfileHeaderWidget> {
  Future<Map<String, dynamic>?> _getStudentData() async {
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
      future: _getStudentData(),
      builder: (context, snapshot) {
        final studentData = snapshot.data;
        final studentName = studentData?['name'] as String? ?? 'Student';
        final studentId = studentData?['studentId'] as String? ?? 'Unknown ID';
        final profileImageUrl = studentData?['profileImageUrl'] as String?;

        ImageProvider? backgroundImage;
        if (widget.pendingImage != null) {
          backgroundImage = FileImage(File(widget.pendingImage!.path));
        } else if (profileImageUrl != null && profileImageUrl.isNotEmpty) {
          backgroundImage = NetworkImage(profileImageUrl);
        } else {
          final seed = studentName.replaceAll(' ', '');
          backgroundImage = NetworkImage(
            'https://api.dicebear.com/7.x/avataaars/png?seed=$seed',
          );
        }

        return Column(
          children: [
            GestureDetector(
              onTap: widget.onPickImage,
              child: Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.accentTeal.withOpacity(0.5),
                        width: 2,
                      ),
                    ),
                    child: CircleAvatar(
                      radius: 60,
                      backgroundColor: AppColors.glassWhite,
                      backgroundImage: backgroundImage,
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.accentTeal,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.camera_alt, color: Colors.black, size: 20),
                    ),
                  ),
                ],
              ),
            ).animate().scale(duration: 400.ms),
            const SizedBox(height: 16),
            Text(
              studentName,
              style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
            ).animate().fadeIn(delay: 100.ms),
            Text(
              "Student ID: $studentId",
              style: const TextStyle(color: Colors.white54, fontSize: 14),
            ).animate().fadeIn(delay: 150.ms),
          ],
        );
      },
    );
  }
}
