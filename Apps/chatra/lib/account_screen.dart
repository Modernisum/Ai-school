import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'theme/app_theme.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'widgets/glass_card.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

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
                const SizedBox(height: 20),
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
                    backgroundColor: Colors.redAccent.withValues(alpha: 0.1),
                    foregroundColor: Colors.redAccent,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.2)),
                    ),
                  ),
                ).animate().fadeIn(delay: 600.ms),
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
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.5), width: 2),
          ),
          child: const CircleAvatar(
            radius: 60,
            backgroundColor: AppColors.glassWhite,
            backgroundImage: NetworkImage('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'),
          ),
        ).animate().scale(duration: 600.ms, curve: Curves.easeOutQuart),
        const SizedBox(height: 16),
        Text(
          "Aman Kumar",
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2, end: 0),
        Text(
          "Student ID: STU9852",
          style: GoogleFonts.outfit(
            color: Colors.white54,
            fontSize: 14,
          ),
        ).animate().fadeIn(delay: 300.ms),
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
    ).animate().fadeIn(delay: 400.ms);
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
                color: Colors.white.withValues(alpha: 0.05),
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
    ).animate().fadeIn(delay: 500.ms).slideX(begin: 0.1, end: 0);
  }

  Widget _buildThemeToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
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
    ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.1, end: 0);
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
