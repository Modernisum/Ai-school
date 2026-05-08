import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/features/dashboard/widgets/account/settings_tile.dart';

class SettingsWidget extends StatefulWidget {
  const SettingsWidget({super.key});

  @override
  State<SettingsWidget> createState() => _SettingsWidgetState();
}

class _SettingsWidgetState extends State<SettingsWidget> {
  bool _darkMode = true;
  String _language = 'English';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle("Settings"),
        SettingsTile(
          index: 0,
          icon: Icons.person_outline_rounded,
          title: "Profile Setting",
          onTap: _showProfileSettings,
        ),
        SettingsTile(
          index: 1,
          icon: Icons.airplane_ticket_rounded,
          title: "Leave Management",
          onTap: () => context.push('/leave'),
        ),
        SettingsTile(
          index: 2,
          icon: Icons.dark_mode_outlined,
          title: "Theme",
          onTap: () => setState(() => _darkMode = !_darkMode),
          trailing: _buildThemeToggle(),
        ),
        SettingsTile(
          index: 3,
          icon: Icons.language_rounded,
          title: "Language",
          onTap: _showLanguagePicker,
          trailing: Text(_language, style: const TextStyle(color: Colors.white70)),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.accentTeal,
          fontSize: 13,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    ).animate().fadeIn(delay: 200.ms);
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
          _buildToggleOption(Icons.light_mode_rounded, !_darkMode),
          _buildToggleOption(Icons.dark_mode_rounded, _darkMode),
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

  void _showProfileSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.primaryBrand,
        title: Text("Profile Settings", style: const TextStyle(color: Colors.white)),
        content: const Text("Profile settings functionality will be implemented here.", style: TextStyle(color: Colors.white70)),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text("OK", style: TextStyle(color: AppColors.accentTeal)))],
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
            Text("Select Language", style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            ...['English', 'Hindi', 'Gujarati', 'Marathi'].map((lang) {
              return ListTile(
                title: Text(lang, style: const TextStyle(color: Colors.white70)),
                trailing: _language == lang ? Icon(Icons.check, color: AppColors.accentTeal) : null,
                onTap: () {
                  setState(() => _language = lang);
                  Navigator.pop(context);
                },
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}
