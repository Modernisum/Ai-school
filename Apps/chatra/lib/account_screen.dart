import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'theme/app_theme.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'logic/auth/auth_state.dart';
import 'widgets/glass_card.dart';
import 'api_service.dart';

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
        final studentId = await apiService.storage.read(key: 'student_id') ?? '';
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: ${e.toString()}")),
      );
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
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primaryBrand,
              Color(0xFF1E1440),
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
                       icon: _isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentTeal)) : const Icon(Icons.check, color: AppColors.accentTeal),
                       label: Text(_isSaving ? "Saving..." : "Save Changes", style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold)),
                       style: TextButton.styleFrom(backgroundColor: AppColors.accentTeal.withOpacity(0.1)),
                     ),
                   ).animate().fadeIn(),
                
                // --- Profile Header ---
                _buildProfileHeader(),
                const SizedBox(height: 40),

                // --- Settings Section ---
                _buildSectionTitle("Settings"),
                _buildSettingItem(Icons.person_outline_rounded, "Profile Setting", () {}),
                _buildSettingItem(Icons.dark_mode_outlined, "Theme", () {}, trailing: _buildThemeToggle()),
                _buildSettingItem(Icons.language_rounded, "Language", () {}, trailing: const Text("English", style: TextStyle(color: Colors.white70))),
                const SizedBox(height: 30),

                // --- Personal Details (Read-only) ---
                _buildSectionTitle("Personal Details"),
                _buildDetailCard([
                  _buildDetailRow("Roll Number", "2024-STU-089"),
                  _buildDetailRow("Class", "12th - Science (B1)"),
                  _buildDetailRow("Date of Birth", "15 May 2008"),
                  _buildDetailRow("Blood Group", "B+"),
                  _buildDetailRow("Father's Name", "Rajesh Kumar"),
                  _buildDetailRow("Emergency Contact", "+91 98765 43210"),
                ]),
                const SizedBox(height: 40),

                // --- Logout Button ---
                ElevatedButton.icon(
                  onPressed: () => context.read<AuthBloc>().add(LoggedOut()),
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text("Logout", style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent.withOpacity(0.1),
                    foregroundColor: Colors.redAccent,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: Colors.redAccent.withOpacity(0.2)),
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

  Widget _buildProfileHeader() {
    return Column(
      children: [
        GestureDetector(
          onTap: _pickImage,
          child: Stack(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.accentTeal.withOpacity(0.5), width: 2),
                ),
                child: CircleAvatar(
                  radius: 60,
                  backgroundColor: AppColors.glassWhite,
                  backgroundImage: _pendingImage != null 
                    ? FileImage(File(_pendingImage!.path)) as ImageProvider
                    : const NetworkImage('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
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
          "Aman Kumar",
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ).animate().fadeIn(delay: 100.ms),
        Text(
          "Student ID: STU9852",
          style: GoogleFonts.outfit(
            color: Colors.white54,
            fontSize: 14,
          ),
        ).animate().fadeIn(delay: 150.ms),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 12),
        child: Text(
          title,
          style: GoogleFonts.outfit(
            color: AppColors.accentTeal,
            fontSize: 13,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildSettingItem(IconData icon, String title, VoidCallback onTap, {Widget? trailing}) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.outfit(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.w500),
              ),
            ),
            trailing ?? const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white24, size: 14),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildThemeToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildToggleOption(Icons.light_mode_rounded, false),
          _buildToggleOption(Icons.dark_mode_rounded, true),
        ],
      ),
    );
  }

  Widget _buildToggleOption(IconData icon, bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? AppColors.accentTeal : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: isActive ? Colors.black : Colors.white38, size: 16),
    );
  }

  Widget _buildDetailCard(List<Widget> children) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(children: children),
    ).animate().fadeIn(delay: 400.ms);
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.outfit(color: Colors.white38, fontSize: 14)),
          Text(value, style: GoogleFonts.outfit(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
