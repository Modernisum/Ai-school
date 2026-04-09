import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/features/auth/bloc/auth_bloc.dart';
import 'package:chatra/features/auth/bloc/auth_event.dart';
import 'package:chatra/features/auth/bloc/auth_state.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/dashboard/widgets/account/profile_header_widget.dart';
import 'package:chatra/features/dashboard/widgets/account/personal_details_widget.dart';
import 'package:chatra/features/dashboard/widgets/account/settings_widget.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final ImagePicker _picker = ImagePicker();
  XFile? _pendingImage;
  bool _isSaving = false;

  Future<void> _pickImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() {
        _pendingImage = image;
      });
    }
  }

  Future<void> _saveProfile() async {
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;

    setState(() => _isSaving = true);
    final apiService = context.read<ApiService>();

    try {
      String? profileUrl;
      if (_pendingImage != null) {
        final file = File(_pendingImage!.path);
        final stream = http.ByteStream(file.openRead());
        final length = await file.length();

        final schoolId = await apiService.storage.read(key: 'school_id') ?? '';
        profileUrl = await apiService.uploadFile(
          stream,
          length,
          _pendingImage!.name,
          schoolId,
          'student',
        );

        if (profileUrl == null) {
          throw Exception("Failed to upload image");
        }
      }

      if (profileUrl != null) {
        final studentId =
            await apiService.storage.read(key: 'student_id') ?? '';
        final success = await apiService.updateStudentProfile(studentId, {
          'profileImageUrl': profileUrl,
        });

        if (success) {
          await apiService.markAsPermanent(profileUrl);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Profile updated successfully")),
          );
          setState(() {
            _pendingImage = null;
          });
        } else {
          throw Exception("Failed to update profile record");
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Error: ${e.toString()}")));
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primaryBrand,
              const Color(0xFF1E1440),
              AppColors.primaryBrand,
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              children: [
                const SizedBox(height: 10),
                if (_pendingImage != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: TextButton.icon(
                      onPressed: _isSaving ? null : _saveProfile,
                      icon: _isSaving
                          ? SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.accentTeal,
                              ),
                            )
                          : Icon(
                              Icons.check,
                              color: AppColors.accentTeal,
                            ),
                      label: Text(
                        _isSaving ? "Saving..." : "Save Changes",
                        style: TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold),
                      ),
                      style: TextButton.styleFrom(
                        backgroundColor: AppColors.accentTeal.withOpacity(0.1),
                      ),
                    ),
                  ).animate().fadeIn(),

                // --- Profile Header ---
                ProfileHeaderWidget(
                  onPickImage: _pickImage,
                  onSaveProfile: _saveProfile,
                  pendingImage: _pendingImage,
                  isSaving: _isSaving,
                ),
                const SizedBox(height: 40),

                // --- Settings Section ---
                const SettingsWidget(),
                const SizedBox(height: 30),

                // --- Personal Details (Read-only) ---
                Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 12),
                    child: Text(
                      "Personal Details",
                      style: GoogleFonts.outfit(
                        color: AppColors.accentTeal,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: 200.ms),
                const PersonalDetailsWidget(),
                const SizedBox(height: 40),

                // --- Logout Button ---
                ElevatedButton.icon(
                  onPressed: () => context.read<AuthBloc>().add(LoggedOut()),
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text(
                    "Logout",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent.withOpacity(0.1),
                    foregroundColor: Colors.redAccent,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(
                        color: Colors.redAccent.withOpacity(0.2),
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Hot reload trigger: Refactored with widget components and actionable settings
