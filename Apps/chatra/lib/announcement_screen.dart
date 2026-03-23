import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme/app_theme.dart';

class AnnouncementScreen extends StatelessWidget {
  const AnnouncementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      body: Center(
        child: Text(
          "Announcement Screen\nComing Soon",
          textAlign: TextAlign.center,
          style: GoogleFonts.outfit(color: Colors.white, fontSize: 20),
        ),
      ),
    );
  }
}
