import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';

class SettingsWidget extends StatefulWidget {
  const SettingsWidget({super.key});

  @override
  State<SettingsWidget> createState() => _SettingsWidgetState();
}

class _SettingsWidgetState extends State<SettingsWidget> {
  bool _darkMode = true;
  String _language = 'English';

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

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
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
                style: GoogleFonts.outfit(
                  color: Colors.white70,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            trailing ??
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  color: Colors.white24,
                  size: 14,
                ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildThemeToggle() {
    return GestureDetector(
      onTap: () {
        setState(() {
          _darkMode = !_darkMode;
          // TODO: Implement theme change logic
          // This would typically update the app theme
        });
      },
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildToggleOption(Icons.light_mode_rounded, !_darkMode),
            _buildToggleOption(Icons.dark_mode_rounded, _darkMode),
          ],
        ),
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
      child: Icon(
        icon,
        color: isActive ? Colors.black : Colors.white38,
        size: 16,
      ),
    );
  }

  void _showProfileSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.primaryBrand,
        title: Text(
          "Profile Settings",
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        content: Text(
          "Profile settings functionality will be implemented here.",
          style: GoogleFonts.outfit(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              "OK",
              style: TextStyle(color: AppColors.accentTeal),
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguagePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.primaryBrand,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "Select Language",
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            ...['English', 'Hindi', 'Gujarati', 'Marathi'].map((lang) {
              return ListTile(
                title: Text(
                  lang,
                  style: GoogleFonts.outfit(color: Colors.white70),
                ),
                trailing: _language == lang
                    ? const Icon(Icons.check, color: AppColors.accentTeal)
                    : null,
                onTap: () {
                  setState(() => _language = lang);
                  Navigator.pop(context);
                  // TODO: Implement language change logic
                },
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle("Settings"),
        _buildSettingItem(
          icon: Icons.person_outline_rounded,
          title: "Profile Setting",
          onTap: _showProfileSettings,
        ),
        _buildSettingItem(
          icon: Icons.dark_mode_outlined,
          title: "Theme",
          onTap: () {
            setState(() => _darkMode = !_darkMode);
          },
          trailing: _buildThemeToggle(),
        ),
        _buildSettingItem(
          icon: Icons.language_rounded,
          title: "Language",
          onTap: _showLanguagePicker,
          trailing: Text(
            _language,
            style: const TextStyle(color: Colors.white70),
          ),
        ),
      ],
    );
  }
}
